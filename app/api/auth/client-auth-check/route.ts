import { NextRequest, NextResponse } from "next/server";

/**
 * This route allows the client to check if the tokens are valid without exposing them
 */
export async function GET(request: NextRequest) {
  console.log("[client-auth-check] Request received");

  try {
    // Check cookies for tokens
    const accessToken = request.cookies.get("gmail_access_token")?.value;
    const refreshToken = request.cookies.get("gmail_refresh_token")?.value;
    const tokenExpiry = request.cookies.get("token_expiry")?.value;

    console.log(
      "[client-auth-check] Cookie access token:",
      accessToken ? "Present" : "Missing"
    );
    console.log(
      "[client-auth-check] Cookie refresh token:",
      refreshToken ? "Present" : "Missing"
    );
    console.log(
      "[client-auth-check] Cookie token expiry:",
      tokenExpiry ? "Present" : "Missing"
    );

    let isValid = false;
    let isExpired = false;
    let canRefresh = false;

    // Check if token is valid
    if (accessToken) {
      isValid = true;

      // Check if token is expired
      if (tokenExpiry) {
        const expiryTime = parseInt(tokenExpiry);
        isExpired = Date.now() >= expiryTime;
        console.log(
          "[client-auth-check] Token expiry time:",
          new Date(expiryTime).toLocaleString()
        );
        console.log("[client-auth-check] Token is expired:", isExpired);
      }

      // Check if we can refresh
      canRefresh = !!refreshToken;
    }

    // Verify token validity with Gmail API
    if (accessToken && !isExpired) {
      try {
        console.log("[client-auth-check] Verifying token with Gmail API");
        const response = await fetch(
          "https://gmail.googleapis.com/gmail/v1/users/me/profile",
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        console.log(
          "[client-auth-check] Gmail API response status:",
          response.status
        );

        if (!response.ok) {
          isValid = false;
          console.log("[client-auth-check] Token verification failed");

          // If unauthorized, token is expired regardless of expiry time
          if (response.status === 401) {
            isExpired = true;
          }
        } else {
          const userData = await response.json();
          console.log(
            "[client-auth-check] Gmail user email:",
            userData.emailAddress
          );
        }
      } catch (error) {
        console.error("[client-auth-check] Error verifying token:", error);
        isValid = false;
      }
    }

    // Return authentication status
    return NextResponse.json({
      isAuthenticated: isValid && !isExpired,
      isExpired,
      canRefresh,
      tokenInfo: {
        accessToken: !!accessToken,
        refreshToken: !!refreshToken,
        expiryTime: tokenExpiry ? parseInt(tokenExpiry) : null,
      },
    });
  } catch (error) {
    console.error("[client-auth-check] Error:", error);
    return NextResponse.json(
      { error: "Authentication check failed", isAuthenticated: false },
      { status: 500 }
    );
  }
}
