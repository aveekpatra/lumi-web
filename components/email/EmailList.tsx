"use client";

import { forwardRef, useEffect, useState, useMemo, useRef } from "react";
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
  ChevronDownIcon,
  ChevronRightIcon,
  TableCellsIcon,
  Squares2X2Icon,
  XMarkIcon,
  ArrowLeftIcon,
  TrashIcon,
  ArchiveBoxIcon,
  StarIcon,
  PrinterIcon,
} from "@heroicons/react/24/outline";
// Import ReplyIcon and ForwardIcon separately
import { ArrowUturnUpIcon as ReplyIcon } from "@heroicons/react/24/outline";
import { ArrowRightIcon as ForwardIcon } from "@heroicons/react/24/outline";

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

// Email conversation type for grouping related emails
interface EmailConversation {
  id: string;
  subject: string;
  baseSubject: string; // Subject without Re:, Fwd:, etc.
  emails: Email[];
  expanded: boolean;
  latestEmailDate: string;
}

// Function to normalize subject line by removing prefixes
function normalizeSubject(subject: string): string {
  return subject.replace(/^(re|fwd|fw|reply|返信|転送)(:\s*)+/i, "").trim();
}

// Format date string in a more readable way
function formatEmailDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  // Same day
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  // Yesterday
  else if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }
  // Within a week
  else if (now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString([], { weekday: "long" });
  }
  // Same year
  else if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }
  // Different year
  else {
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
}

// Format a date for display in the sidebar
const formatFullDate = (date: Date) => {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Replace the SimpleEmailView component with an enhanced version
const EnhancedEmailView = ({
  email,
  onClose,
  conversation,
  onPrevEmail,
  onNextEmail,
}: {
  email: Email;
  onClose: () => void;
  conversation: EmailConversation | null;
  onPrevEmail?: () => void;
  onNextEmail?: () => void;
}) => {
  if (!email) return null;

  return (
    <div className="fixed inset-0 bg-white z-50 flex overflow-hidden">
      {/* Left column - Email actions */}
      <div className="w-16 border-r border-gray-200 flex flex-col items-center pt-4 bg-gray-50">
        <button
          onClick={onClose}
          className="p-3 hover:bg-gray-200 rounded-full mb-6 text-gray-600"
          title="Close"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>

        <button
          onClick={onPrevEmail}
          disabled={!onPrevEmail}
          className={`p-3 ${
            onPrevEmail ? "hover:bg-gray-200 text-gray-600" : "text-gray-300"
          } rounded-full mb-3`}
          title="Previous Email"
        >
          <ArrowUturnLeftIcon className="h-5 w-5" />
        </button>

        <button
          onClick={onNextEmail}
          disabled={!onNextEmail}
          className={`p-3 ${
            onNextEmail ? "hover:bg-gray-200 text-gray-600" : "text-gray-300"
          } rounded-full mb-3`}
          title="Next Email"
        >
          <ArrowUturnRightIcon className="h-5 w-5" />
        </button>

        <div className="mt-auto pb-4 flex flex-col items-center">
          <button
            className="p-3 hover:bg-gray-200 rounded-full mb-3 text-gray-600"
            title="Archive"
          >
            <ArchiveBoxIcon className="h-5 w-5" />
          </button>
          <button
            className="p-3 hover:bg-gray-200 rounded-full mb-3 text-gray-600"
            title="Delete"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
          <button
            className="p-3 hover:bg-gray-200 rounded-full text-gray-600"
            title="Flag"
          >
            <FlagIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Middle column - Email content */}
      <div className="flex-1 overflow-y-auto">
        {/* Email header */}
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            {email.subject}
          </h1>
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center mr-3 flex-shrink-0">
              <span className="text-lg font-medium text-indigo-700">
                {email.fromName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <div className="font-medium text-gray-900">{email.fromName}</div>
              <div className="text-sm text-gray-600">{email.fromEmail}</div>
            </div>
            <div className="ml-auto text-sm text-gray-500">
              {formatFullDate(new Date(email.date))}
            </div>
          </div>
        </div>

        {/* Email body */}
        <div className="p-6">
          <div className="prose max-w-none text-gray-800">
            <p className="whitespace-pre-line">{email.snippet}</p>

            {/* Example email content */}
            <p>Hi there,</p>
            <p>
              This is the full content of the email. In a production
              environment, this would contain the complete HTML or text content
              of the message.
            </p>
            <p>
              The implementation is currently displaying placeholder content,
              but in a real application, the complete email would be retrieved
              from the server and rendered with proper formatting.
            </p>
            <p>
              Best regards,
              <br />
              {email.fromName}
            </p>
          </div>

          {/* Related messages in thread */}
          {conversation &&
            conversation.emails &&
            conversation.emails.length > 1 && (
              <div className="mt-10 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-medium mb-4">
                  Other messages in this conversation
                </h3>
                <div className="space-y-4">
                  {conversation.emails
                    .filter((e) => e && e.id !== email.id)
                    .map((relatedEmail) => (
                      <div
                        key={relatedEmail.id}
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-start mb-2">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mr-3 flex-shrink-0">
                            <span className="text-sm font-medium text-gray-600">
                              {relatedEmail.fromName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between">
                              <span className="font-medium text-gray-900">
                                {relatedEmail.fromName}
                              </span>
                              <span className="text-sm text-gray-500">
                                {formatEmailDate(relatedEmail.date)}
                              </span>
                            </div>
                            <p className="text-gray-600 text-sm mt-1 whitespace-pre-line">
                              {relatedEmail.snippet}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Right column - Contact info & metrics */}
      <div className="w-72 border-l border-gray-200 bg-gray-50 overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-medium text-gray-900 mb-3">Contact</h3>
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
              <span className="text-lg font-medium text-indigo-700">
                {email.fromName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <div className="font-medium text-gray-900">{email.fromName}</div>
              <div className="text-sm text-gray-600">{email.fromEmail}</div>
            </div>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex">
              <span className="text-gray-500 w-24">Email count:</span>
              <span className="text-gray-800">
                {conversation?.emails.length || 1}
              </span>
            </div>
            <div className="flex">
              <span className="text-gray-500 w-24">First contact:</span>
              <span className="text-gray-800">
                {conversation
                  ? formatEmailDate(
                      conversation.emails[conversation.emails.length - 1].date
                    )
                  : formatEmailDate(email.date)}
              </span>
            </div>
            <div className="flex">
              <span className="text-gray-500 w-24">Latest:</span>
              <span className="text-gray-800">
                {formatEmailDate(email.date)}
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 border-b border-gray-200">
          <h3 className="font-medium text-gray-900 mb-3">Email Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex">
              <span className="text-gray-500 w-24">Status:</span>
              <span
                className={`${
                  email.isRead ? "text-gray-600" : "text-indigo-600 font-medium"
                }`}
              >
                {email.isRead ? "Read" : "Unread"}
              </span>
            </div>
            {email.labels && email.labels.length > 0 && (
              <div className="flex">
                <span className="text-gray-500 w-24">Labels:</span>
                <div className="flex flex-wrap gap-1">
                  {email.labels.map((label) => (
                    <span
                      key={label}
                      className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex">
              <span className="text-gray-500 w-24">Received:</span>
              <span className="text-gray-800">
                {formatFullDate(new Date(email.date))}
              </span>
            </div>
          </div>
        </div>

        <div className="p-4">
          <h3 className="font-medium text-gray-900 mb-3">Actions</h3>
          <div className="space-y-2">
            <button className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md flex items-center justify-center">
              <ReplyIcon className="h-4 w-4 mr-2" />
              Reply
            </button>
            <button className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md flex items-center justify-center">
              <ForwardIcon className="h-4 w-4 mr-2" />
              Forward
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Avatar colors array
const AVATAR_COLORS = [
  "bg-pink-100 text-pink-700",
  "bg-purple-100 text-purple-700",
  "bg-indigo-100 text-indigo-700",
  "bg-blue-100 text-blue-700",
  "bg-green-100 text-green-700",
  "bg-yellow-100 text-yellow-700",
  "bg-red-100 text-red-700",
];

// Get avatar color based on name
const getAvatarColor = (name: string) => {
  const colorIndex = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[colorIndex];
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
    const [expandedConversations, setExpandedConversations] = useState<
      Record<string, boolean>
    >({});
    const [showFullScreen, setShowFullScreen] = useState(false);

    // Add ref for the selected email element
    const selectedEmailRef = useRef<HTMLDivElement>(null);

    // Group emails into conversations
    const conversations = useMemo(() => {
      const conversationMap = new Map<string, EmailConversation>();

      // First pass: group emails by normalized subject
      emails.forEach((email) => {
        const baseSubject = normalizeSubject(email.subject);
        const key = baseSubject.toLowerCase();

        if (!conversationMap.has(key)) {
          conversationMap.set(key, {
            id: key,
            subject: email.subject,
            baseSubject,
            emails: [],
            expanded: expandedConversations[key] || false,
            latestEmailDate: email.date,
          });
        }

        const conversation = conversationMap.get(key)!;
        conversation.emails.push(email);

        // Update latest date if this email is newer
        if (new Date(email.date) > new Date(conversation.latestEmailDate)) {
          conversation.latestEmailDate = email.date;
        }
      });

      // Sort emails within each conversation by date (newest first)
      conversationMap.forEach((conversation) => {
        conversation.emails.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
      });

      // Convert map to array and sort conversations by latest email date
      return Array.from(conversationMap.values()).sort(
        (a, b) =>
          new Date(b.latestEmailDate).getTime() -
          new Date(a.latestEmailDate).getTime()
      );
    }, [emails, expandedConversations]);

    // Find conversation by email ID
    const findConversationByEmailId = (emailId: string) => {
      for (const conversation of conversations) {
        const email = conversation.emails.find((e) => e.id === emailId);
        if (email) {
          return conversation;
        }
      }
      return null;
    };

    // Open email in full-screen view
    const openEmailFullScreen = (email: Email) => {
      if (!email) {
        console.error("Attempted to open undefined email");
        return;
      }

      setSelectedEmail(email);
      setShowFullScreen(true);
      document.body.style.overflow = "hidden";
    };

    // Close full-screen email view
    const closeEmailFullScreen = () => {
      setShowFullScreen(false);
      setSelectedEmail(null);
      document.body.style.overflow = "";
    };

    // Handle email selection
    const handleEmailSelect = (email: Email, index: number) => {
      setSelectedIndex(index);
      setSelectedEmail(email);
    };

    // Toggle conversation expanded state
    const toggleConversation = (conversationId: string) => {
      setExpandedConversations((prev) => ({
        ...prev,
        [conversationId]: !prev[conversationId],
      }));
    };

    // Handle double click on an email item
    const handleEmailDoubleClick = (email: Email) => {
      openEmailFullScreen(email);
    };

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

    // Function to scroll selected email into view
    const scrollSelectedIntoView = () => {
      if (selectedEmailRef.current) {
        selectedEmailRef.current.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    };

    // Effect to scroll selected email into view when selectedIndex changes
    useEffect(() => {
      scrollSelectedIntoView();
    }, [selectedIndex]);

    // Handle keyboard navigation
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (loading || error) return;

        // If full screen is open, handle Escape key to close it
        if (showFullScreen && e.key === "Escape") {
          e.preventDefault();
          closeEmailFullScreen();
          return;
        }

        switch (e.key) {
          case "j":
          case "ArrowDown":
            e.preventDefault();
            setSelectedIndex((prev) => {
              const newIndex = Math.min(prev + 1, conversations.length - 1);
              // If we're at the end and there are more emails to load, trigger load more
              if (
                newIndex === conversations.length - 1 &&
                hasMore &&
                !loadingMore
              ) {
                onLoadMore();
              }
              return newIndex;
            });
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
            setSelectedIndex(conversations.length - 1);
            break;
          case " ": // Space key
            e.preventDefault();
            if (conversations[selectedIndex]) {
              const conversation = conversations[selectedIndex];
              openEmailFullScreen(conversation.emails[0]); // Open the most recent email
            }
            break;
          case "Enter":
          case "l":
            e.preventDefault();
            if (conversations[selectedIndex]) {
              const conversation = conversations[selectedIndex];
              openEmailFullScreen(conversation.emails[0]); // Open the most recent email
            }
            break;
          case "h":
            e.preventDefault();
            if (showFullScreen) {
              closeEmailFullScreen();
            } else {
              setSelectedEmail(null);
            }
            break;
          case "r":
            e.preventDefault();
            onLoadMore();
            break;
          case "x":
            e.preventDefault();
            if (conversations[selectedIndex]) {
              toggleConversation(conversations[selectedIndex].id);
            }
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
    }, [
      conversations,
      loading,
      error,
      selectedIndex,
      onLoadMore,
      viewMode,
      showFullScreen,
      hasMore,
      loadingMore,
    ]);

    const toggleViewMode = () => {
      setViewMode(viewMode === "dense" ? "comfy" : "dense");
    };

    // Cleanup effect for body style when component unmounts
    useEffect(() => {
      return () => {
        document.body.style.overflow = "";
      };
    }, []);

    return (
      <div className="h-full flex flex-col">
        {/* Email List Header */}
        <div className="p-2 flex items-center gap-1 border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
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
        </div>

        {/* Email List Content */}
        <div
          ref={ref}
          className="flex-1 overflow-y-auto bg-white/80 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200/50 m-4"
        >
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-indigo-600 mb-4"></div>
                <p className="text-gray-500">Loading emails...</p>
              </div>
            </div>
          ) : error ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-red-500">{error}</div>
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
              {conversations.map((conversation, convIndex) => {
                const latestEmail = conversation.emails[0];
                const hasMultipleEmails = conversation.emails.length > 1;
                const avatarColors = getAvatarColor(latestEmail.fromName);

                return (
                  <div
                    key={conversation.id}
                    ref={convIndex === selectedIndex ? selectedEmailRef : null}
                    className={`${
                      convIndex === selectedIndex
                        ? "bg-[#f3f4f6]"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div
                      className={`flex items-center px-4 cursor-pointer ${
                        viewMode === "dense" ? "h-10 py-2" : "py-3"
                      }`}
                      onClick={() => handleEmailSelect(latestEmail, convIndex)}
                      onDoubleClick={() => handleEmailDoubleClick(latestEmail)}
                    >
                      {/* Checkbox (visible on hover or select) */}
                      <div
                        className={`flex-shrink-0 w-6 opacity-0 group-hover:opacity-100 ${
                          convIndex === selectedIndex ? "opacity-100" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="rounded border-gray-300"
                        />
                      </div>

                      {/* Status Indicators */}
                      <div className="flex items-center gap-1 w-6">
                        {!latestEmail.isRead && (
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                        )}
                      </div>

                      {/* Avatar - Only show in comfy mode */}
                      {viewMode !== "dense" && (
                        <div className="flex-shrink-0 mr-4">
                          <div
                            className={`w-10 h-10 rounded-full ${avatarColors} flex items-center justify-center`}
                          >
                            <span className="text-sm font-medium">
                              {latestEmail.fromName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Content */}
                      {viewMode === "dense" ? (
                        <>
                          {/* Sender Name - Fixed width */}
                          <div className="w-48 flex-shrink-0 pr-4">
                            <span
                              className={`text-sm truncate block ${
                                !latestEmail.isRead
                                  ? "font-semibold text-gray-900"
                                  : "text-gray-600"
                              }`}
                            >
                              {latestEmail.fromName}
                            </span>
                          </div>

                          {/* Subject and Preview */}
                          <div className="flex-1 min-w-0 flex items-center gap-2">
                            <span
                              className={`text-sm truncate ${
                                !latestEmail.isRead
                                  ? "font-semibold text-gray-900"
                                  : "text-gray-600"
                              }`}
                            >
                              {latestEmail.subject}
                            </span>
                            <span className="text-sm text-gray-500 truncate">
                              — {latestEmail.snippet}
                            </span>
                          </div>

                          {/* Thread Count */}
                          {hasMultipleEmails && (
                            <div className="flex-shrink-0 px-2">
                              <span className="text-xs text-gray-500">
                                ({conversation.emails.length})
                              </span>
                            </div>
                          )}

                          {/* Date */}
                          <div className="w-24 flex-shrink-0 text-right">
                            <span className="text-xs text-gray-500">
                              {formatEmailDate(latestEmail.date)}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="flex-1 min-w-0">
                          {/* Header row */}
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center min-w-0">
                              <span
                                className={`text-sm ${
                                  !latestEmail.isRead
                                    ? "font-semibold text-gray-900"
                                    : "text-gray-700"
                                } truncate`}
                              >
                                {latestEmail.fromName}
                              </span>
                              <span className="mx-2 text-gray-400">·</span>
                              <span className="text-sm text-gray-500 truncate">
                                {latestEmail.fromEmail}
                              </span>
                              {hasMultipleEmails && (
                                <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                                  {conversation.emails.length}
                                </span>
                              )}
                            </div>
                            <span className="ml-4 text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                              {formatEmailDate(latestEmail.date)}
                            </span>
                          </div>
                          {/* Subject line */}
                          <div
                            className={`text-sm ${
                              !latestEmail.isRead
                                ? "font-medium text-gray-900"
                                : "text-gray-700"
                            } truncate mb-1`}
                          >
                            {latestEmail.subject}
                          </div>
                          {/* Preview line */}
                          <div className="text-sm text-gray-500 truncate">
                            {latestEmail.snippet}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Expanded Conversation Items */}
                    {conversation.expanded && hasMultipleEmails && (
                      <div
                        className={`${
                          viewMode === "dense" ? "pl-16" : "pl-20"
                        } pr-4 pb-2`}
                      >
                        {conversation.emails.slice(1).map((email) => (
                          <div
                            key={email.id}
                            className={`flex items-center cursor-pointer hover:bg-gray-50 ${
                              viewMode === "dense" ? "h-10 py-2" : "py-3"
                            }`}
                            onClick={() => handleEmailSelect(email, convIndex)}
                            onDoubleClick={() => handleEmailDoubleClick(email)}
                          >
                            {viewMode === "dense" ? (
                              <>
                                <div className="w-48 flex-shrink-0 pr-4">
                                  <span
                                    className={`text-sm truncate block ${
                                      !email.isRead
                                        ? "font-semibold text-gray-900"
                                        : "text-gray-600"
                                    }`}
                                  >
                                    {email.fromName}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0 flex items-center gap-2">
                                  <span className="text-sm text-gray-500 truncate">
                                    {email.snippet}
                                  </span>
                                </div>
                                <div className="w-24 flex-shrink-0 text-right">
                                  <span className="text-xs text-gray-500">
                                    {formatEmailDate(email.date)}
                                  </span>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex-shrink-0 mr-4">
                                  <div
                                    className={`w-10 h-10 rounded-full ${avatarColors} flex items-center justify-center`}
                                  >
                                    <span className="text-sm font-medium">
                                      {email.fromName.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center min-w-0">
                                      <span
                                        className={`text-sm ${
                                          !email.isRead
                                            ? "font-semibold text-gray-900"
                                            : "text-gray-700"
                                        } truncate`}
                                      >
                                        {email.fromName}
                                      </span>
                                      <span className="mx-2 text-gray-400">
                                        ·
                                      </span>
                                      <span className="text-sm text-gray-500 truncate">
                                        {email.fromEmail}
                                      </span>
                                      {hasMultipleEmails && (
                                        <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                                          {conversation.emails.length}
                                        </span>
                                      )}
                                    </div>
                                    <span className="ml-4 text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                                      {formatEmailDate(email.date)}
                                    </span>
                                  </div>
                                  <div
                                    className={`text-sm ${
                                      !email.isRead
                                        ? "font-medium text-gray-900"
                                        : "text-gray-700"
                                    } truncate mb-1`}
                                  >
                                    {email.subject}
                                  </div>
                                  <div className="text-sm text-gray-500 truncate">
                                    {email.snippet}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Load More Button */}
              {hasMore && (
                <div className="p-4 text-center">
                  <button
                    onClick={onLoadMore}
                    disabled={loadingMore}
                    className="px-4 py-2 text-sm text-indigo-600 hover:text-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingMore ? "Loading..." : "Load More"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Full-screen Email View */}
        {selectedEmail && showFullScreen && (
          <EnhancedEmailView
            email={selectedEmail}
            onClose={closeEmailFullScreen}
            conversation={findConversationByEmailId(selectedEmail.id)}
            onPrevEmail={
              selectedIndex > 0
                ? () => {
                    const prevConversation = conversations[selectedIndex - 1];
                    if (prevConversation) {
                      handleEmailSelect(
                        prevConversation.emails[0],
                        selectedIndex - 1
                      );
                    }
                  }
                : undefined
            }
            onNextEmail={
              selectedIndex < conversations.length - 1
                ? () => {
                    const nextConversation = conversations[selectedIndex + 1];
                    if (nextConversation) {
                      handleEmailSelect(
                        nextConversation.emails[0],
                        selectedIndex + 1
                      );
                    }
                  }
                : undefined
            }
          />
        )}
      </div>
    );
  }
);

EmailList.displayName = "EmailList";
