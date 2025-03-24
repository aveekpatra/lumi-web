import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  console.log("[callback] Request received");

  // Log the whole URL for debugging
  console.log("[callback] Request URL:", request.url);

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) { 
    console.error("[callback] No code provided in search params");
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    console.log(
      "[callback] Starting token exchange with code:",
      code.substring(0, 10) + "..."
    );
    console.log(
      "[callback] Redirect URI:",
      process.env.NEXT_PUBLIC_REDIRECT_URI
    );
    console.log(
      "[callback] Client ID:",
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.substring(0, 10) + "..."
    );
    console.log(
      "[callback] Client Secret present:",
      !!process.env.GOOGLE_CLIENT_SECRET
    );

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: process.env.NEXT_PUBLIC_REDIRECT_URI!,
        grant_type: "authorization_code",
      }),
    });

    console.log(
      "[callback] Token exchange response status:",
      tokenResponse.status
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error(
        "[callback] Token exchange failed:",
        tokenResponse.status,
        errorText
      );

      // Return a more descriptive error page
      const errorHtml = `
        <html>
          <head>
            <title>Authentication Failed</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: sans-serif; text-align: center; margin-top: 50px; background-color: #f5f5f5;">
            <div style="max-width: 500px; margin: 0 auto; padding: 20px; background-color: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h1 style="color: #e53e3e;">Authentication Failed</h1>
              <p>There was an error during the authentication process.</p>
              <div style="margin: 20px 0; padding: 10px; background-color: #f8f9fa; border-radius: 5px; font-family: monospace; text-align: left;">
                <strong>Status:</strong> ${tokenResponse.status}<br>
                <strong>Error:</strong> ${errorText}
              </div>
              <p>Please try again or contact support if the issue persists.</p>
              <a href="/login" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background-color: #3182ce; color: white; text-decoration: none; border-radius: 5px;">
                Back to Login
              </a>
            </div>
          </body>
        </html>
      `;

      return new NextResponse(errorHtml, {
        headers: {
          "Content-Type": "text/html",
        },
      });
    }

    const data = await tokenResponse.json();
    console.log("[callback] Token exchange successful");
    console.log(
      "[callback] Access token:",
      data.access_token
        ? `Present (${data.access_token.substring(0, 10)}...)`
        : "Missing"
    );
    console.log(
      "[callback] Refresh token:",
      data.refresh_token
        ? `Present (${data.refresh_token.substring(0, 10)}...)`
        : "Missing"
    );
    console.log("[callback] Expires in:", data.expires_in, "seconds");

    if (!data.refresh_token) {
      console.error("[callback] No refresh token received");
    }

    // Properly escape the tokens to prevent JavaScript injection
    // Check for special characters that might cause issues
    console.log(
      "[callback] Access token contains quotes:",
      data.access_token?.includes('"') || false
    );
    console.log(
      "[callback] Access token contains backslashes:",
      data.access_token?.includes("\\") || false
    );

    if (data.refresh_token) {
      console.log(
        "[callback] Refresh token contains quotes:",
        data.refresh_token.includes('"') || false
      );
      console.log(
        "[callback] Refresh token contains backslashes:",
        data.refresh_token.includes("\\") || false
      );
    }

    // Use simpler approach to string formatting to avoid escaping issues
    const accessTokenStr = data.access_token || "";
    const refreshTokenStr = data.refresh_token || "";
    const tokenExpiry = Date.now() + data.expires_in * 1000;

    // Create a response that redirects to home
    const response = NextResponse.redirect(new URL("/", request.url));

    // Set httpOnly cookies as a fallback
    console.log("[callback] Setting cookies");
    response.cookies.set("gmail_access_token", data.access_token, {
      httpOnly: true,
      maxAge: data.expires_in,
      path: "/",
    });

    if (data.refresh_token) {
      response.cookies.set("gmail_refresh_token", data.refresh_token, {
        httpOnly: true,
        // Refresh tokens are long-lived, set to 30 days
        maxAge: 30 * 24 * 60 * 60,
        path: "/",
      });
    }

    response.cookies.set("token_expiry", tokenExpiry.toString(), {
      httpOnly: true,
      maxAge: data.expires_in,
      path: "/",
    });

    // Store tokens in localStorage and include debug info
    const html = `
      <html>
        <head>
          <title>Authentication Successful</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script>
            // Log all errors to help debug issues
            window.onerror = function(message, source, lineno, colno, error) {
              console.error("Error in auth callback:", message, "at", source, lineno, ":", error);
              document.getElementById('status').textContent += "ERROR: " + message + "\\n";
              return false;
            };
          </script>
        </head>
        <body style="font-family: sans-serif; text-align: center; margin-top: 50px; background-color: #f5f5f5;">
          <div style="max-width: 500px; margin: 0 auto; padding: 20px; background-color: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h1>Successfully authenticated!</h1>
            <p>Redirecting you back to the app...</p>
            <div id="status" style="margin: 20px 0; padding: 10px; background-color: #f8f9fa; border-radius: 5px; font-family: monospace; text-align: left; overflow-y: auto; max-height: 200px;"></div>
            <div style="margin-top: 20px;">
              <a href="/auth-debug" style="display: inline-block; margin-right: 10px; padding: 8px 16px; background-color: #805ad5; color: white; text-decoration: none; border-radius: 5px;">
                Debug Authentication
              </a>
              <a href="/" style="display: inline-block; padding: 8px 16px; background-color: #3182ce; color: white; text-decoration: none; border-radius: 5px;">
                Go to App
              </a>
            </div>
          </div>
          
          <script>
            (function() {
              const statusEl = document.getElementById('status');
              
              function updateStatus(message) {
                console.log(message);
                statusEl.textContent += message + "\\n";
              }
              
              updateStatus("Starting token storage...");
              
              // Test if localStorage is available and working
              try {
                updateStatus("Testing localStorage availability...");
                const testKey = "_test_" + Date.now();
                localStorage.setItem(testKey, "test");
                const testValue = localStorage.getItem(testKey);
                localStorage.removeItem(testKey);
                
                if (testValue !== "test") {
                  throw new Error("localStorage test failed: value mismatch");
                }
                
                updateStatus("localStorage is available and working");
              } catch (storageError) {
                updateStatus("ERROR: localStorage test failed: " + storageError.message);
                updateStatus("Browser may be in private/incognito mode or localStorage is disabled");
                updateStatus("Will rely on cookie-based authentication instead");
                return;
              }
              
              try {
                // Clear any existing tokens first
                updateStatus("Clearing existing tokens...");
                localStorage.removeItem("gmail_access_token");
                localStorage.removeItem("gmail_refresh_token");
                localStorage.removeItem("token_expiry");
                localStorage.removeItem("cached_emails");
                
                // Store tokens directly without JSON.stringify
                updateStatus("Storing tokens directly...");
                
                const accessToken = "${accessTokenStr}";
                updateStatus("Access token length: " + accessToken.length);
                if (accessToken) {
                  localStorage.setItem("gmail_access_token", accessToken);
                  updateStatus("Access token stored directly");
                }
                
                const refreshToken = "${refreshTokenStr}";
                updateStatus("Refresh token length: " + refreshToken.length);
                if (refreshToken) {
                  localStorage.setItem("gmail_refresh_token", refreshToken);
                  updateStatus("Refresh token stored directly");
                }
                
                const tokenExpiry = "${tokenExpiry}";
                localStorage.setItem("token_expiry", tokenExpiry);
                updateStatus("Token expiry stored: " + tokenExpiry);
                
                // Verify stored tokens
                const storedAccessToken = localStorage.getItem("gmail_access_token");
                const storedRefreshToken = localStorage.getItem("gmail_refresh_token");
                const storedExpiry = localStorage.getItem("token_expiry");
                
                updateStatus("Verification results:");
                updateStatus("- Access token: " + (storedAccessToken ? "Present (" + storedAccessToken.length + " chars)" : "Missing"));
                updateStatus("- Refresh token: " + (storedRefreshToken ? "Present (" + storedRefreshToken.length + " chars)" : "Missing"));
                updateStatus("- Token expiry: " + storedExpiry);
                
                // Add alert to ensure user sees any issues
                if (!storedAccessToken) {
                  updateStatus("WARNING: Failed to store access token!");
                  alert("Warning: Failed to store access token. Authentication may not work correctly.");
                } else {
                  updateStatus("Access token stored successfully");
                }
              } catch (error) {
                updateStatus("ERROR: " + error.message);
                updateStatus("Error stack: " + error.stack);
                alert("An error occurred while storing tokens: " + error.message);
                return;
              }
              
              // No automatic redirect - let user read the status and use the buttons
              updateStatus("All done! Click one of the buttons below to continue.");
            })();
          </script>
        </body>
      </html>
    `;

    console.log("[callback] Returning HTML response with localStorage script");
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
      },
    });
  } catch (error) {
    console.error("[callback] Error:", error);

    // Return a more descriptive error page
    const errorHtml = `
      <html>
        <head>
          <title>Authentication Error</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: sans-serif; text-align: center; margin-top: 50px; background-color: #f5f5f5;">
          <div style="max-width: 500px; margin: 0 auto; padding: 20px; background-color: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h1 style="color: #e53e3e;">Authentication Error</h1>
            <p>An unexpected error occurred during the authentication process.</p>
            <div style="margin: 20px 0; padding: 10px; background-color: #f8f9fa; border-radius: 5px; font-family: monospace; text-align: left;">
              ${error instanceof Error ? error.message : String(error)}
            </div>
            <p>Please try again or contact support if the issue persists.</p>
            <a href="/login" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background-color: #3182ce; color: white; text-decoration: none; border-radius: 5px;">
              Back to Login
            </a>
          </div>
        </body>
      </html>
    `;

    return new NextResponse(errorHtml, {
      headers: {
        "Content-Type": "text/html",
      },
    });
  }
}
