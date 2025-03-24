import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  console.log("[api/gmail/messages] Request received");
  try {
    // Get token from cookies
    const accessToken = request.cookies.get("gmail_access_token")?.value;
    console.log(
      "[api/gmail/messages] Access token from cookies:",
      accessToken ? "Present" : "Missing"
    );

    // Get section from query parameters
    const searchParams = request.nextUrl.searchParams;
    const section = searchParams.get("section") || "inbox";
    console.log("[api/gmail/messages] Requested section:", section);

    if (!accessToken) {
      console.error("[api/gmail/messages] No access token in cookies");
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if token expired and needs refresh
    const tokenExpiry = request.cookies.get("token_expiry")?.value;
    console.log(
      "[api/gmail/messages] Token expiry from cookies:",
      tokenExpiry || "Missing"
    );

    if (tokenExpiry) {
      const expiryDate = new Date(parseInt(tokenExpiry));
      const isExpired = Date.now() >= parseInt(tokenExpiry) - 300000;
      console.log(
        "[api/gmail/messages] Token expires at:",
        expiryDate.toLocaleString()
      );
      console.log(
        "[api/gmail/messages] Token is expired or about to expire:",
        isExpired
      );

      if (isExpired) {
        const refreshToken = request.cookies.get("gmail_refresh_token")?.value;
        console.log(
          "[api/gmail/messages] Refresh token:",
          refreshToken ? "Present" : "Missing"
        );

        if (refreshToken) {
          // Try to refresh the token
          try {
            console.log("[api/gmail/messages] Attempting to refresh token...");
            const refreshed = await refreshAccessToken(refreshToken);
            console.log(
              "[api/gmail/messages] Token refresh result:",
              refreshed.success
            );

            if (refreshed.success) {
              // Set new cookies and continue with new access token
              console.log(
                "[api/gmail/messages] Using new access token to fetch messages"
              );
              const response = await fetchMessages(
                refreshed.accessToken,
                section
              );

              // Update cookies in the response
              console.log(
                "[api/gmail/messages] Setting new cookies in response"
              );
              response.cookies.set(
                "gmail_access_token",
                refreshed.accessToken,
                {
                  httpOnly: true,
                  maxAge: refreshed.expiresIn,
                  path: "/",
                }
              );

              response.cookies.set(
                "token_expiry",
                (Date.now() + refreshed.expiresIn * 1000).toString(),
                {
                  httpOnly: true,
                  maxAge: refreshed.expiresIn,
                  path: "/",
                }
              );

              return response;
            }
          } catch (error) {
            console.error(
              "[api/gmail/messages] Failed to refresh token:",
              error
            );
            return NextResponse.json(
              { error: "Failed to refresh token" },
              { status: 401 }
            );
          }
        }
      }
    }

    // Fetch messages with the current token
    console.log("[api/gmail/messages] Using current token to fetch messages");
    return await fetchMessages(accessToken, section);
  } catch (error) {
    console.error("[api/gmail/messages] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

async function fetchMessages(accessToken: string, section: string) {
  console.log("[api/gmail/messages] Starting fetchMessages with token");

  try {
    // Construct query based on section
    const query = buildQueryForSection(section);

    // Fetch list of messages with appropriate label filtering
    console.log("[api/gmail/messages] Fetching messages with query:", query);

    const url = new URL(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages"
    );
    url.searchParams.append("maxResults", "25");

    if (query) {
      url.searchParams.append("q", query);
    }

    const messagesResponse = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    console.log(
      "[api/gmail/messages] Message list response status:",
      messagesResponse.status
    );

    if (!messagesResponse.ok) {
      const errorText = await messagesResponse.text();
      console.error(
        "[api/gmail/messages] Error response:",
        messagesResponse.status,
        errorText
      );
      return NextResponse.json(
        { error: "Failed to fetch message list" },
        { status: messagesResponse.status }
      );
    }

    const messagesData = await messagesResponse.json();
    const messages = messagesData.messages || [];
    console.log("[api/gmail/messages] Found", messages.length, "messages");

    if (messages.length === 0) {
      console.log(
        "[api/gmail/messages] No messages found, returning empty array"
      );
      return NextResponse.json({ emails: [] });
    }

    // Use batch processing for better performance - process in smaller batches
    const batchSize = 5;
    const emails = [];
    const messagesToProcess = messages.slice(0, 15); // Only process first 15 for faster initial load

    // Process messages in batches
    for (let i = 0; i < messagesToProcess.length; i += batchSize) {
      const batchMessages = messagesToProcess.slice(i, i + batchSize);
      console.log(
        `[api/gmail/messages] Processing batch ${i / batchSize + 1} with ${
          batchMessages.length
        } messages`
      );

      // Process batch in parallel
      const batchPromises = batchMessages.map((message) =>
        fetchMessageDetails(message.id, accessToken)
      );

      const batchResults = await Promise.all(batchPromises);
      emails.push(...batchResults.filter(Boolean)); // Filter out any null results
    }

    console.log(
      "[api/gmail/messages] Successfully processed",
      emails.length,
      "messages"
    );

    console.log("[api/gmail/messages] Returning JSON response with emails");
    return NextResponse.json({
      emails,
      nextPageToken: messagesData.nextPageToken || null,
      resultSizeEstimate: messagesData.resultSizeEstimate || 0,
    });
  } catch (error) {
    console.error("[api/gmail/messages] Error processing messages:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching messages" },
      { status: 500 }
    );
  }
}

// Fetch individual message details
async function fetchMessageDetails(messageId: string, accessToken: string) {
  try {
    console.log(
      "[api/gmail/messages] Fetching details for message:",
      messageId
    );
    const messageResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    console.log(
      "[api/gmail/messages] Message details response status:",
      messageResponse.status
    );

    if (!messageResponse.ok) {
      console.error(
        "[api/gmail/messages] Error fetching message details:",
        messageResponse.status
      );
      return null;
    }

    const messageData = await messageResponse.json();
    console.log("[api/gmail/messages] Processing message headers and body");

    return processMessageData(messageData);
  } catch (error) {
    console.error("[api/gmail/messages] Error processing message:", error);
    return null;
  }
}

// Process message data into email object
function processMessageData(messageData: any) {
  const headers: { [key: string]: string } = {};

  // Extract headers
  messageData.payload.headers.forEach(
    (header: { name: string; value: string }) => {
      headers[header.name.toLowerCase()] = header.value;
    }
  );

  // Extract body
  const bodyData = extractBody(messageData.payload);

  // Extract sender information
  const { fromName, fromEmail } = extractSenderInfo(headers.from || "");

  console.log("[api/gmail/messages] Created email object for:", messageData.id);
  return {
    id: messageData.id,
    subject: headers.subject || "(No subject)",
    from: headers.from || "",
    fromName: fromName || "Unknown",
    fromEmail: fromEmail || "",
    to: headers.to || "",
    date: headers.date || new Date().toISOString(),
    bodyText: bodyData.bodyText || "",
    bodyHtml: bodyData.bodyHtml || "",
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
}

// Extract body content from message parts
function extractBody(part: any): { bodyText: string; bodyHtml: string } {
  let bodyText = "";
  let bodyHtml = "";

  // If the part has data directly
  if (part.body && part.body.data) {
    if (part.mimeType === "text/plain") {
      bodyText = Buffer.from(part.body.data, "base64").toString();
    } else if (part.mimeType === "text/html") {
      bodyHtml = Buffer.from(part.body.data, "base64").toString();
    }
  }

  // Check for multi-part messages
  if (part.parts) {
    part.parts.forEach((subPart: any) => {
      const subResult = extractBody(subPart);
      if (subResult.bodyText && !bodyText) bodyText = subResult.bodyText;
      if (subResult.bodyHtml && !bodyHtml) bodyHtml = subResult.bodyHtml;
    });
  }

  return { bodyText, bodyHtml };
}

// Extract sender name and email
function extractSenderInfo(from: string): {
  fromName: string;
  fromEmail: string;
} {
  if (!from) {
    return { fromName: "Unknown", fromEmail: "" };
  }

  const fromMatch = from.match(/([^<]+) <([^>]+)>/);
  return {
    fromName: fromMatch ? fromMatch[1].trim() : from,
    fromEmail: fromMatch ? fromMatch[2].trim() : from,
  };
}

// Helper function to build appropriate query based on section
function buildQueryForSection(section: string): string {
  switch (section) {
    case "inbox":
      return "in:inbox";
    case "sent":
      return "in:sent";
    case "starred":
      return "is:starred";
    case "draft":
      return "is:draft";
    case "trash":
      return "in:trash";
    case "spam":
      return "in:spam";
    case "important":
      return "is:important";
    case "snoozed":
      return "label:snoozed";
    case "all":
      return "";
    default:
      return `in:${section}`;
  }
}

// Helper function to refresh the token
async function refreshAccessToken(refreshToken: string) {
  console.log("[api/gmail/messages] Starting token refresh");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  console.log(
    "[api/gmail/messages] Token refresh response status:",
    response.status
  );

  if (!response.ok) {
    console.error(
      "[api/gmail/messages] Token refresh failed:",
      response.status
    );
    throw new Error("Failed to refresh token");
  }

  const data = await response.json();
  console.log(
    "[api/gmail/messages] Token refresh successful, expires in:",
    data.expires_in,
    "seconds"
  );

  return {
    success: true,
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}
