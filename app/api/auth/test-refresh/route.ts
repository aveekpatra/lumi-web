import { NextRequest, NextResponse } from "next/server";

// This is a special testing route to debug OAuth issues
export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = await request.json();

    if (!refreshToken) {
      return NextResponse.json(
        { error: "Refresh token is required" },
        { status: 400 }
      );
    }

    // Use non-environment variables for direct testing
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;

    console.log("[test-refresh] Starting token refresh with direct values");
    console.log("[test-refresh] Client ID length:", clientId?.length || 0);
    console.log(
      "[test-refresh] Client Secret length:",
      clientSecret?.length || 0
    );
    console.log(
      "[test-refresh] Refresh token length:",
      refreshToken?.length || 0
    );

    // Log the exact values to be sent (careful with secrets)
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });

    console.log(
      "[test-refresh] Request body length:",
      params.toString().length
    );

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    const responseText = await response.text();
    console.log("[test-refresh] Response status:", response.status);
    console.log("[test-refresh] Response text:", responseText);

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Failed to refresh token",
          status: response.status,
          details: responseText,
        },
        { status: response.status }
      );
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      return NextResponse.json(
        { error: "Failed to parse response", responseText },
        { status: 500 }
      );
    }

    console.log("[test-refresh] Token refresh successful");

    return NextResponse.json({
      success: true,
      access_token: data.access_token?.substring(0, 10) + "...",
      expires_in: data.expires_in,
      token_type: data.token_type,
    });
  } catch (error) {
    console.error("[test-refresh] Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
