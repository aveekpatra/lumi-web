import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { accessToken } = await request.json();

    if (!accessToken) {
      return NextResponse.json(
        { error: "Access token is required" },
        { status: 400 }
      );
    }

    console.log("[direct-gmail] Testing Gmail API with token");

    const response = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/profile",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const responseText = await response.text();
    console.log("[direct-gmail] Response status:", response.status);

    if (!response.ok) {
      console.error("[direct-gmail] API request failed:", responseText);
      return NextResponse.json(
        {
          error: "Failed to access Gmail API",
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

    console.log("[direct-gmail] Gmail API request successful");

    return NextResponse.json({
      success: true,
      profile: data,
    });
  } catch (error) {
    console.error("[direct-gmail] Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
