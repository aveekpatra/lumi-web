"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [authStatus, setAuthStatus] = useState<string>("checking");
  const [storageAvailable, setStorageAvailable] = useState<boolean | null>(
    null
  );
  const [cookiesAvailable, setCookiesAvailable] = useState<boolean | null>(
    null
  );
  const [statusMessages, setStatusMessages] = useState<string[]>([]);
  const router = useRouter();

  // Add a function to log messages and update UI
  const addStatus = (message: string) => {
    console.log(`[LoginPage] ${message}`);
    setStatusMessages((prev) => [...prev, message]);
    setAuthStatus(message);
  };

  // Function to check if localStorage is available
  const checkStorage = () => {
    try {
      const testKey = "test_storage_" + Date.now();
      localStorage.setItem(testKey, "test");
      const testValue = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      const isAvailable = testValue === "test";
      setStorageAvailable(isAvailable);
      return isAvailable;
    } catch (e) {
      console.error("[LoginPage] Storage test error:", e);
      setStorageAvailable(false);
      return false;
    }
  };

  // Function to check if cookies are available
  const checkCookies = () => {
    try {
      document.cookie = "test_cookie=1; path=/; max-age=60";
      const available = document.cookie.indexOf("test_cookie=") !== -1;
      setCookiesAvailable(available);
      return available;
    } catch (e) {
      console.error("[LoginPage] Cookie test error:", e);
      setCookiesAvailable(false);
      return false;
    }
  };

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      addStatus("Starting authentication check");

      // First check browser capabilities
      addStatus("Checking browser capabilities");
      const hasStorage = checkStorage();
      const hasCookies = checkCookies();

      addStatus(`localStorage available: ${hasStorage ? "Yes" : "No"}`);
      addStatus(`Cookies available: ${hasCookies ? "Yes" : "No"}`);

      if (!hasStorage && !hasCookies) {
        addStatus(
          "Your browser doesn't support required storage methods. Please enable cookies or try a different browser."
        );
        setIsCheckingAuth(false);
        return;
      }

      try {
        // First try localStorage if available
        if (hasStorage) {
          addStatus("Checking localStorage for tokens");
          try {
            const accessToken = localStorage.getItem("gmail_access_token");
            const refreshToken = localStorage.getItem("gmail_refresh_token");
            const tokenExpiry = localStorage.getItem("token_expiry");

            addStatus(`Access token: ${accessToken ? "Present" : "Missing"}`);
            addStatus(`Refresh token: ${refreshToken ? "Present" : "Missing"}`);
            addStatus(`Token expiry: ${tokenExpiry ? "Present" : "Missing"}`);

            // First try localStorage
            if (accessToken) {
              addStatus("Found token in localStorage");

              // Check if token is expired
              if (tokenExpiry) {
                const expiryTime = parseInt(tokenExpiry);
                const isExpired = Date.now() >= expiryTime;
                addStatus(
                  `Token expiry time: ${new Date(expiryTime).toLocaleString()}`
                );
                addStatus(`Token is expired: ${isExpired}`);

                if (isExpired && !refreshToken) {
                  addStatus("Token expired and no refresh token available");
                  // Continue to cookie check
                } else {
                  // Token valid or can be refreshed
                  addStatus(
                    "Found valid token in localStorage, redirecting..."
                  );
                  router.replace("/");
                  return;
                }
              } else {
                // No expiry but token exists
                addStatus("Found token in localStorage, redirecting...");
                router.replace("/");
                return;
              }
            }
          } catch (storageError) {
            addStatus(
              `Error accessing localStorage: ${
                storageError instanceof Error
                  ? storageError.message
                  : String(storageError)
              }`
            );
          }
        }

        // If localStorage check didn't succeed, check cookies
        addStatus("Checking cookies via API");
        try {
          const cookieResponse = await fetch("/api/auth/token-provider");
          addStatus(`Cookie check response status: ${cookieResponse.status}`);

          if (!cookieResponse.ok) {
            addStatus(`Error checking cookies: ${cookieResponse.status}`);
          } else {
            const cookieData = await cookieResponse.json();
            addStatus(`Cookie check result: ${JSON.stringify(cookieData)}`);

            if (cookieData.accessToken) {
              addStatus("Found token in cookies, redirecting");
              router.replace("/");
              return;
            }
          }
        } catch (cookieError) {
          addStatus(
            `Error checking cookies: ${
              cookieError instanceof Error
                ? cookieError.message
                : String(cookieError)
            }`
          );
        }

        // No valid tokens found anywhere
        addStatus("No valid tokens found, please log in");
      } catch (error) {
        addStatus(
          `Error checking auth: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleGoogleLogin = async () => {
    addStatus("Starting Google login process");
    setIsLoading(true);
    try {
      const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      const REDIRECT_URI = process.env.NEXT_PUBLIC_REDIRECT_URI;

      addStatus(`Using client ID: ${GOOGLE_CLIENT_ID?.substring(0, 10)}...`);
      addStatus(`Using redirect URI: ${REDIRECT_URI}`);

      const googleAuthUrl =
        `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${GOOGLE_CLIENT_ID}` +
        `&redirect_uri=${REDIRECT_URI}` +
        `&response_type=code` +
        `&scope=https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email` +
        `&access_type=offline` +
        `&prompt=consent`;

      addStatus("Redirecting to Google auth URL");
      window.location.href = googleAuthUrl;
    } catch (error) {
      addStatus(
        `Login error: ${error instanceof Error ? error.message : String(error)}`
      );
      setIsLoading(false);
    }
  };

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="bg-gray-800/80 backdrop-blur-xl p-8 rounded-lg shadow-lg max-w-md w-full border border-blue-500/20 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mx-auto mb-4" />
          <p className="text-gray-300 mt-4">{authStatus}</p>

          <div className="mt-6 text-left max-h-40 overflow-y-auto text-xs bg-gray-900/50 p-2 rounded text-gray-400">
            {statusMessages.map((msg, i) => (
              <div key={i} className="leading-relaxed">
                {msg}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="bg-gray-800/80 backdrop-blur-xl p-8 rounded-lg shadow-lg max-w-md w-full border border-blue-500/20">
        <h1 className="text-2xl font-bold text-center text-white mb-8">
          Welcome to Lumi Mail
        </h1>

        {!storageAvailable && !cookiesAvailable && (
          <div className="mb-6 p-3 bg-red-900/50 border border-red-500/30 rounded-lg text-red-200 text-sm">
            <div className="font-semibold mb-1">Browser Storage Issue</div>
            <p>
              Your browser has localStorage and cookies disabled. Please enable
              at least one of these for authentication to work.
            </p>
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={isLoading || (!storageAvailable && !cookiesAvailable)}
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-3 transition-all duration-200 shadow-lg shadow-blue-500/20 border border-blue-400/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </>
          )}
        </button>

        <div className="mt-6 text-center">
          <Link
            href="/auth-test"
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            View Auth Debug Page
          </Link>
        </div>
      </div>
    </div>
  );
}
