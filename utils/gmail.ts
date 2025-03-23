import { Email } from "@/types/email";
import {
  getCachedEmails,
  cacheSectionEmails,
  shouldRefreshCache,
  updateCacheMetadata,
  clearAllCache,
} from "./cache";

export async function fetchEmails(section: string): Promise<Email[]> {
  try {
    // Check cache first
    const cachedEmails = getCachedEmails(section);
    if (cachedEmails) {
      console.log("[Gmail] Using cached emails for section:", section);

      // If cache is getting old, refresh in background
      if (shouldRefreshCache(section)) {
        console.log("[Gmail] Cache needs refresh, starting background refresh");
        refreshCacheInBackground(section);
      }

      return cachedEmails;
    }

    // No valid cache, fetch fresh emails
    const accessToken = localStorage.getItem("gmail_access_token");
    const refreshToken = localStorage.getItem("gmail_refresh_token");
    const tokenExpiry = localStorage.getItem("token_expiry");

    if (!accessToken || !refreshToken || !tokenExpiry) {
      throw new Error("Missing authentication tokens");
    }

    // Check if access token needs refresh
    const expiryTime = new Date(tokenExpiry).getTime();
    if (expiryTime <= Date.now()) {
      console.log("[Gmail] Access token expired, refreshing...");
      await refreshAccessToken();
    }

    const emails = await fetchEmailsWithToken(section);

    // Cache the results
    cacheSectionEmails(section, emails);
    updateCacheMetadata();

    return emails;
  } catch (error) {
    console.error("[Gmail] Error fetching emails:", error);
    throw error;
  }
}

async function refreshCacheInBackground(section: string): Promise<void> {
  try {
    console.log(
      "[Gmail] Starting background cache refresh for section:",
      section
    );
    const emails = await fetchEmailsWithToken(section);
    cacheSectionEmails(section, emails);
    updateCacheMetadata();
    console.log("[Gmail] Background cache refresh completed");
  } catch (error) {
    console.error("[Gmail] Error in background cache refresh:", error);
  }
}

async function fetchEmailsWithToken(section: string): Promise<Email[]> {
  const accessToken = localStorage.getItem("gmail_access_token");
  if (!accessToken) throw new Error("No access token available");

  try {
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (response.status === 401) {
      console.log("[Gmail] Access token expired, refreshing...");
      await refreshAccessToken();
      return fetchEmailsWithToken(section);
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch emails: ${response.statusText}`);
    }

    const data = await response.json();
    const messages = data.messages || [];
    const emails: Email[] = [];

    for (const message of messages) {
      const email = await fetchEmailDetails(message.id, accessToken);
      if (email) {
        emails.push(email);
      }
    }

    return emails;
  } catch (error) {
    console.error("[Gmail] Error in fetchEmailsWithToken:", error);
    throw error;
  }
}

async function refreshAccessToken() {
  try {
    console.log("[refreshAccessToken] Attempting to refresh token...");
    console.log(
      "[refreshAccessToken] Refresh token length:",
      localStorage.getItem("gmail_refresh_token").length
    );

    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refreshToken: localStorage.getItem("gmail_refresh_token"),
      }),
    });

    console.log("[refreshAccessToken] Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "[refreshAccessToken] Token refresh failed:",
        response.status,
        errorText
      );
      return;
    }

    const data = await response.json();
    console.log("[refreshAccessToken] Token refresh successful");
    console.log(
      "[refreshAccessToken] New token expires in:",
      data.expires_in,
      "seconds"
    );

    localStorage.setItem("gmail_access_token", data.access_token);
    localStorage.setItem(
      "token_expiry",
      new Date(Date.now() + data.expires_in * 1000).toISOString()
    );
  } catch (error) {
    console.error("[refreshAccessToken] Error:", error);
  }
}

// Function for cookie-based API calls
async function fetchEmailsWithCookies(section: string) {
  try {
    console.log(
      "[fetchEmailsWithCookies] Starting to fetch emails with cookies..."
    );

    // Fetch email list
    const messagesResponse = await fetch(
      `/api/gmail/messages?section=${section}`
    );
    if (!messagesResponse.ok) {
      throw new Error(`Failed to fetch messages: ${messagesResponse.status}`);
    }

    const messagesData = await messagesResponse.json();
    const messages = messagesData.messages || [];
    console.log("[fetchEmailsWithCookies] Found", messages.length, "messages");

    if (messages.length === 0) {
      return [];
    }

    const emails = [];
    // Process first 10 for faster loading
    for (const message of messages.slice(0, 10)) {
      try {
        const messageResponse = await fetch(`/api/gmail/message/${message.id}`);
        if (!messageResponse.ok) {
          console.error(
            "[fetchEmailsWithCookies] Error fetching message:",
            messageResponse.status
          );
          continue;
        }

        const messageData = await messageResponse.json();
        const headers = {};

        // Extract headers
        messageData.payload.headers.forEach((header) => {
          headers[header.name.toLowerCase()] = header.value;
        });

        // Extract sender information
        let fromName = "";
        let fromEmail = "";

        if (headers.from) {
          const fromMatch = headers.from.match(/"?([^"<]+)"?\s*<?([^>]*)>?/);
          if (fromMatch) {
            fromName = fromMatch[1].trim();
            fromEmail = fromMatch[2].trim();
          } else {
            fromName = headers.from;
            fromEmail = headers.from;
          }
        }

        // Extract body using the common findBody function
        const body = findBody(messageData.payload);

        // Create email object
        const email = {
          id: message.id,
          subject: headers.subject || "(No subject)",
          from: headers.from || "",
          fromName: fromName,
          fromEmail: fromEmail,
          to: headers.to || "",
          date: headers.date || "",
          bodyText: body.bodyText,
          bodyHtml: body.bodyHtml,
          isRead: !messageData.labelIds.includes("UNREAD"),
          isStarred: messageData.labelIds.includes("STARRED"),
          isArchived: messageData.labelIds.includes("ARCHIVE"),
          isTrashed: messageData.labelIds.includes("TRASH"),
          isSnoozed: messageData.labelIds.includes("SNOOZED"),
          hasAttachments: messageData.labelIds.includes("HAS_ATTACHMENT"),
          snippet: messageData.snippet || "",
        };

        emails.push(email);
      } catch (error) {
        console.error(
          "[fetchEmailsWithCookies] Error processing message:",
          error
        );
      }
    }

    console.log("[fetchEmailsWithCookies] Processed", emails.length, "emails");
    return emails;
  } catch (error) {
    console.error("[fetchEmailsWithCookies] Error:", error);
    throw error;
  }
}

function findBody(part) {
  if (!part) return { bodyText: "", bodyHtml: "" };

  let bodyText = "";
  let bodyHtml = "";

  // Check if this part is a text part
  if (part.mimeType === "text/plain" && part.body && part.body.data) {
    try {
      // Use proper base64 decoding with international character support
      const decodedText = atob(
        part.body.data.replace(/-/g, "+").replace(/_/g, "/")
      );

      // Convert the binary string to Unicode
      const bytes = new Uint8Array(decodedText.length);
      for (let i = 0; i < decodedText.length; i++) {
        bytes[i] = decodedText.charCodeAt(i);
      }
      bodyText = new TextDecoder("utf-8").decode(bytes);
      console.log("[findBody] Successfully decoded text/plain content");
    } catch (error) {
      console.error("[findBody] Error decoding text/plain:", error);
      try {
        // Fallback to the previous method
        bodyText = atob(part.body.data.replace(/-/g, "+").replace(/_/g, "/"));
        console.log("[findBody] Used fallback decoding for text/plain");
      } catch (fallbackError) {
        console.error(
          "[findBody] Fallback decoding also failed:",
          fallbackError
        );
        bodyText = "Error decoding email content.";
      }
    }
  } else if (part.mimeType === "text/html" && part.body && part.body.data) {
    try {
      // Use proper base64 decoding with international character support
      const decodedHtml = atob(
        part.body.data.replace(/-/g, "+").replace(/_/g, "/")
      );

      // Convert the binary string to Unicode
      const bytes = new Uint8Array(decodedHtml.length);
      for (let i = 0; i < decodedHtml.length; i++) {
        bytes[i] = decodedHtml.charCodeAt(i);
      }
      bodyHtml = new TextDecoder("utf-8").decode(bytes);
      console.log("[findBody] Successfully decoded text/html content");
    } catch (error) {
      console.error("[findBody] Error decoding text/html:", error);
      try {
        // Fallback to the previous method
        bodyHtml = atob(part.body.data.replace(/-/g, "+").replace(/_/g, "/"));
        console.log("[findBody] Used fallback decoding for text/html");
      } catch (fallbackError) {
        console.error(
          "[findBody] Fallback decoding also failed:",
          fallbackError
        );
        bodyHtml = "Error decoding email content.";
      }
    }
  } else if (part.parts) {
    // Recursively search for text parts in multipart message
    for (const subPart of part.parts) {
      const subBody = findBody(subPart);
      if (subBody.bodyText) bodyText = subBody.bodyText;
      if (subBody.bodyHtml) bodyHtml = subBody.bodyHtml;
    }
  }

  return { bodyText, bodyHtml };
}

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

    if (response.status === 401) {
      console.log(
        "[Gmail] Access token expired while fetching email details, refreshing..."
      );
      await refreshAccessToken();
      return fetchEmailDetails(
        messageId,
        localStorage.getItem("gmail_access_token") || ""
      );
    }

    if (!response.ok) {
      console.error("[Gmail] Error fetching email details:", response.status);
      return null;
    }

    const messageData = await response.json();
    const headers: { [key: string]: string } = {};

    // Extract headers
    messageData.payload.headers.forEach(
      (header: { name: string; value: string }) => {
        headers[header.name.toLowerCase()] = header.value;
      }
    );

    // Extract body
    let bodyText = "";
    let bodyHtml = "";

    function findBody(part: any) {
      if (part.mimeType === "text/plain" && part.body.data) {
        bodyText = Buffer.from(part.body.data, "base64").toString();
      } else if (part.mimeType === "text/html" && part.body.data) {
        bodyHtml = Buffer.from(part.body.data, "base64").toString();
      } else if (part.parts) {
        part.parts.forEach(findBody);
      }
    }

    findBody(messageData.payload);

    // Extract sender information
    const from = headers.from || "";
    const fromMatch = from.match(/([^<]+) <([^>]+)>/);
    const fromName = fromMatch ? fromMatch[1].trim() : from;
    const fromEmail = fromMatch ? fromMatch[2].trim() : from;

    return {
      id: messageId,
      subject: headers.subject || "(No subject)",
      from: from || "",
      fromName: fromName || "Unknown",
      fromEmail: fromEmail || "",
      to: headers.to || "",
      date: headers.date || new Date().toISOString(),
      bodyText: bodyText || "",
      bodyHtml: bodyHtml || "",
      isRead: !messageData.labelIds.includes("UNREAD"),
      isStarred: messageData.labelIds.includes("STARRED"),
      snippet: messageData.snippet || "",
      isArchived: messageData.labelIds.includes("ARCHIVE"),
      isTrashed: messageData.labelIds.includes("TRASH"),
      isSnoozed: messageData.labelIds.includes("SNOOZED"),
      hasAttachments: messageData.labelIds.includes("HAS_ATTACHMENT"),
      isSent: messageData.labelIds.includes("SENT"),
      isScheduled: messageData.labelIds.includes("SCHEDULED"),
      isDraft: messageData.labelIds.includes("DRAFT"),
      isSpam: messageData.labelIds.includes("SPAM"),
      isImportant: messageData.labelIds.includes("IMPORTANT"),
      labelIds: messageData.labelIds || [],
    };
  } catch (error) {
    console.error("[Gmail] Error processing email details:", error);
    return null;
  }
}
