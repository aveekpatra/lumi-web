"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Email, EmailSection } from "../../types/email";
import { fetchEmails, clearAllCache } from "../../utils/gmail";
import { EmailList } from "./EmailList";
import { Sidebar } from "./Sidebar";
import { Metrics } from "./Metrics";
import { Gemini } from "./Gemini";
import { TopBar } from "./TopBar";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

// Local storage keys
const STORAGE_KEYS = {
  SIDEBAR_OPEN: "lumi_email_sidebar_open",
  CURRENT_SECTION: "lumi_email_current_section",
};

export function EmailClient() {
  const [currentSection, setCurrentSection] = useState<EmailSection>("inbox");
  const [emails, setEmails] = useState<Email[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(true);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [hasMoreEmails, setHasMoreEmails] = useState(true);
  const [loadingMoreEmails, setLoadingMoreEmails] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Default to open for better UX
  const [isMetricsLoading, setIsMetricsLoading] = useState(false); // Special loading state for metrics
  const emailListRef = useRef<HTMLDivElement>(null);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

  // Load saved preferences from localStorage
  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return;

    try {
      // Load sidebar state preference
      const sidebarOpen = localStorage.getItem(STORAGE_KEYS.SIDEBAR_OPEN);
      if (sidebarOpen !== null) {
        setIsSidebarOpen(sidebarOpen === "true");
      }

      // Load current section preference
      const savedSection = localStorage.getItem(
        STORAGE_KEYS.CURRENT_SECTION
      ) as EmailSection | null;
      if (savedSection) {
        // If the saved section is "compose" or "done", default to "inbox" since we've removed those sections
        if (savedSection === "compose" || savedSection === "done") {
          setCurrentSection("inbox");
        } else {
          setCurrentSection(savedSection);
        }
      }
    } catch (error) {
      console.error("Error loading saved preferences:", error);
    }
  }, []);

  // Save sidebar state when it changes
  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(STORAGE_KEYS.SIDEBAR_OPEN, isSidebarOpen.toString());
    } catch (error) {
      console.error("Error saving sidebar state:", error);
    }
  }, [isSidebarOpen]);

  // Save current section when it changes
  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_SECTION, currentSection);
    } catch (error) {
      console.error("Error saving current section:", error);
    }
  }, [currentSection]);

  const loadEmails = useCallback(async () => {
    try {
      // Set appropriate loading state
      if (currentSection === "metrics") {
        setIsMetricsLoading(true);
      } else {
        setLoadingEmails(true);
      }

      setEmailError(null);

      // Fetch emails for the current section
      const response = await fetchEmails(currentSection);

      // Update state with the results
      setEmails(response.emails);
      setHasMoreEmails(!!response.nextPageToken);
      setLastRefreshTime(new Date());

      console.log(
        `[EmailClient] Loaded ${response.emails.length} emails for ${currentSection}`
      );

      if (currentSection === "metrics") {
        console.log(
          `[EmailClient] Total emails for metrics: ${response.emails.length}, estimated: ${response.resultSizeEstimate}`
        );
      }
    } catch (error) {
      console.error("[EmailClient] Error loading emails:", error);
      setEmailError(
        error instanceof Error ? error.message : "Failed to load emails"
      );
    } finally {
      // Clear loading states
      setLoadingEmails(false);
      if (currentSection === "metrics") {
        setIsMetricsLoading(false);
      }
    }
  }, [currentSection]);

  const loadMoreEmails = useCallback(async () => {
    if (loadingMoreEmails || !hasMoreEmails || emails.length === 0) {
      return;
    }

    try {
      setLoadingMoreEmails(true);

      // Get the last email ID for pagination
      const lastEmailId = emails[emails.length - 1].id;

      // Fetch the next page of emails
      const response = await fetchEmails(currentSection, lastEmailId);

      if (response.emails && response.emails.length > 0) {
        // Add new emails to the existing list
        setEmails((prev) => [...prev, ...response.emails]);
        console.log(
          `[EmailClient] Loaded ${response.emails.length} more emails`
        );
      } else {
        console.log("[EmailClient] No more emails to load");
      }

      // Update pagination state
      setHasMoreEmails(!!response.nextPageToken);
    } catch (error) {
      console.error("[EmailClient] Error loading more emails:", error);
      setEmailError(
        error instanceof Error ? error.message : "Failed to load more emails"
      );
    } finally {
      setLoadingMoreEmails(false);
    }
  }, [currentSection, emails, hasMoreEmails, loadingMoreEmails]);

  const handleRefresh = useCallback(async () => {
    try {
      // Clear the cache for the current section to force a fresh load
      clearAllCache();
      await loadEmails();
    } catch (error) {
      console.error("[EmailClient] Error refreshing emails:", error);
    }
  }, [loadEmails]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleSectionChange = useCallback((section: EmailSection) => {
    setCurrentSection(section);
    // Reset search query when changing sections
    setSearchQuery("");
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  // Load emails when the section changes
  useEffect(() => {
    loadEmails();
  }, [loadEmails, currentSection]);

  // Filter emails based on search query
  const filteredEmails = useMemo(() => {
    if (!searchQuery) return emails;

    const query = searchQuery.toLowerCase();
    return emails.filter((email) => {
      return (
        email.subject.toLowerCase().includes(query) ||
        email.fromName.toLowerCase().includes(query) ||
        email.fromEmail.toLowerCase().includes(query) ||
        email.snippet.toLowerCase().includes(query)
      );
    });
  }, [emails, searchQuery]);

  // Render the appropriate content based on current section
  const renderContent = () => {
    if (emailError) {
      return (
        <div className="p-8 bg-white rounded-lg shadow-sm m-4 text-center">
          <div className="text-red-500 mb-4">{emailError}</div>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }

    if (currentSection === "metrics") {
      return (
        <div className="flex-1 overflow-auto">
          {isMetricsLoading ? (
            <div className="p-8 flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-indigo-600 mb-4"></div>
                <p className="text-gray-500">
                  Loading all emails for metrics...
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  This may take a moment
                </p>
              </div>
            </div>
          ) : (
            <Metrics emails={emails} />
          )}
        </div>
      );
    }

    if (currentSection === "gemini") {
      return <Gemini emails={emails} selectedEmail={selectedEmail} />;
    }

    return (
      <EmailList
        emails={filteredEmails}
        loading={loadingEmails}
        error={emailError}
        hasMore={hasMoreEmails}
        loadingMore={loadingMoreEmails}
        onLoadMore={loadMoreEmails}
        lastRefreshTime={lastRefreshTime}
        ref={emailListRef}
      />
    );
  };

  return (
    <div className="flex flex-col h-screen bg-white font-sans antialiased text-gray-800">
      <TopBar
        onSearch={handleSearch}
        onRefresh={handleRefresh}
        isLoading={loadingEmails || isMetricsLoading}
        onToggleSidebar={toggleSidebar}
        isSidebarOpen={isSidebarOpen}
      />
      <div className="flex flex-1 overflow-hidden">
        <div
          className={`transition-all duration-300 ease-in-out ${
            isSidebarOpen ? "w-64" : "w-0"
          }`}
        >
          <Sidebar
            currentSection={currentSection}
            onSectionChange={handleSectionChange}
          />
        </div>
        <div className="flex-1 overflow-y-auto">{renderContent()}</div>
      </div>
    </div>
  );
}
