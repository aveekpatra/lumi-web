/**
 * Utility function to refresh the Gmail API access token
 */

export async function refreshAccessToken(
  refreshToken: string
): Promise<string | null> {
  console.log("[refreshAccessToken] Starting token refresh");
  try {
    const tokenEndpoint = "https://oauth2.googleapis.com/token";
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.NEXT_PUBLIC_REDIRECT_URI;

    if (!clientId || !clientSecret) {
      console.error("[refreshAccessToken] Missing client credentials");
      return null;
    }

    console.log("[refreshAccessToken] Preparing request with refresh token");
    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        redirect_uri: redirectUri || "http://localhost:3000/api/auth/callback",
      }),
    });

    console.log("[refreshAccessToken] Token response status:", response.status);

    if (!response.ok) {
      const errorData = await response.text();
      console.error(
        "[refreshAccessToken] Token refresh failed:",
        response.status,
        errorData
      );
      return null;
    }

    const tokenData = await response.json();
    console.log("[refreshAccessToken] Token refresh successful");

    // Update token expiry in localStorage
    try {
      const expiryTime = Date.now() + tokenData.expires_in * 1000;
      localStorage.setItem("token_expiry", expiryTime.toString());
      console.log("[refreshAccessToken] Updated token expiry in localStorage");
    } catch (error) {
      console.error("[refreshAccessToken] Error updating token expiry:", error);
    }

    return tokenData.access_token;
  } catch (error) {
    console.error("[refreshAccessToken] Error during token refresh:", error);
    return null;
  }
}
