import { Email, EmailSection, EmailsResponse } from "@/types/email";
import { refreshGmailAccessToken } from "./refreshToken";

// Constants
const BATCH_SIZE = 20; // Increased from 10
const MAX_EMAIL_FETCH = 500; // Maximum emails to fetch for metrics
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
const STALE_THRESHOLD = 10 * 60 * 1000; // 10 minutes

// Storage keys for caching
const STORAGE_KEYS = {
  EMAIL_CACHE: (section: EmailSection) => `lumi_email_cache_${section}`,
  EMAIL_METADATA: (section: EmailSection) => `lumi_email_metadata_${section}`,
  EMAIL_FETCH_IN_PROGRESS: "lumi_email_fetch_in_progress",
};

// Email cache metadata interface
interface EmailCacheMetadata {
  timestamp: number;
  nextPageToken: string | null;
  totalEmails: number;
  resultSizeEstimate: number;
  isComplete: boolean;
}

// Background refresh queue to prevent too many simultaneous refreshes
const refreshQueue: string[] = [];
let isRefreshing = false;

// Build Gmail API query based on section
function buildQueryForSection(section: EmailSection): string {
  switch (section) {
    case "inbox":
      return "in:inbox -is:sent";
    case "sent":
      return "is:sent";
    case "done":
      return "label:done";
    case "archive":
      return "is:archived";
    case "trash":
      return "in:trash";
    case "tracked":
      return "label:tracked";
    case "metrics":
      // For metrics, we need to capture as many emails as possible
      return ""; // Empty query to get all emails
    case "all":
      return ""; // Empty query to get all emails
    case "compose":
      return "";
    default:
      return "in:inbox";
  }
}

// Get the cache freshness status
function getCacheFreshness(timestamp: number): "fresh" | "stale" | "expired" {
  const age = Date.now() - timestamp;
  if (age > STALE_THRESHOLD) return "expired";
  if (age > CACHE_EXPIRY) return "stale";
  return "fresh";
}

// Main email fetching function
export async function fetchEmails(
  section: EmailSection,
  pageToken?: string | null
): Promise<EmailsResponse> {
  console.log(
    `[Gmail] Fetching emails for section: ${section}, pageToken: ${pageToken}`
  );

  try {
    // For metrics section, always attempt to load all available emails
    if (section === "metrics") {
      return await fetchAllEmailsForMetrics();
    }

    // If requesting a specific page, bypass cache
    if (pageToken) {
      return await fetchEmailsFromAPI(section, pageToken);
    }

    // Check cache first
    const cachedEmails = getCachedEmails(section);
    const metadata = getCacheMetadata(section);

    // If we have cached emails and metadata
    if (cachedEmails && cachedEmails.length > 0 && metadata) {
      const freshness = getCacheFreshness(metadata.timestamp);
      console.log(
        `[Gmail] Cache for ${section} is ${freshness} with ${cachedEmails.length} emails`
      );

      // If cache is still valid, use it
      if (freshness !== "expired") {
        // If stale, trigger a background refresh but still use cache
        if (freshness === "stale") {
          refreshInBackground(section);
        }

        return {
          emails: cachedEmails,
          nextPageToken: metadata.nextPageToken,
          resultSizeEstimate: metadata.resultSizeEstimate,
        };
      }
    }

    // No valid cache or cache expired, fetch fresh emails
    return await fetchEmailsFromAPI(section);
  } catch (error) {
    console.error("[Gmail] Error fetching emails:", error);

    // Return cached emails as fallback if available
    const cachedEmails = getCachedEmails(section);
    const metadata = getCacheMetadata(section);

    if (cachedEmails && cachedEmails.length > 0) {
      console.log("[Gmail] Returning cached emails as fallback due to error");
      return {
        emails: cachedEmails,
        nextPageToken: metadata?.nextPageToken || null,
        resultSizeEstimate: metadata?.resultSizeEstimate || cachedEmails.length,
      };
    }

    throw error;
  }
}

// Function to fetch emails specifically for metrics (loads all possible emails)
async function fetchAllEmailsForMetrics(): Promise<EmailsResponse> {
  console.log("[Gmail] Fetching all emails for metrics view");

  // Check if we already have a complete metrics cache that's not expired
  const cachedEmails = getCachedEmails("metrics");
  const metadata = getCacheMetadata("metrics");

  if (
    cachedEmails &&
    cachedEmails.length > 0 &&
    metadata &&
    metadata.isComplete &&
    getCacheFreshness(metadata.timestamp) !== "expired"
  ) {
    console.log(
      `[Gmail] Using complete metrics cache with ${cachedEmails.length} emails`
    );

    // If cache is stale but complete, refresh in background
    if (getCacheFreshness(metadata.timestamp) === "stale") {
      refreshInBackground("metrics");
    }

    return {
      emails: cachedEmails,
      nextPageToken: null, // No more pages since we have all emails
      resultSizeEstimate: metadata.resultSizeEstimate,
    };
  }

  // No valid complete cache, fetch all emails
  try {
    // Mark fetch in progress to prevent duplicate fetches
    localStorage.setItem(STORAGE_KEYS.EMAIL_FETCH_IN_PROGRESS, "true");

    let allEmails: Email[] = [];
    let nextPageToken: string | null = null;
    let resultSizeEstimate = 0;
    let isComplete = false;
    let totalFetched = 0;

    // Use a loop to fetch all pages
    do {
      console.log(
        `[Gmail] Fetching metrics emails, page token: ${nextPageToken}, count so far: ${allEmails.length}`
      );

      const result = await fetchEmailsFromAPI("metrics", nextPageToken);

      if (result.emails && result.emails.length > 0) {
        // Add fetched emails to our collection
        allEmails = [...allEmails, ...result.emails];
        totalFetched += result.emails.length;
      }

      // Update metadata
      resultSizeEstimate = result.resultSizeEstimate || 0;
      nextPageToken = result.nextPageToken;

      // Stop conditions:
      // 1. No more pages (nextPageToken is null)
      // 2. Reached maximum emails limit
      // 3. API returned no emails
      if (
        !nextPageToken ||
        totalFetched >= MAX_EMAIL_FETCH ||
        result.emails.length === 0
      ) {
        isComplete = !nextPageToken || totalFetched >= resultSizeEstimate;
        break;
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 300));
    } while (totalFetched < MAX_EMAIL_FETCH);

    // Save results to cache
    if (allEmails.length > 0) {
      setCachedEmails("metrics", allEmails);
      setCacheMetadata("metrics", {
        timestamp: Date.now(),
        nextPageToken: nextPageToken,
        totalEmails: allEmails.length,
        resultSizeEstimate: resultSizeEstimate,
        isComplete: isComplete,
      });
    }

    console.log(
      `[Gmail] Completed metrics fetch with ${allEmails.length} emails, isComplete: ${isComplete}`
    );

    return {
      emails: allEmails,
      nextPageToken: nextPageToken,
      resultSizeEstimate: resultSizeEstimate,
    };
  } catch (error) {
    console.error("[Gmail] Error fetching all emails for metrics:", error);
    throw error;
  } finally {
    // Clear in-progress flag
    localStorage.removeItem(STORAGE_KEYS.EMAIL_FETCH_IN_PROGRESS);
  }
}

// Function to trigger a background refresh
function refreshInBackground(section: EmailSection): void {
  // Check if a fetch is already in progress
  if (localStorage.getItem(STORAGE_KEYS.EMAIL_FETCH_IN_PROGRESS) === "true") {
    console.log(
      "[Gmail] Background refresh skipped - fetch already in progress"
    );
    return;
  }

  // Use setTimeout to run this asynchronously
  setTimeout(async () => {
    try {
      console.log(`[Gmail] Starting background refresh for ${section}`);
      localStorage.setItem(STORAGE_KEYS.EMAIL_FETCH_IN_PROGRESS, "true");

      // Fetch fresh emails
      await fetchEmailsFromAPI(section);

      console.log(`[Gmail] Background refresh completed for ${section}`);
    } catch (error) {
      console.error(`[Gmail] Background refresh failed for ${section}:`, error);
    } finally {
      localStorage.removeItem(STORAGE_KEYS.EMAIL_FETCH_IN_PROGRESS);
    }
  }, 100);
}

// Core API fetch function
async function fetchEmailsFromAPI(
  section: EmailSection,
  pageToken?: string | null
): Promise<EmailsResponse> {
  const accessToken = localStorage.getItem("gmail_access_token");
  if (!accessToken) throw new Error("No access token available");

  try {
    // Prepare the query
    const query = buildQueryForSection(section);

    // Determine maxResults based on section
    const maxResults = section === "metrics" ? 50 : 20; // Higher for metrics

    // Build the API URL
    let apiUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`;

    if (query) {
      apiUrl += `&q=${encodeURIComponent(query)}`;
    }

    if (pageToken) {
      apiUrl += `&pageToken=${pageToken}`;
    }

    // Fetch the message list
    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // Handle token expiration
    if (response.status === 401) {
      console.log("[Gmail] Token expired, refreshing...");
      await refreshGmailAccessToken();
      return fetchEmailsFromAPI(section, pageToken);
    }

    // Handle other errors
    if (!response.ok) {
      throw new Error(`Failed to fetch emails: ${response.statusText}`);
    }

    // Parse the response
    const data = await response.json();
    const messages = data.messages || [];
    const nextPageToken = data.nextPageToken || null;
    const resultSizeEstimate = data.resultSizeEstimate || 0;

    console.log(
      `[Gmail] Fetched ${messages.length} message IDs, total estimate: ${resultSizeEstimate}`
    );

    if (messages.length === 0) {
      // No messages found, return an empty result
      const existingEmails = getCachedEmails(section) || [];

      // If this is a first page request, we should update the cache timestamp
      if (!pageToken && existingEmails.length > 0) {
        setCacheMetadata(section, {
          timestamp: Date.now(),
          nextPageToken: null,
          totalEmails: existingEmails.length,
          resultSizeEstimate: resultSizeEstimate,
          isComplete: true,
        });
      }

      return {
        emails: existingEmails,
        nextPageToken: null,
        resultSizeEstimate: resultSizeEstimate,
      };
    }

    // Process message IDs in batches to get full details
    const emailDetails: Email[] = [];

    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batchIds = messages.slice(i, i + BATCH_SIZE).map((msg) => msg.id);

      // Fetch all message details in this batch concurrently
      const batchPromises = batchIds.map((id) =>
        fetchEmailDetails(id, accessToken)
      );
      const batchResults = await Promise.all(batchPromises);

      // Filter out any null results and add to our collection
      const validEmails = batchResults.filter(
        (email) => email !== null
      ) as Email[];
      emailDetails.push(...validEmails);

      // Small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < messages.length) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    console.log(
      `[Gmail] Successfully fetched ${emailDetails.length} email details`
    );

    // If this is a first page (not pagination), update the cache
    if (!pageToken) {
      // Sort emails by date (newest first)
      emailDetails.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      // Save to cache
      setCachedEmails(section, emailDetails);
      setCacheMetadata(section, {
        timestamp: Date.now(),
        nextPageToken: nextPageToken,
        totalEmails: emailDetails.length,
        resultSizeEstimate: resultSizeEstimate,
        isComplete: !nextPageToken,
      });

      return {
        emails: emailDetails,
        nextPageToken: nextPageToken,
        resultSizeEstimate: resultSizeEstimate,
      };
    } else {
      // This is a pagination request, just return the results without caching
      return {
        emails: emailDetails,
        nextPageToken: nextPageToken,
        resultSizeEstimate: resultSizeEstimate,
      };
    }
  } catch (error) {
    console.error("[Gmail] Error in fetchEmailsFromAPI:", error);
    throw error;
  }
}

// Fetch a single email's details
async function fetchEmailDetails(
  messageId: string,
  accessToken: string
): Promise<Email | null> {
  try {
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    // Handle token expiration
    if (response.status === 401) {
      await refreshGmailAccessToken();
      return fetchEmailDetails(
        messageId,
        localStorage.getItem("gmail_access_token") || ""
      );
    }

    // Handle other errors
    if (!response.ok) {
      console.error(
        `[Gmail] Error fetching message ${messageId}: ${response.status}`
      );
      return null;
    }

    const messageData = await response.json();
    return processMessageData(messageData);
  } catch (error) {
    console.error(`[Gmail] Error processing message ${messageId}:`, error);
    return null;
  }
}

// Process the raw message data into our Email format
function processMessageData(messageData: any): Email {
  const headers: { [key: string]: string } = {};

  // Extract headers
  messageData.payload.headers.forEach(
    (header: { name: string; value: string }) => {
      headers[header.name.toLowerCase()] = header.value;
    }
  );

  // Extract message body
  const bodyData = extractBody(messageData.payload);

  // Extract sender info
  const { fromName, fromEmail } = extractSenderInfo(headers.from || "");

  // Extract label info for all our custom flags
  const labelIds = messageData.labelIds || [];
  const isDone = labelIds.includes("DONE") || labelIds.includes("Label_1");
  const isTracked =
    labelIds.includes("TRACKED") || labelIds.includes("Label_2");

  return {
    id: messageData.id,
    subject: headers.subject || "(No subject)",
    from: headers.from || "",
    fromName,
    fromEmail,
    to: headers.to || "",
    date: headers.date || new Date().toISOString(),
    bodyText: bodyData.bodyText || "",
    bodyHtml: bodyData.bodyHtml || "",
    isRead: !labelIds.includes("UNREAD"),
    isStarred: labelIds.includes("STARRED"),
    snippet: messageData.snippet || "",
    isArchived: !labelIds.includes("INBOX") && !labelIds.includes("TRASH"),
    isTrashed: labelIds.includes("TRASH"),
    isSnoozed: labelIds.includes("SNOOZED"),
    hasAttachments: labelIds.includes("HAS_ATTACHMENT"),
    isSent: labelIds.includes("SENT"),
    isDone,
    isTracked,
    labelIds,
  };
}

// Extract sender name and email from the From header
function extractSenderInfo(from: string): {
  fromName: string;
  fromEmail: string;
} {
  // Default values
  let fromName = "Unknown";
  let fromEmail = "";

  if (!from) {
    return { fromName, fromEmail };
  }

  // Try to match format: "Name <email@example.com>"
  const match = from.match(/^"?([^"<]+)"?\s*<?([^>]*)>?$/);

  if (match) {
    fromName = match[1].trim();
    fromEmail = match[2].trim();
  } else if (from.includes("@")) {
    // Fallback if format is just an email
    fromName = from.split("@")[0];
    fromEmail = from;
  } else {
    fromName = from;
    fromEmail = "";
  }

  return { fromName, fromEmail };
}

// Extract email body text and HTML
function extractBody(part: any): { bodyText: string; bodyHtml: string } {
  let bodyText = "";
  let bodyHtml = "";

  // Check if this part has a body
  if (part.body && part.body.data) {
    const decodedData = Buffer.from(part.body.data, "base64").toString();

    if (part.mimeType === "text/plain") {
      bodyText = decodedData;
    } else if (part.mimeType === "text/html") {
      bodyHtml = decodedData;
    }
  }

  // Recursively check all parts
  if (part.parts) {
    part.parts.forEach((subPart: any) => {
      const subResult = extractBody(subPart);
      if (subResult.bodyText && !bodyText) bodyText = subResult.bodyText;
      if (subResult.bodyHtml && !bodyHtml) bodyHtml = subResult.bodyHtml;
    });
  }

  return { bodyText, bodyHtml };
}

// Cache management functions
function getCachedEmails(section: EmailSection): Email[] | null {
  try {
    const cacheKey = STORAGE_KEYS.EMAIL_CACHE(section);
    const cache = localStorage.getItem(cacheKey);
    if (!cache) return null;

    return JSON.parse(cache);
  } catch (error) {
    console.error(
      `[Gmail] Error retrieving cached emails for ${section}:`,
      error
    );
    return null;
  }
}

function setCachedEmails(section: EmailSection, emails: Email[]): void {
  try {
    const cacheKey = STORAGE_KEYS.EMAIL_CACHE(section);
    localStorage.setItem(cacheKey, JSON.stringify(emails));
  } catch (error) {
    console.error(
      `[Gmail] Error saving emails to cache for ${section}:`,
      error
    );
  }
}

function getCacheMetadata(section: EmailSection): EmailCacheMetadata | null {
  try {
    const metadataKey = STORAGE_KEYS.EMAIL_METADATA(section);
    const metadata = localStorage.getItem(metadataKey);
    if (!metadata) return null;

    return JSON.parse(metadata);
  } catch (error) {
    console.error(
      `[Gmail] Error retrieving cache metadata for ${section}:`,
      error
    );
    return null;
  }
}

function setCacheMetadata(
  section: EmailSection,
  metadata: EmailCacheMetadata
): void {
  try {
    const metadataKey = STORAGE_KEYS.EMAIL_METADATA(section);
    localStorage.setItem(metadataKey, JSON.stringify(metadata));
  } catch (error) {
    console.error(`[Gmail] Error saving cache metadata for ${section}:`, error);
  }
}

export function clearAllCache(): void {
  try {
    const sections: EmailSection[] = [
      "inbox",
      "sent",
      "done",
      "archive",
      "trash",
      "tracked",
      "metrics",
      "compose",
    ];

    sections.forEach((section) => {
      localStorage.removeItem(STORAGE_KEYS.EMAIL_CACHE(section));
      localStorage.removeItem(STORAGE_KEYS.EMAIL_METADATA(section));
    });

    localStorage.removeItem(STORAGE_KEYS.EMAIL_FETCH_IN_PROGRESS);
    console.log("[Gmail] All email caches cleared");
  } catch (error) {
    console.error("[Gmail] Error clearing cache:", error);
  }
}
