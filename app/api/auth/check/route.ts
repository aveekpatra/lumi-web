import { NextResponse } from "next/server";

export async function GET() {
  // Only return partial values for security
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  const redirectUri = process.env.NEXT_PUBLIC_REDIRECT_URI || "";

  return NextResponse.json({
    clientIdPresent: !!clientId,
    clientIdLength: clientId.length,
    clientIdStart: clientId.substring(0, 5) + "...",
    clientSecretPresent: !!clientSecret,
    clientSecretLength: clientSecret.length,
    clientSecretStart: clientSecret.substring(0, 3) + "...",
    redirectUri: redirectUri,
  });
}
