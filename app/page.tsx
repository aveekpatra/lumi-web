"use client";

import { useEffect, useState } from "react";
import { EmailClient } from "../components/email/EmailClient";

// Local storage keys
const STORAGE_KEYS = {
  AUTH_STATE: "lumi_email_auth_state",
};

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check localStorage first for token
        const token = localStorage.getItem("gmail_access_token");
        if (token) {
          setIsAuthenticated(true);
          // Save authentication state
          try {
            localStorage.setItem(STORAGE_KEYS.AUTH_STATE, "true");
          } catch (error) {
            console.error("Error saving auth state:", error);
          }
          setIsLoading(false);
          return;
        }

        // If no token in localStorage, check cookies
        const response = await fetch("/api/auth/token-provider");
        if (response.ok) {
          setIsAuthenticated(true);
          // Save authentication state
          try {
            localStorage.setItem(STORAGE_KEYS.AUTH_STATE, "true");
          } catch (error) {
            console.error("Error saving auth state:", error);
          }
        } else {
          // Clear authentication state
          try {
            localStorage.setItem(STORAGE_KEYS.AUTH_STATE, "false");
          } catch (error) {
            console.error("Error saving auth state:", error);
          }
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        // Clear authentication state on error
        try {
          localStorage.setItem(STORAGE_KEYS.AUTH_STATE, "false");
        } catch (error) {
          console.error("Error saving auth state:", error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    // Try to load auth state from localStorage first (for faster initial render)
    if (typeof window !== "undefined") {
      const savedAuthState = localStorage.getItem(STORAGE_KEYS.AUTH_STATE);
      if (savedAuthState === "true") {
        setIsAuthenticated(true);
      }
    }

    // Then verify with actual token check
    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-white flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Welcome to Lumi Email
          </h1>
          <p className="text-gray-600 mb-8">
            Please sign in with your Google account to continue
          </p>
          <a
            href="/api/auth/login"
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm inline-block"
          >
            Sign in with Google
          </a>
        </div>
      </div>
    );
  }

  return <EmailClient />;
}
