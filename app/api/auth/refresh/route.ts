import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  console.log("[api/auth/refresh] Request received");
  try {
    // Get the refresh token from the request body
    const body = await request.json();
    const refreshToken = body.refreshToken;

    console.log(
      "[api/auth/refresh] Refresh token received:",
      refreshToken ? `Present (${refreshToken.substring(0, 10)}...)` : "Missing"
    );

    if (!refreshToken) {
      console.error("[api/auth/refresh] No refresh token provided");
      return NextResponse.json(
        { error: "No refresh token provided" },
        { status: 400 }
      );
    }

    // Use the refresh token to get a new access token
    console.log("[api/auth/refresh] Starting token refresh with Google");
    console.log(
      "[api/auth/refresh] Client ID:",
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.substring(0, 10) + "..."
    );

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
      "[api/auth/refresh] Token refresh response status:",
      response.status
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "[api/auth/refresh] Token refresh failed:",
        response.status,
        errorText
      );
      return NextResponse.json(
        { error: "Failed to refresh token" },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("[api/auth/refresh] Token refresh successful");
    console.log(
      "[api/auth/refresh] Access token:",
      data.access_token
        ? `Present (${data.access_token.substring(0, 10)}...)`
        : "Missing"
    );
    console.log("[api/auth/refresh] Expires in:", data.expires_in, "seconds");

    // Set the new token in cookies as well
    const apiResponse = NextResponse.json(data);

    // Update the cookies
    console.log("[api/auth/refresh] Setting new tokens in cookies");
    apiResponse.cookies.set("gmail_access_token", data.access_token, {
      httpOnly: true,
      maxAge: data.expires_in,
      path: "/",
    });

    apiResponse.cookies.set(
      "token_expiry",
      (Date.now() + data.expires_in * 1000).toString(),
      {
        httpOnly: true,
        maxAge: data.expires_in,
        path: "/",
      }
    );

    return apiResponse;
  } catch (error) {
    console.error("[api/auth/refresh] Error:", error);
    return NextResponse.json(
      { error: "Failed to refresh token" },
      { status: 500 }
    );
  }
}
