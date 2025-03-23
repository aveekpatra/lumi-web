"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function AuthDebugPage() {
  const [accessToken, setAccessToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [tokenExpiry, setTokenExpiry] = useState("");
  const [status, setStatus] = useState<string>("");
  const [logMessages, setLogMessages] = useState<string[]>([]);

  // Helper to log messages
  const log = (message: string) => {
    console.log(`[AuthDebug] ${message}`);
    setLogMessages((prev) => [...prev, message]);
    setStatus(message);
  };

  useEffect(() => {
    // Test if localStorage is available and working
    try {
      const testKey = "_test_" + Date.now();
      localStorage.setItem(testKey, "test");
      const testValue = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);

      if (testValue === "test") {
        log("localStorage is available and working");
      } else {
        log("localStorage test failed: value mismatch");
      }
    } catch (e) {
      log(`localStorage error: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Check existing tokens
    try {
      const storedAccessToken = localStorage.getItem("gmail_access_token");
      const storedRefreshToken = localStorage.getItem("gmail_refresh_token");
      const storedExpiry = localStorage.getItem("token_expiry");

      log(
        `Existing access token: ${storedAccessToken ? "Present" : "Missing"}`
      );
      log(
        `Existing refresh token: ${storedRefreshToken ? "Present" : "Missing"}`
      );
      log(`Existing token expiry: ${storedExpiry || "Missing"}`);

      if (storedExpiry) {
        const expiryDate = new Date(parseInt(storedExpiry));
        log(`Token expiry date: ${expiryDate.toLocaleString()}`);
      }
    } catch (e) {
      log(
        `Error checking tokens: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }, []);

  const storeTokens = () => {
    try {
      log("Attempting to store tokens in localStorage...");

      localStorage.setItem("gmail_access_token", accessToken);
      log("Access token stored");

      if (refreshToken) {
        localStorage.setItem("gmail_refresh_token", refreshToken);
        log("Refresh token stored");
      }

      const expiryValue = tokenExpiry || (Date.now() + 3600 * 1000).toString();
      localStorage.setItem("token_expiry", expiryValue);
      log(`Token expiry stored: ${expiryValue}`);

      // Verify storage
      const storedAccessToken = localStorage.getItem("gmail_access_token");
      const storedRefreshToken = localStorage.getItem("gmail_refresh_token");
      const storedExpiry = localStorage.getItem("token_expiry");

      log(
        `Verification - Access token: ${
          storedAccessToken ? "Present" : "Missing"
        }`
      );
      log(
        `Verification - Refresh token: ${
          storedRefreshToken ? "Present" : "Missing"
        }`
      );
      log(`Verification - Token expiry: ${storedExpiry || "Missing"}`);

      log("Tokens stored successfully!");
    } catch (e) {
      log(
        `Error storing tokens: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  };

  const clearTokens = () => {
    try {
      log("Clearing tokens from localStorage...");
      localStorage.removeItem("gmail_access_token");
      localStorage.removeItem("gmail_refresh_token");
      localStorage.removeItem("token_expiry");
      localStorage.removeItem("cached_emails");
      log("All tokens cleared!");
    } catch (e) {
      log(
        `Error clearing tokens: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  };

  // Test the API endpoints
  const testTokenProviderApi = async () => {
    try {
      log("Testing token provider API...");
      const response = await fetch("/api/auth/token-provider");
      log(`Response status: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        log(`API response: ${JSON.stringify(data)}`);
      } else {
        log(`API error: ${response.statusText}`);
      }
    } catch (e) {
      log(`API test error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const testAuthCheckApi = async () => {
    try {
      log("Testing client-auth-check API...");
      const response = await fetch("/api/auth/client-auth-check");
      log(`Response status: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        log(`API response: ${JSON.stringify(data)}`);
      } else {
        log(`API error: ${response.statusText}`);
      }
    } catch (e) {
      log(`API test error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-200">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold">Auth Debug Tool</h1>
        <p className="text-gray-300">
          Use this tool to manually test the authentication storage.
        </p>

        <div className="bg-gray-800/80 backdrop-blur-xl p-6 rounded-lg border border-blue-500/20">
          <h2 className="text-xl font-semibold mb-4">Manual Token Storage</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Access Token
              </label>
              <input
                type="text"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Enter access token"
                className="w-full px-3 py-2 bg-gray-700 rounded-md border border-gray-600 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Refresh Token (optional)
              </label>
              <input
                type="text"
                value={refreshToken}
                onChange={(e) => setRefreshToken(e.target.value)}
                placeholder="Enter refresh token"
                className="w-full px-3 py-2 bg-gray-700 rounded-md border border-gray-600 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Token Expiry (optional, unix timestamp in ms)
              </label>
              <input
                type="text"
                value={tokenExpiry}
                onChange={(e) => setTokenExpiry(e.target.value)}
                placeholder="Enter expiry timestamp or leave blank for 1h"
                className="w-full px-3 py-2 bg-gray-700 rounded-md border border-gray-600 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={storeTokens}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
              >
                Store Tokens
              </button>

              <button
                onClick={clearTokens}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition-colors"
              >
                Clear Tokens
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/80 backdrop-blur-xl p-6 rounded-lg border border-blue-500/20">
          <h2 className="text-xl font-semibold mb-4">API Tests</h2>

          <div className="flex gap-3">
            <button
              onClick={testTokenProviderApi}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-colors"
            >
              Test Token Provider API
            </button>

            <button
              onClick={testAuthCheckApi}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white transition-colors"
            >
              Test Auth Check API
            </button>
          </div>
        </div>

        <div className="bg-gray-800/80 backdrop-blur-xl p-6 rounded-lg border border-blue-500/20">
          <h2 className="text-xl font-semibold mb-4">Log Output</h2>
          <div className="bg-gray-900/80 p-4 rounded-lg max-h-96 overflow-y-auto text-gray-300 font-mono text-sm">
            {logMessages.map((message, index) => (
              <div key={index} className="pb-1">
                {message}
              </div>
            ))}
            {logMessages.length === 0 && (
              <div className="text-gray-500">No logs yet...</div>
            )}
          </div>
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
          <Link
            href="/auth-test"
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white transition-colors"
          >
            View Auth Status
          </Link>
        </div>
      </div>
    </div>
  );
}
