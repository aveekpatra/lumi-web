import { NextRequest, NextResponse } from "next/server";

/**
 * This API route provides tokens from httpOnly cookies
 * Used as a fallback when localStorage isn't working
 */
export async function GET(request: NextRequest) {
  console.log("[token-provider] Request received");
  try {
    // Get tokens from cookies
    const accessToken = request.cookies.get("gmail_access_token")?.value;
    const refreshToken = request.cookies.get("gmail_refresh_token")?.value;
    const tokenExpiry = request.cookies.get("token_expiry")?.value;

    console.log(
      "[token-provider] Access token from cookies:",
      accessToken ? "Present" : "Missing"
    );
    console.log(
      "[token-provider] Refresh token from cookies:",
      refreshToken ? "Present" : "Missing"
    );
    console.log(
      "[token-provider] Token expiry from cookies:",
      tokenExpiry || "Missing"
    );

    if (tokenExpiry) {
      const expiryTime = new Date(parseInt(tokenExpiry));
      const isExpired = Date.now() >= parseInt(tokenExpiry);
      console.log(
        "[token-provider] Token expires at:",
        expiryTime.toLocaleString()
      );
      console.log("[token-provider] Token is expired:", isExpired);
    }

    // Return tokens, but don't expose full values in the response for security
    const response = {
      accessToken: accessToken ? true : false,
      refreshToken: refreshToken ? true : false,
      tokenExpiry: tokenExpiry ? parseInt(tokenExpiry) : null,
      // For debugging only - remove in production
      tokenInfo: {
        accessTokenLength: accessToken?.length || 0,
        refreshTokenLength: refreshToken?.length || 0,
      },
    };

    console.log(
      "[token-provider] Returning response:",
      JSON.stringify(response)
    );
    return NextResponse.json(response);
  } catch (error) {
    console.error("[token-provider] Error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve tokens" },
      { status: 500 }
    );
  }
}
