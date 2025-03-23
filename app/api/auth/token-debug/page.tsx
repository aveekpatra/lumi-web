"use client";

import { useState, useEffect } from "react";

export default function TokenDebugPage() {
  const [accessToken, setAccessToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [tokenExpiry, setTokenExpiry] = useState("");
  const [envInfo, setEnvInfo] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [apiTestResult, setApiTestResult] = useState<any>(null);
  const [apiTestLoading, setApiTestLoading] = useState(false);

  useEffect(() => {
    // Load tokens from localStorage
    const storedAccessToken = localStorage.getItem("gmail_access_token") || "";
    const storedRefreshToken =
      localStorage.getItem("gmail_refresh_token") || "";
    const storedTokenExpiry = localStorage.getItem("token_expiry") || "";

    setAccessToken(storedAccessToken);
    setRefreshToken(storedRefreshToken);
    setTokenExpiry(storedTokenExpiry);

    // Check environment variables
    fetch("/api/auth/check")
      .then((res) => res.json())
      .then((data) => setEnvInfo(data))
      .catch((err) => console.error("Error checking environment:", err));
  }, []);

  const handleTestRefresh = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/test-refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await response.json();
      setResult(data);

      if (data.success && data.access_token) {
        // Update the UI only - we're not storing this test token
        setAccessToken(data.access_token);
      }
    } catch (error) {
      setResult({ error: "Error making request", details: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const handleDirectGmailTest = async () => {
    setApiTestLoading(true);
    try {
      const response = await fetch("/api/auth/direct-gmail-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accessToken }),
      });

      const data = await response.json();
      setApiTestResult(data);
    } catch (error) {
      setApiTestResult({
        error: "Error making request",
        details: String(error),
      });
    } finally {
      setApiTestLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">OAuth Token Debugger</h1>

      <div className="mb-6 p-4 bg-gray-100 rounded">
        <h2 className="text-lg font-semibold mb-2">Environment Variables</h2>
        {envInfo ? (
          <pre className="bg-gray-800 text-white p-3 rounded overflow-auto max-h-40">
            {JSON.stringify(envInfo, null, 2)}
          </pre>
        ) : (
          <p>Loading environment info...</p>
        )}
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Current Tokens</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-1">Access Token</label>
            <input
              type="text"
              value={
                accessToken ? `${accessToken.substring(0, 10)}...` : "Not set"
              }
              disabled
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-1">Refresh Token</label>
            <input
              type="text"
              value={
                refreshToken ? `${refreshToken.substring(0, 10)}...` : "Not set"
              }
              disabled
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-1">Token Expiry</label>
            <input
              type="text"
              value={
                tokenExpiry
                  ? new Date(parseInt(tokenExpiry)).toLocaleString()
                  : "Not set"
              }
              disabled
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <h2 className="text-lg font-semibold mb-2">Test Token Refresh</h2>
          <button
            onClick={handleTestRefresh}
            disabled={!refreshToken || loading}
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300"
          >
            {loading ? "Testing..." : "Test Refresh Token"}
          </button>

          {result && (
            <div className="mt-4">
              <h3 className="font-semibold mb-1">Result:</h3>
              <pre className="bg-gray-800 text-white p-3 rounded overflow-auto max-h-60">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="flex-1">
          <h2 className="text-lg font-semibold mb-2">
            Test Gmail API Directly
          </h2>
          <button
            onClick={handleDirectGmailTest}
            disabled={!accessToken || apiTestLoading}
            className="bg-green-500 text-white px-4 py-2 rounded disabled:bg-gray-300"
          >
            {apiTestLoading ? "Testing..." : "Test Gmail API"}
          </button>

          {apiTestResult && (
            <div className="mt-4">
              <h3 className="font-semibold mb-1">Result:</h3>
              <pre className="bg-gray-800 text-white p-3 rounded overflow-auto max-h-60">
                {JSON.stringify(apiTestResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Helpful Diagnostics</h2>
        <ul className="list-disc pl-5">
          <li>
            If environment variables show as present, they are properly loaded
            in the server.
          </li>
          <li>
            If refresh token test fails with "invalid_client", check your client
            ID and client secret.
          </li>
          <li>
            If access token test fails but you have an access token, it may be
            expired.
          </li>
          <li>
            Try re-authenticating through the login page if you consistently see
            errors.
          </li>
        </ul>
      </div>
    </div>
  );
}
