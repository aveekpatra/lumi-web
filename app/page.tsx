"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { fetchEmails } from "../utils/gmail";
import { refreshAccessToken } from "../utils/refreshToken";
import DOMPurify from "isomorphic-dompurify";
import {
  InboxIcon,
  PaperAirplaneIcon,
  StarIcon,
  TrashIcon,
  FolderIcon,
  Bars3Icon,
  MagnifyingGlassIcon,
  EllipsisVerticalIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArchiveBoxIcon,
  CheckIcon,
  ClockIcon,
  PaperClipIcon,
  EnvelopeIcon,
  ChatBubbleLeftIcon,
  DocumentTextIcon,
  PhotoIcon,
  VideoCameraIcon,
  ArrowPathIcon,
  EllipsisHorizontalIcon,
  PencilSquareIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  ArchiveBoxXMarkIcon,
  FlagIcon,
  BellIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { clearAllCache } from "../utils/cache";

interface Email {
  id: string;
  subject: string;
  from: string;
  fromName: string;
  fromEmail: string;
  to: string;
  date: string;
  bodyText: string;
  bodyHtml: string;
  isRead: boolean;
  isStarred: boolean;
  snippet: string;
  isArchived: boolean;
  isTrashed: boolean;
  isSnoozed: boolean;
  hasAttachments: boolean;
  isSent: boolean;
  isScheduled: boolean;
  isDraft: boolean;
  isSpam: boolean;
  isImportant: boolean;
  labelIds: string[];
}

// Add this type near the top of the file, after the Email interface
type Section =
  | "inbox"
  | "sent"
  | "scheduled"
  | "draft"
  | "all"
  | "spam"
  | "trash"
  | "starred"
  | "snoozed"
  | "important";

// Custom hook for localStorage state
function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        // Handle boolean values properly
        const parsedItem =
          typeof initialValue === "boolean"
            ? item === "true"
            : JSON.parse(item);
        console.log("[useLocalStorage] Loaded from localStorage:", parsedItem);
        setStoredValue(parsedItem);
      } else {
        console.log(
          "[useLocalStorage] No stored value, using initial:",
          initialValue
        );
        window.localStorage.setItem(key, JSON.stringify(initialValue));
      }
    } catch (error) {
      console.error(
        "[useLocalStorage] Error reading from localStorage:",
        error
      );
    }
  }, [key, initialValue]);

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = (value: T | ((prev: T) => T)) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;

      // Save state
      setStoredValue(valueToStore);

      // Save to localStorage
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
      console.log(`[useLocalStorage] Saved to localStorage:`, valueToStore);
    } catch (error) {
      console.error("[useLocalStorage] Error saving to localStorage:", error);
    }
  };

  return [storedValue, setValue];
}

// Add this function near the top of the file, after the imports
const getContrastColor = (element: HTMLElement) => {
  const style = window.getComputedStyle(element);
  const backgroundColor = style.backgroundColor;

  // If background is transparent or rgba with low opacity, default to light text
  if (
    backgroundColor === "transparent" ||
    backgroundColor === "rgba(0, 0, 0, 0)"
  ) {
    return "text-gray-300";
  }

  // Parse RGB values from background color
  const rgb = backgroundColor.match(/\d+/g)?.map(Number) || [0, 0, 0];

  // Calculate relative luminance
  const luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;

  // Return light text for dark backgrounds, dark text for light backgrounds
  return luminance > 0.5 ? "text-gray-900" : "text-gray-300";
};

export default function MailClient() {
  const router = useRouter();
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [sidebarOpen, setSidebarOpen] = useLocalStorage("sidebarOpen", true);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [mode, setMode] = useState<"normal" | "visual">("normal");
  const [searchFocused, setSearchFocused] = useState(false);
  const emailListRef = useRef<HTMLDivElement>(null);
  const emailRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [emails, setEmails] = useState<Email[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [currentSection, setCurrentSection] = useState<Section>("inbox");

  // Initialize email refs array
  useEffect(() => {
    emailRefs.current = emailRefs.current.slice(0, emails.length);
  }, [emails]);

  // Scroll selected email into view
  const scrollSelectedEmailIntoView = useCallback((index: number) => {
    const emailElement = emailRefs.current[index];
    if (emailElement && emailListRef.current) {
      const container = emailListRef.current;
      const elementRect = emailElement.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      // Check if element is not fully visible
      if (
        elementRect.bottom > containerRect.bottom ||
        elementRect.top < containerRect.top
      ) {
        // If element is below viewport, scroll it into view at the bottom
        if (elementRect.bottom > containerRect.bottom) {
          emailElement.scrollIntoView({ block: "end", behavior: "smooth" });
        }
        // If element is above viewport, scroll it into view at the top
        else if (elementRect.top < containerRect.top) {
          emailElement.scrollIntoView({ block: "start", behavior: "smooth" });
        }
      }
    }
  }, []);

  // Update scroll position when selected index changes
  useEffect(() => {
    scrollSelectedEmailIntoView(selectedIndex);
  }, [selectedIndex, scrollSelectedEmailIntoView]);

  // Update useEffect to fetch emails with caching
  useEffect(() => {
    const loadEmails = async () => {
      if (!isAuthenticated) return;

      try {
        setIsRefreshing(true);
        setLoadingEmails(true);
        setEmailError(null);

        console.log("[MailClient] Starting email fetch...");
        const fetchedEmails = await fetchEmails(currentSection);
        console.log(
          "[MailClient] Successfully fetched emails:",
          fetchedEmails.length
        );

        // Log detailed email information
        if (fetchedEmails.length > 0) {
          console.log("[MailClient] Email format details:", {
            totalEmails: fetchedEmails.length,
            sampleEmail: fetchedEmails[0],
            emailProperties: Object.keys(fetchedEmails[0]),
            labelIds: fetchedEmails[0].labelIds,
            allLabels: fetchedEmails.map((email) => ({
              id: email.id,
              subject: email.subject,
              labels: email.labelIds,
            })),
          });
        }

        setEmails(fetchedEmails);
        setLastRefreshTime(new Date());
        setEmailError(null);
      } catch (error) {
        console.error("[MailClient] Error loading emails:", error);
        setEmailError("Failed to load emails. Please try refreshing.");
      } finally {
        setLoadingEmails(false);
        setIsRefreshing(false);
      }
    };

    if (isAuthenticated && !isCheckingAuth) {
      loadEmails();
    }
  }, [isAuthenticated, isCheckingAuth, currentSection]);

  // Update getFilteredEmails to log filtering details
  const getFilteredEmails = () => {
    if (!emails) return [];

    const filteredEmails = emails.filter((email) => {
      const labelIds = email.labelIds || [];

      // Log the filtering process for the first few emails
      if (emails.indexOf(email) < 3) {
        console.log("[getFilteredEmails] Filtering email:", {
          id: email.id,
          subject: email.subject,
          labelIds: labelIds,
          section: currentSection,
          willShow: (() => {
            switch (currentSection) {
              case "inbox":
                return (
                  labelIds.includes("INBOX") &&
                  !labelIds.includes("ARCHIVE") &&
                  !labelIds.includes("TRASH") &&
                  !labelIds.includes("SPAM") &&
                  !labelIds.includes("DRAFT")
                );
              case "sent":
                return (
                  labelIds.includes("SENT") &&
                  !labelIds.includes("TRASH") &&
                  !labelIds.includes("SPAM")
                );
              case "scheduled":
                return (
                  labelIds.includes("SCHEDULED") &&
                  !labelIds.includes("TRASH") &&
                  !labelIds.includes("SPAM")
                );
              case "draft":
                return (
                  labelIds.includes("DRAFT") &&
                  !labelIds.includes("TRASH") &&
                  !labelIds.includes("SPAM")
                );
              case "all":
                return (
                  !labelIds.includes("TRASH") && !labelIds.includes("SPAM")
                );
              case "spam":
                return labelIds.includes("SPAM");
              case "trash":
                return labelIds.includes("TRASH");
              case "starred":
                return (
                  labelIds.includes("STARRED") &&
                  !labelIds.includes("TRASH") &&
                  !labelIds.includes("SPAM")
                );
              case "snoozed":
                return (
                  labelIds.includes("SNOOZED") &&
                  !labelIds.includes("TRASH") &&
                  !labelIds.includes("SPAM")
                );
              case "important":
                return (
                  labelIds.includes("IMPORTANT") &&
                  !labelIds.includes("TRASH") &&
                  !labelIds.includes("SPAM")
                );
              default:
                return true;
            }
          })(),
        });
      }

      switch (currentSection) {
        case "inbox":
          return (
            labelIds.includes("INBOX") &&
            !labelIds.includes("ARCHIVE") &&
            !labelIds.includes("TRASH") &&
            !labelIds.includes("SPAM") &&
            !labelIds.includes("DRAFT")
          );
        case "sent":
          return (
            labelIds.includes("SENT") &&
            !labelIds.includes("TRASH") &&
            !labelIds.includes("SPAM")
          );
        case "scheduled":
          return (
            labelIds.includes("SCHEDULED") &&
            !labelIds.includes("TRASH") &&
            !labelIds.includes("SPAM")
          );
        case "draft":
          return (
            labelIds.includes("DRAFT") &&
            !labelIds.includes("TRASH") &&
            !labelIds.includes("SPAM")
          );
        case "all":
          return !labelIds.includes("TRASH") && !labelIds.includes("SPAM");
        case "spam":
          return labelIds.includes("SPAM");
        case "trash":
          return labelIds.includes("TRASH");
        case "starred":
          return (
            labelIds.includes("STARRED") &&
            !labelIds.includes("TRASH") &&
            !labelIds.includes("SPAM")
          );
        case "snoozed":
          return (
            labelIds.includes("SNOOZED") &&
            !labelIds.includes("TRASH") &&
            !labelIds.includes("SPAM")
          );
        case "important":
          return (
            labelIds.includes("IMPORTANT") &&
            !labelIds.includes("TRASH") &&
            !labelIds.includes("SPAM")
          );
        default:
          return true;
      }
    });

    console.log(
      `[getFilteredEmails] Filtered ${emails.length} emails to ${filteredEmails.length} for section ${currentSection}`
    );
    return filteredEmails;
  };

  // Vim-style navigation handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts if search is focused
      if (searchFocused) return;

      const key = e.key.toLowerCase();
      const filteredEmails = getFilteredEmails();

      // Prevent default for our shortcuts
      if (
        [
          "j",
          "k",
          "g",
          "shift+g",
          "v",
          "y",
          "d",
          "u",
          "r",
          "f",
          "a",
          "s",
          "/",
        ].includes(key)
      ) {
        e.preventDefault();
      }

      switch (key) {
        // Navigation
        case "j": // Move down
          setSelectedIndex((prev) =>
            Math.min(prev + 1, filteredEmails.length - 1)
          );
          setSelectedEmail(
            filteredEmails[
              Math.min(selectedIndex + 1, filteredEmails.length - 1)
            ]
          );
          break;
        case "k": // Move up
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          setSelectedEmail(filteredEmails[Math.max(selectedIndex - 1, 0)]);
          break;
        case "g": // Go to top
          if (e.shiftKey) {
            // G - Go to bottom
            setSelectedIndex(filteredEmails.length - 1);
            setSelectedEmail(filteredEmails[filteredEmails.length - 1]);
          } else {
            // g - Go to top
            setSelectedIndex(0);
            setSelectedEmail(filteredEmails[0]);
          }
          break;

        // Mode switching
        case "v": // Visual mode
          setMode((prev) => (prev === "normal" ? "visual" : "normal"));
          break;

        // Actions
        case "y": // Star email
          if (selectedEmail) {
            toggleStarred(selectedEmail.id);
          }
          break;
        case "d": // Delete/Archive
          if (selectedEmail) {
            console.log("Archive email:", selectedEmail.id);
          }
          break;
        case "u": // Mark as unread
          if (selectedEmail) {
            console.log("Toggle unread:", selectedEmail.id);
          }
          break;
        case "r": // Reply
          if (selectedEmail) {
            console.log("Reply to:", selectedEmail.id);
          }
          break;
        case "f": // Forward
          if (selectedEmail) {
            console.log("Forward:", selectedEmail.id);
          }
          break;
        case "a": // Select all
          setSelectedEmails(emails.map((email) => email.id));
          break;
        case "s": // Toggle sidebar
          setSidebarOpen((prev) => !prev);
          break;
        case "/": // Focus search
          setSearchFocused(true);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedIndex,
    selectedEmail,
    mode,
    searchFocused,
    setSidebarOpen,
    getFilteredEmails,
  ]);

  // Update selected email when navigating
  useEffect(() => {
    setSelectedEmail(emails[selectedIndex]);
  }, [selectedIndex]);

  const toggleEmailSelection = (emailId: string) => {
    setSelectedEmails((prev) =>
      prev.includes(emailId)
        ? prev.filter((id) => id !== emailId)
        : [...prev, emailId]
    );
  };

  const toggleStarred = (emailId: string) => {
    // In a real app, this would update the backend
    console.log("Toggle starred:", emailId);
  };

  // Add refresh button handler
  const handleRefresh = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    setLoadingEmails(true);
    setEmailError(null);

    try {
      console.log("[MailClient] Manual refresh started...");
      const fetchedEmails = await fetchEmails(currentSection);
      console.log(
        "[MailClient] Successfully fetched emails:",
        fetchedEmails.length
      );

      const timestamp = new Date().toISOString();
      localStorage.setItem("cached_emails", JSON.stringify(fetchedEmails));
      localStorage.setItem("cached_emails_timestamp", timestamp);

      setEmails(fetchedEmails);
      setLastRefreshTime(new Date(timestamp));
      setEmailError(null);
    } catch (error) {
      console.error("[MailClient] Error refreshing emails:", error);
      setEmailError("Failed to refresh emails. Please try again.");
    } finally {
      setLoadingEmails(false);
      setIsRefreshing(false);
    }
  };

  // Update useEffect to check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log("[MailClient] Starting authentication check");

        // First check localStorage - simplified approach
        const accessToken = localStorage.getItem("gmail_access_token");
        const refreshToken = localStorage.getItem("gmail_refresh_token");

        if (accessToken) {
          console.log("[MailClient] Found token in localStorage");
          setIsAuthenticated(true);
          setIsCheckingAuth(false);
          return;
        }

        // Only check cookies if no localStorage tokens
        try {
          const cookieResponse = await fetch("/api/auth/token-provider");

          if (cookieResponse.ok) {
            const cookieData = await cookieResponse.json();
            if (cookieData.accessToken) {
              setIsAuthenticated(true);
              setIsCheckingAuth(false);
              return;
            }
          }
        } catch (cookieError) {
          console.error("[MailClient] Error checking cookies:", cookieError);
        }

        // No valid tokens found
        setIsAuthenticated(false);
        router.replace("/login");
      } catch (error) {
        console.error("[MailClient] Error checking auth:", error);
        setIsAuthenticated(false);
        router.replace("/login");
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, [router]);

  // Add login handler
  const handleLogin = () => {
    router.replace("/login");
  };

  // Update logout handler
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setIsAuthenticated(false);
      setEmails([]);
      clearAllCache(); // Clear all cached emails
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  // Function to sanitize HTML content - optimized for performance with proper character encoding
  const sanitizeHtml = (html: string) => {
    if (!html) return "";

    // Client-side only
    if (typeof window !== "undefined") {
      // Ensure proper character encoding
      const decodedHtml = html;

      // Limit content size to prevent crashes with extremely large emails
      const maxLength = 500000; // 500KB limit for rendering
      const truncatedHtml =
        decodedHtml.length > maxLength
          ? decodedHtml.substring(0, maxLength) +
            "... [Content truncated due to size]"
          : decodedHtml;

      // Use a try-catch to prevent crashes during sanitization
      try {
        return DOMPurify.sanitize(truncatedHtml, {
          USE_PROFILES: { html: true },
          ALLOWED_TAGS: [
            "a",
            "b",
            "br",
            "div",
            "p",
            "span",
            "img",
            "h1",
            "h2",
            "h3",
            "h4",
            "h5",
            "h6",
            "ul",
            "ol",
            "li",
            "blockquote",
            "pre",
            "code",
            "em",
            "strong",
            "del",
            "table",
            "thead",
            "tbody",
            "tr",
            "th",
            "td",
            "hr",
            "i",
            "u",
            "s",
          ],
          ALLOWED_ATTR: [
            "href",
            "target",
            "rel",
            "src",
            "alt",
            "title",
            "style",
            "class",
            "id",
            "width",
            "height",
            "charset",
            "lang",
            "xmlns", // Allow language and charset attributes
          ],
          FORBID_TAGS: [
            "script",
            "iframe",
            "object",
            "embed",
            "form",
            "input",
            "button",
          ],
          ADD_ATTR: ["target"],
          FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"],
          ALLOW_DATA_ATTR: false,
          WHOLE_DOCUMENT: false,
          RETURN_DOM: false,
          RETURN_DOM_FRAGMENT: false,
          // Don't strip special characters that might affect encoding
          ALLOW_UNKNOWN_PROTOCOLS: true,
        });
      } catch (error) {
        console.error("Error sanitizing HTML:", error);
        return `<p>Error displaying email content: ${error.message}</p>`;
      }
    }
    return "";
  };

  // Memoize the selected email to prevent unnecessary re-renders
  const memoizedSelectedEmail = useMemo(
    () => selectedEmail,
    [selectedEmail?.id]
  );

  // Optimize sanitization by memoizing it
  const sanitizedHtml = useMemo(() => {
    if (!selectedEmail?.bodyHtml) return "";
    return sanitizeHtml(selectedEmail.bodyHtml);
  }, [selectedEmail?.id, selectedEmail?.bodyHtml]);

  // Memoize filtered related emails for thread view
  const relatedEmails = useMemo(() => {
    if (!selectedEmail) return [];
    return emails.filter(
      (email) =>
        email.id !== selectedEmail.id &&
        (email.subject.includes(selectedEmail.subject) ||
          selectedEmail.subject.includes(email.subject) ||
          (email.subject.toLowerCase().startsWith("re:") &&
            email.subject.slice(3).trim() === selectedEmail.subject) ||
          (selectedEmail.subject.toLowerCase().startsWith("re:") &&
            selectedEmail.subject.slice(3).trim() === email.subject))
    );
  }, [emails, selectedEmail?.id, selectedEmail?.subject]);

  // Optimize the email list rendering with windowing
  const renderEmailList = useCallback(() => {
    return getFilteredEmails().map((email, index) => (
      <div
        key={email.id}
        ref={(el) => {
          emailRefs.current[index] = el;
        }}
        onClick={() => {
          setSelectedEmail(email);
          setSelectedIndex(index);
        }}
        className={`
          p-4 cursor-pointer transition-all duration-200 relative
          ${
            selectedEmail?.id === email.id
              ? "bg-blue-500/10"
              : "hover:bg-gray-800/30"
          }
          ${!email.isRead ? "font-semibold" : ""}
          group
        `}
      >
        <div
          className={`
          absolute left-0 top-0 bottom-0 w-0.5 transition-all duration-200
          ${selectedEmail?.id === email.id ? "bg-blue-500" : "bg-transparent"}
        `}
        />
        <div className="flex items-start gap-3">
          <div
            className={`
            flex-shrink-0 w-8 h-8 rounded-full 
            ${
              selectedEmail?.id === email.id
                ? "bg-gradient-to-br from-blue-500 to-blue-600"
                : "bg-gradient-to-br from-gray-700 to-gray-800 group-hover:from-gray-600 group-hover:to-gray-700"
            }
            flex items-center justify-center text-white font-semibold
            transition-all duration-200
          `}
          >
            {email.fromName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`
                  text-sm truncate
                  ${
                    selectedEmail?.id === email.id
                      ? "text-blue-200"
                      : "text-gray-300"
                  }
                `}
                >
                  {email.fromName}
                </span>
                {email.isStarred && (
                  <StarIcon className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                )}
              </div>
              <span className="text-xs text-gray-500 flex-shrink-0">
                {new Date(email.date).toLocaleDateString()}
              </span>
            </div>
            <div className="mt-1">
              <div
                className={`
                text-sm font-medium truncate
                ${
                  selectedEmail?.id === email.id
                    ? "text-blue-100"
                    : "text-gray-200"
                }
              `}
              >
                {email.subject}
              </div>
              <div className="text-xs text-gray-500 truncate mt-1">
                {email.snippet}
              </div>
            </div>
          </div>
        </div>
      </div>
    ));
  }, [emails, selectedEmail?.id, getFilteredEmails]);

  // Display loading or error states for emails
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col overflow-hidden font-sans antialiased text-gray-100">
      {/* Top Bar */}
      <div className="h-12 flex-shrink-0 bg-gray-900/80 backdrop-blur-xl flex items-center px-4 z-10 relative">
        <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 hover:bg-gray-800/50 rounded-lg text-gray-400 transition-colors duration-200"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold tracking-wider bg-gradient-to-r from-purple-400 via-fuchsia-500 to-purple-600 text-transparent bg-clip-text">
            LUMI MAIL
          </h1>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className={`
              p-1.5 rounded-lg text-gray-400
              ${isRefreshing ? "animate-spin" : "hover:bg-gray-800/50"}
              transition-colors duration-200
            `}
          >
            <ArrowPathIcon className="h-4 w-4" />
          </button>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-200 transition-colors duration-200 text-sm flex items-center gap-1"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <div
          className={`
            ${sidebarOpen ? "w-64" : "w-20"} 
            bg-gray-900/80 backdrop-blur-xl
            transition-all duration-300 ease-in-out
            flex flex-col
            relative
            flex-shrink-0
          `}
        >
          <div className="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-blue-500/50 to-transparent"></div>
          <div className="p-4 flex-shrink-0">
            <button
              className={`
                w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg 
                py-2 hover:from-blue-600 hover:to-blue-700
                transition-all duration-200
                flex items-center justify-center gap-2
                font-medium text-sm
                shadow-lg shadow-blue-500/20
                border border-blue-400/30
                ${sidebarOpen ? "px-4" : "px-2"}
              `}
            >
              <PencilSquareIcon className="h-4 w-4" />
              <span className={sidebarOpen ? "block" : "hidden"}>Compose</span>
            </button>
          </div>

          <nav className="mt-2 flex-1 overflow-y-auto">
            {[
              { icon: InboxIcon, label: "Inbox", section: "inbox" as Section },
              {
                icon: PaperAirplaneIcon,
                label: "Sent",
                section: "sent" as Section,
              },
              {
                icon: ClockIcon,
                label: "Scheduled",
                section: "scheduled" as Section,
              },
              {
                icon: DocumentTextIcon,
                label: "Drafts",
                section: "draft" as Section,
              },
              {
                icon: FolderIcon,
                label: "All Mail",
                section: "all" as Section,
              },
              {
                icon: ArchiveBoxXMarkIcon,
                label: "Spam",
                section: "spam" as Section,
              },
              { icon: TrashIcon, label: "Trash", section: "trash" as Section },
              {
                icon: StarIcon,
                label: "Starred",
                section: "starred" as Section,
              },
              {
                icon: ClockIcon,
                label: "Snoozed",
                section: "snoozed" as Section,
              },
              {
                icon: FlagIcon,
                label: "Important",
                section: "important" as Section,
              },
            ].map((item) => (
              <div
                key={item.label}
                onClick={() => {
                  setCurrentSection(item.section);
                  setSelectedIndex(0); // Reset selected index when changing sections
                  setSelectedEmail(null); // Clear selected email when changing sections
                }}
                className={`
                  px-3 py-2 mx-2 rounded-lg hover:bg-gray-800/50 cursor-pointer
                  transition-colors duration-200 border border-transparent hover:border-blue-500/20
                  flex items-center ${sidebarOpen ? "gap-3" : "justify-center"}
                  text-gray-300 font-medium text-sm
                  ${
                    currentSection === item.section
                      ? "bg-blue-500/10 border-blue-500/20"
                      : ""
                  }
                `}
              >
                <item.icon
                  className={`h-4 w-4 flex-shrink-0 ${
                    currentSection === item.section ? "text-blue-400" : ""
                  }`}
                />
                <span className={sidebarOpen ? "block" : "hidden"}>
                  {item.label}
                </span>
              </div>
            ))}
          </nav>
        </div>

        {/* Email List */}
        <div className="w-[400px] bg-gray-900/80 backdrop-blur-xl flex flex-col relative flex-shrink-0 overflow-hidden">
          <div className="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-blue-500/50 to-transparent"></div>

          {/* Search Bar */}
          <div className="p-2 relative flex-shrink-0">
            <div className="relative group">
              <input
                type="text"
                placeholder="Search in emails..."
                className="w-full bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-lg pl-9 pr-12 py-2 text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                <MagnifyingGlassIcon className="h-4 w-4 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
              </div>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500/20 blur-sm rounded-full group-focus-within:animate-pulse"></div>
                  <Image
                    src="/gemini-color.svg"
                    alt="Gemini"
                    width={16}
                    height={16}
                    className="relative opacity-50 group-focus-within:opacity-100 group-focus-within:scale-110 transition-all duration-200"
                  />
                </div>
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
          </div>

          {/* Email List Header */}
          <div className="p-2 flex items-center gap-1 relative flex-shrink-0">
            <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
            <button className="p-1.5 hover:bg-gray-800/50 rounded-lg text-gray-400">
              <CheckIcon className="h-4 w-4" />
            </button>
            <button className="p-1.5 hover:bg-gray-800/50 rounded-lg text-gray-400">
              <ArrowUturnLeftIcon className="h-4 w-4" />
            </button>
            <button className="p-1.5 hover:bg-gray-800/50 rounded-lg text-gray-400">
              <ArrowUturnRightIcon className="h-4 w-4" />
            </button>
            <div className="flex-1" />
            {lastRefreshTime && (
              <span className="text-xs text-gray-500">
                Last updated: {lastRefreshTime.toLocaleTimeString()}
              </span>
            )}
            <button className="p-1.5 hover:bg-gray-800/50 rounded-lg text-gray-400">
              <ArchiveBoxXMarkIcon className="h-4 w-4" />
            </button>
            <button className="p-1.5 hover:bg-gray-800/50 rounded-lg text-gray-400">
              <FlagIcon className="h-4 w-4" />
            </button>
            <button className="p-1.5 hover:bg-gray-800/50 rounded-lg text-gray-400">
              <BellIcon className="h-4 w-4" />
            </button>
            <button className="p-1.5 hover:bg-gray-800/50 rounded-lg text-gray-400">
              <EllipsisHorizontalIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Email List Content */}
          <div
            ref={emailListRef}
            className="overflow-y-auto flex-1 min-h-0 scrollbar-thin scrollbar-thumb-blue-500/30 scrollbar-track-transparent hover:scrollbar-thumb-blue-500/50"
          >
            {loadingEmails && getFilteredEmails().length === 0 ? (
              <div className="p-4 text-gray-400 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                <p>Loading emails...</p>
              </div>
            ) : emailError && getFilteredEmails().length === 0 ? (
              <div className="p-4 text-red-400 text-center">
                <p>{emailError}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-2 px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded text-sm"
                >
                  Retry
                </button>
              </div>
            ) : getFilteredEmails().length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <EnvelopeIcon className="h-12 w-12 mx-auto mb-2 text-gray-600" />
                  <div className="text-sm">No emails in {currentSection}</div>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-800/50">
                {getFilteredEmails().map((email, index) => (
                  <div
                    key={email.id}
                    ref={(el) => {
                      emailRefs.current[index] = el;
                    }}
                    onClick={() => {
                      setSelectedEmail(email);
                      setSelectedIndex(index);
                    }}
                    className={`
                      p-4 cursor-pointer transition-all duration-200 relative
                      ${
                        selectedEmail?.id === email.id
                          ? "bg-blue-500/10"
                          : "hover:bg-gray-800/30"
                      }
                      ${!email.isRead ? "font-semibold" : ""}
                      group
                    `}
                  >
                    <div
                      className={`
                      absolute left-0 top-0 bottom-0 w-0.5 transition-all duration-200
                      ${
                        selectedEmail?.id === email.id
                          ? "bg-blue-500"
                          : "bg-transparent"
                      }
                    `}
                    />
                    <div className="flex items-start gap-3">
                      <div
                        className={`
                        flex-shrink-0 w-8 h-8 rounded-full 
                        ${
                          selectedEmail?.id === email.id
                            ? "bg-gradient-to-br from-blue-500 to-blue-600"
                            : "bg-gradient-to-br from-gray-700 to-gray-800 group-hover:from-gray-600 group-hover:to-gray-700"
                        }
                        flex items-center justify-center text-white font-semibold
                        transition-all duration-200
                      `}
                      >
                        {email.fromName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`
                              text-sm truncate
                              ${
                                selectedEmail?.id === email.id
                                  ? "text-blue-200"
                                  : "text-gray-300"
                              }
                            `}
                            >
                              {email.fromName}
                            </span>
                            {email.isStarred && (
                              <StarIcon className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                            )}
                          </div>
                          <span className="text-xs text-gray-500 flex-shrink-0">
                            {new Date(email.date).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="mt-1">
                          <div
                            className={`
                            text-sm font-medium truncate
                            ${
                              selectedEmail?.id === email.id
                                ? "text-blue-100"
                                : "text-gray-200"
                            }
                          `}
                          >
                            {email.subject}
                          </div>
                          <div className="text-xs text-gray-500 truncate mt-1">
                            {email.snippet}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Email Content */}
        <div className="flex-1 bg-gray-900/80 backdrop-blur-xl flex flex-col min-h-0">
          {selectedEmail ? (
            <>
              {/* Email Content Header */}
              <div className="p-2 flex items-center gap-1 relative flex-shrink-0">
                <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
                <button className="p-1 hover:bg-gray-800/50 rounded-lg text-gray-400">
                  <CheckIcon className="h-3.5 w-3.5" />
                </button>
                <button className="p-1 hover:bg-gray-800/50 rounded-lg text-gray-400">
                  <ArrowUturnLeftIcon className="h-3.5 w-3.5" />
                </button>
                <button className="p-1 hover:bg-gray-800/50 rounded-lg text-gray-400">
                  <ArrowUturnRightIcon className="h-3.5 w-3.5" />
                </button>
                <div className="flex-1" />
                <button className="p-1 hover:bg-gray-800/50 rounded-lg text-gray-400">
                  <ArchiveBoxXMarkIcon className="h-3.5 w-3.5" />
                </button>
                <button className="p-1 hover:bg-gray-800/50 rounded-lg text-gray-400">
                  <FlagIcon className="h-3.5 w-3.5" />
                </button>
                <button className="p-1 hover:bg-gray-800/50 rounded-lg text-gray-400">
                  <BellIcon className="h-3.5 w-3.5" />
                </button>
                <button className="p-1 hover:bg-gray-800/50 rounded-lg text-gray-400">
                  <EllipsisHorizontalIcon className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Email Content Body */}
              <div className="flex-1 p-4 overflow-y-auto min-h-0">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-100">
                      {selectedEmail.subject}
                    </h2>
                    <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      <span className="font-medium text-gray-100">
                        {selectedEmail.fromName}
                      </span>
                      <span>&lt;{selectedEmail.fromEmail}&gt;</span>
                      <span className="text-gray-600">•</span>
                      <span>
                        {new Date(selectedEmail.date).toLocaleDateString()}{" "}
                        {new Date(selectedEmail.date).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      <span>To: {selectedEmail.to}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="p-1 hover:bg-gray-800/50 rounded-lg text-gray-400">
                      <StarIcon
                        className={`h-4 w-4 ${
                          selectedEmail.isStarred ? "text-yellow-500" : ""
                        }`}
                      />
                    </button>
                    <button className="p-1 hover:bg-gray-800/50 rounded-lg text-gray-400">
                      <ChatBubbleLeftIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Email Body Content */}
                <div className="mt-4 border-t border-gray-800 pt-4">
                  {memoizedSelectedEmail?.bodyHtml ? (
                    <div
                      className="break-words overflow-hidden bg-gray-800/30 rounded-lg p-4 overflow-x-auto"
                      lang="auto" // Auto-detect language
                    >
                      <div
                        dangerouslySetInnerHTML={{
                          __html: sanitizedHtml,
                        }}
                        className="[&_img]:max-w-full [&_img]:h-auto [&_pre]:whitespace-pre-wrap"
                        ref={(el) => {
                          if (el) {
                            // Wait for the content to be rendered
                            setTimeout(() => {
                              const elements = el.getElementsByTagName("*");
                              for (let i = 0; i < elements.length; i++) {
                                const element = elements[i] as HTMLElement;
                                // Only apply text color if element doesn't have a color style
                                if (!element.style.color) {
                                  element.classList.add(
                                    getContrastColor(element)
                                  );
                                }
                              }
                            }, 0);
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      className="whitespace-pre-wrap text-sm leading-relaxed text-gray-300 bg-gray-800/30 rounded-lg p-4
                               [&_a]:text-blue-400 [&_a]:underline
                               [&_pre]:whitespace-pre-wrap [&_pre]:bg-black/20 [&_pre]:p-2 [&_pre]:rounded [&_pre]:text-sm [&_pre]:text-gray-300
                               [&_code]:bg-black/20 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono [&_code]:text-gray-300
                               [&_blockquote]:border-l-4 [&_blockquote]:border-gray-600 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-400
                               [&_table]:border-collapse [&_table]:w-auto [&_table]:max-w-full
                               [&_td]:border [&_td]:border-gray-700 [&_td]:p-2 [&_td]:align-top [&_td]:text-gray-300
                               [&_th]:border [&_th]:border-gray-700 [&_th]:p-2 [&_th]:align-top [&_th]:text-gray-300"
                      lang="auto" // Auto-detect language
                    >
                      {memoizedSelectedEmail?.bodyText}
                    </div>
                  )}
                </div>

                {/* Thread View */}
                {relatedEmails.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-xs font-medium text-gray-300 mb-2 flex items-center gap-1.5">
                      <ChatBubbleLeftIcon className="h-3.5 w-3.5" />
                      Related messages in conversation ({relatedEmails.length})
                    </h3>
                    <div className="space-y-3">
                      {relatedEmails.map((relatedEmail) => (
                        <div
                          key={relatedEmail.id}
                          onClick={() => {
                            setSelectedEmail(relatedEmail);
                            setSelectedIndex(
                              emails.findIndex((e) => e.id === relatedEmail.id)
                            );
                          }}
                          className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/50 hover:border-blue-500/30 cursor-pointer transition-colors hover:-translate-y-0.5 duration-200"
                        >
                          <div className="flex justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs">
                                {relatedEmail.fromName.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-sm font-medium text-gray-300">
                                {relatedEmail.fromName}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(relatedEmail.date).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 truncate">
                            {relatedEmail.snippet}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attachments */}
                {selectedEmail.bodyText &&
                  selectedEmail.bodyText.includes("attachment") && (
                    <div className="mt-4 p-2 bg-gray-800/30 rounded-lg border border-gray-700/50">
                      <h3 className="text-xs font-medium text-gray-300 mb-1.5 flex items-center gap-1.5">
                        <PaperClipIcon className="h-3.5 w-3.5" />
                        Possible attachments mentioned
                      </h3>
                      <p className="text-xs text-gray-400">
                        This email mentions attachments, but they cannot be
                        displayed directly.
                      </p>
                    </div>
                  )}
              </div>

              {/* Email Content Footer */}
              <div className="p-2 flex items-center gap-1.5 relative flex-shrink-0">
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
                <button className="px-2 py-1 rounded-lg bg-gray-800/50 hover:bg-gray-800/70 text-gray-300 flex items-center gap-1 text-xs border border-blue-500/20 hover:border-blue-500/30">
                  <ArrowUturnLeftIcon className="h-3.5 w-3.5" />
                  Reply
                </button>
                <button className="px-2 py-1 rounded-lg bg-gray-800/50 hover:bg-gray-800/70 text-gray-300 flex items-center gap-1 text-xs border border-blue-500/20 hover:border-blue-500/30">
                  <ArrowUturnRightIcon className="h-3.5 w-3.5" />
                  Forward
                </button>
                <button className="p-1 hover:bg-gray-800/50 rounded-lg text-gray-400 border border-transparent hover:border-blue-500/20">
                  <EllipsisVerticalIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <EnvelopeIcon className="h-12 w-12 mx-auto mb-2 text-gray-600" />
                <div className="text-sm">Select an email to view</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
