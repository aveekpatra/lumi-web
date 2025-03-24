"use client";

import { forwardRef, useEffect, useState } from "react";
import { Email } from "@/types/email";
import {
  CheckIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  ArchiveBoxXMarkIcon,
  FlagIcon,
  BellIcon,
  EllipsisHorizontalIcon,
  EnvelopeIcon,
  PencilSquareIcon,
  ViewColumnsIcon,
  TableCellsIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";

type ViewMode = "dense" | "comfy";

interface EmailListProps {
  emails: Email[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  lastRefreshTime: Date | null;
}

// Local storage keys
const STORAGE_KEYS = {
  VIEW_MODE: "lumi_email_view_mode",
};

export const EmailList = forwardRef<HTMLDivElement, EmailListProps>(
  (
    {
      emails,
      loading,
      error,
      hasMore,
      loadingMore,
      onLoadMore,
      lastRefreshTime,
    },
    ref
  ) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>("comfy");

    // Load saved preferences from localStorage
    useEffect(() => {
      // Only run on client side
      if (typeof window === "undefined") return;

      try {
        // Load view mode preference
        const savedViewMode = localStorage.getItem(
          STORAGE_KEYS.VIEW_MODE
        ) as ViewMode | null;
        if (
          savedViewMode &&
          (savedViewMode === "dense" || savedViewMode === "comfy")
        ) {
          setViewMode(savedViewMode);
        }
      } catch (error) {
        console.error("Error loading saved preferences:", error);
      }
    }, []);

    // Save preferences to localStorage when they change
    useEffect(() => {
      // Only run on client side
      if (typeof window === "undefined") return;

      try {
        localStorage.setItem(STORAGE_KEYS.VIEW_MODE, viewMode);
        console.log(`[EmailList] Saved view mode preference: ${viewMode}`);
      } catch (error) {
        console.error("Error saving preferences:", error);
      }
    }, [viewMode]);

    // Handle keyboard navigation
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (loading || error) return;

        switch (e.key) {
          case "j":
          case "ArrowDown":
            e.preventDefault();
            setSelectedIndex((prev) => Math.min(prev + 1, emails.length - 1));
            break;
          case "k":
          case "ArrowUp":
            e.preventDefault();
            setSelectedIndex((prev) => Math.max(prev - 1, 0));
            break;
          case "g":
            e.preventDefault();
            setSelectedIndex(0);
            break;
          case "G":
            e.preventDefault();
            setSelectedIndex(emails.length - 1);
            break;
          case "Enter":
          case "l":
            e.preventDefault();
            if (emails[selectedIndex]) {
              setSelectedEmail(emails[selectedIndex]);
            }
            break;
          case "h":
            e.preventDefault();
            setSelectedEmail(null);
            break;
          case "r":
            e.preventDefault();
            onLoadMore();
            break;
          case "?":
            e.preventDefault();
            // Show help modal
            console.log("Show help modal");
            break;
          case "m":
            e.preventDefault();
            // Mark as read/unread
            console.log("Toggle read status");
            break;
          case "s":
            e.preventDefault();
            // Star/unstar email
            console.log("Toggle star status");
            break;
          case "a":
            e.preventDefault();
            // Archive email
            console.log("Archive email");
            break;
          case "d":
            e.preventDefault();
            // Delete email
            console.log("Delete email");
            break;
          case "f":
            e.preventDefault();
            // Flag email
            console.log("Flag email");
            break;
          case "v":
            e.preventDefault();
            // Toggle view mode
            setViewMode(viewMode === "dense" ? "comfy" : "dense");
            break;
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [emails, loading, error, selectedIndex, onLoadMore, viewMode]);

    const toggleViewMode = () => {
      setViewMode(viewMode === "dense" ? "comfy" : "dense");
    };

    return (
      <>
        {/* Email List Header */}
        <div className="p-2 flex items-center gap-1 border-b border-gray-200 bg-white">
          <button className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500">
            <CheckIcon className="h-4 w-4" />
          </button>
          <button className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500">
            <ArrowUturnLeftIcon className="h-4 w-4" />
          </button>
          <button className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500">
            <ArrowUturnRightIcon className="h-4 w-4" />
          </button>
          <button
            className={`p-1.5 hover:bg-gray-100 rounded-md transition-colors ${
              viewMode === "comfy" ? "text-indigo-600" : "text-gray-500"
            }`}
            onClick={toggleViewMode}
            title={
              viewMode === "dense"
                ? "Switch to comfy view"
                : "Switch to dense view"
            }
          >
            {viewMode === "dense" ? (
              <Squares2X2Icon className="h-4 w-4" />
            ) : (
              <TableCellsIcon className="h-4 w-4" />
            )}
          </button>
          <div className="flex-1" />
          {lastRefreshTime && (
            <span className="text-xs text-gray-500">
              Last updated: {lastRefreshTime.toLocaleTimeString()}
            </span>
          )}
          <button className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500">
            <ArchiveBoxXMarkIcon className="h-4 w-4" />
          </button>
          <button className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500">
            <FlagIcon className="h-4 w-4" />
          </button>
          <button className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500">
            <BellIcon className="h-4 w-4" />
          </button>
          <button className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500">
            <EllipsisHorizontalIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Email List Content */}
        <div ref={ref} className="overflow-y-auto flex-1 min-h-0 bg-white">
          {loading && emails.length === 0 ? (
            <div className="p-8 text-gray-500 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-indigo-600 mx-auto mb-4"></div>
              <p>Loading emails...</p>
            </div>
          ) : error && emails.length === 0 ? (
            <div className="p-8 text-red-500 text-center">
              <p>{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-red-50 hover:bg-red-100 rounded-md text-red-600 text-sm transition-colors"
              >
                Retry
              </button>
            </div>
          ) : emails.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center p-8">
                <EnvelopeIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <div className="text-sm">No emails found</div>
              </div>
            </div>
          ) : (
            <>
              {emails.map((email, index) => (
                <div
                  key={email.id}
                  className={`flex items-start border-b border-gray-100 cursor-pointer group transition-colors ${
                    index === selectedIndex
                      ? "bg-indigo-50 border-l-4 border-l-indigo-600 pl-2"
                      : "hover:bg-gray-50 border-l-4 border-l-transparent pl-2"
                  } ${viewMode === "dense" ? "py-2 pr-3" : "py-4 pr-4"}`}
                  onClick={() => setSelectedIndex(index)}
                >
                  {/* Avatar */}
                  <div
                    className={`flex-shrink-0 ${
                      viewMode === "dense" ? "pr-2" : "pr-4"
                    }`}
                  >
                    <div
                      className={`flex items-center justify-center rounded-full bg-indigo-100 ${
                        viewMode === "dense" ? "w-6 h-6" : "w-8 h-8"
                      }`}
                    >
                      <span
                        className={`font-medium text-indigo-700 ${
                          viewMode === "dense" ? "text-xs" : "text-sm"
                        }`}
                      >
                        {email.fromName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {viewMode === "dense" ? (
                      <div className="flex items-center">
                        <span
                          className={`font-medium ${
                            !email.isRead ? "text-gray-900" : "text-gray-700"
                          } truncate mr-2`}
                        >
                          {email.fromName}
                        </span>
                        <span className="text-gray-700 truncate flex-1">
                          {email.subject}
                        </span>
                        <span className="ml-2 text-gray-400 text-xs whitespace-nowrap">
                          {new Date(email.date).toLocaleDateString()}
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center mb-1">
                          <span
                            className={`font-medium ${
                              !email.isRead ? "text-gray-900" : "text-gray-700"
                            } truncate mr-2`}
                          >
                            {email.fromName}
                          </span>
                          <span className="text-gray-500 text-sm">
                            {email.fromEmail}
                          </span>
                          <span className="ml-auto pl-4 text-gray-400 text-xs whitespace-nowrap">
                            {new Date(email.date).toLocaleDateString()}
                          </span>
                        </div>
                        <div
                          className={`${
                            !email.isRead
                              ? "text-gray-900 font-medium"
                              : "text-gray-700"
                          } truncate`}
                        >
                          {email.subject}
                        </div>
                        <div className="text-gray-500 text-sm truncate mt-1">
                          {email.snippet}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {hasMore && (
                <div className="p-4 text-center">
                  {loadingMore ? (
                    <div className="inline-flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-indigo-600 mr-2"></div>
                      <span className="text-gray-500 text-sm">
                        Loading more...
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={onLoadMore}
                      className="px-4 py-2 text-sm text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-md transition-colors"
                    >
                      Load more emails
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Email Detail View */}
        {selectedEmail && (
          <div className="fixed inset-0 bg-black/10 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-medium text-gray-900">
                  {selectedEmail.subject}
                </h2>
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <span className="text-sm">Press 'h' to close</span>
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                <div className="mb-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                      <span className="text-lg font-medium text-indigo-700">
                        {selectedEmail.fromName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {selectedEmail.fromName}
                      </div>
                      <div className="text-gray-500 text-sm">
                        {selectedEmail.fromEmail}
                      </div>
                    </div>
                    <div className="ml-auto text-gray-500 text-sm">
                      {new Date(selectedEmail.date).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="prose max-w-none text-gray-800">
                  {selectedEmail.snippet}
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }
);
