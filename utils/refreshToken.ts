/**
 * Utility function to refresh the Gmail API access token
 */

export async function refreshGmailAccessToken(): Promise<void> {
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
