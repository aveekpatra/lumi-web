"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function AuthTestPage() {
  const [localStorageTokens, setLocalStorageTokens] = useState<any>(null);
  const [cookieTokens, setCookieTokens] = useState<any>(null);
  const [apiAuthCheck, setApiAuthCheck] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        console.log("[AuthTest] Starting auth test...");

        // Check localStorage
        const localStorageResults = {
          accessToken: null as string | null,
          refreshToken: null as string | null,
          tokenExpiry: null as string | null,
          cookies: document.cookie,
          error: null as string | null,
        };

        try {
          localStorageResults.accessToken =
            localStorage.getItem("gmail_access_token");
          localStorageResults.refreshToken = localStorage.getItem(
            "gmail_refresh_token"
          );
          localStorageResults.tokenExpiry =
            localStorage.getItem("token_expiry");
          console.log("[AuthTest] LocalStorage check complete");
        } catch (e) {
          console.error("[AuthTest] LocalStorage error:", e);
          localStorageResults.error =
            e instanceof Error ? e.message : String(e);
        }

        setLocalStorageTokens(localStorageResults);

        // Check cookies via API
        try {
          console.log("[AuthTest] Checking cookies via API...");
          const cookieResponse = await fetch("/api/auth/token-provider");
          const cookieData = await cookieResponse.json();
          console.log("[AuthTest] Cookie API response:", cookieData);
          setCookieTokens(cookieData);
        } catch (e) {
          console.error("[AuthTest] Cookie API error:", e);
          setCookieTokens({
            error: e instanceof Error ? e.message : String(e),
          });
        }

        // Check auth API
        try {
          console.log("[AuthTest] Testing client-auth-check API...");
          const authCheckResponse = await fetch("/api/auth/client-auth-check");
          const authCheckData = await authCheckResponse.json();
          console.log("[AuthTest] Auth check API response:", authCheckData);
          setApiAuthCheck(authCheckData);
        } catch (e) {
          console.error("[AuthTest] Auth check API error:", e);
          setApiAuthCheck({
            error: e instanceof Error ? e.message : String(e),
          });
        }
      } catch (e) {
        console.error("[AuthTest] General error:", e);
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, []);

  // Helper to print object safely
  const prettyPrint = (obj: any) => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch (e) {
      return `Error stringifying: ${
        e instanceof Error ? e.message : String(e)
      }`;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="bg-gray-800/80 backdrop-blur-xl p-8 rounded-lg shadow-lg max-w-2xl w-full border border-blue-500/20 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mx-auto mb-4" />
          <p className="text-gray-300 mt-4">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-200">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold">Authentication Test Page</h1>

        <div className="bg-gray-800/80 backdrop-blur-xl p-6 rounded-lg border border-blue-500/20">
          <h2 className="text-xl font-semibold mb-4">Browser Environment</h2>
          <div className="space-y-2">
            <p>
              <strong>User Agent:</strong> {navigator.userAgent}
            </p>
            <p>
              <strong>Cookies Enabled:</strong>{" "}
              {navigator.cookieEnabled ? "Yes" : "No"}
            </p>
            <p>
              <strong>localStorage Available:</strong>{" "}
              {typeof window !== "undefined" && window.localStorage
                ? "Yes"
                : "No"}
            </p>
            <p>
              <strong>Current URL:</strong> {window.location.href}
            </p>
            <p>
              <strong>Document Cookie:</strong> {document.cookie || "(empty)"}
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/80 p-6 rounded-lg border border-red-500/40">
            <h2 className="text-xl font-semibold mb-2 text-red-200">Error</h2>
            <pre className="text-red-200 whitespace-pre-wrap">{error}</pre>
          </div>
        )}

        <div className="bg-gray-800/80 backdrop-blur-xl p-6 rounded-lg border border-blue-500/20">
          <h2 className="text-xl font-semibold mb-4">LocalStorage Tokens</h2>
          <pre className="bg-gray-900/80 p-4 rounded-lg whitespace-pre-wrap overflow-x-auto">
            {prettyPrint(localStorageTokens)}
          </pre>
        </div>

        <div className="bg-gray-800/80 backdrop-blur-xl p-6 rounded-lg border border-blue-500/20">
          <h2 className="text-xl font-semibold mb-4">
            Cookie Tokens (from API)
          </h2>
          <pre className="bg-gray-900/80 p-4 rounded-lg whitespace-pre-wrap overflow-x-auto">
            {prettyPrint(cookieTokens)}
          </pre>
        </div>

        <div className="bg-gray-800/80 backdrop-blur-xl p-6 rounded-lg border border-blue-500/20">
          <h2 className="text-xl font-semibold mb-4">Auth Check API</h2>
          <pre className="bg-gray-900/80 p-4 rounded-lg whitespace-pre-wrap overflow-x-auto">
            {prettyPrint(apiAuthCheck)}
          </pre>
        </div>

        <div className="flex gap-4 justify-center mt-8">
          <Link
            href="/"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
          >
            Back to Home
          </Link>
          <Link
            href="/login"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-colors"
          >
            Go to Login
          </Link>
          <button
            onClick={() => {
              localStorage.removeItem("gmail_access_token");
              localStorage.removeItem("gmail_refresh_token");
              localStorage.removeItem("token_expiry");
              localStorage.removeItem("cached_emails");
              window.location.reload();
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition-colors"
          >
            Clear LocalStorage
          </button>
        </div>
      </div>
    </div>
  );
}
