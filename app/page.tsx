"use client";

import { useState, useEffect } from "react";
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
} from "@heroicons/react/24/outline";

interface Email {
  id: number;
  sender: string;
  subject: string;
  preview: string;
  time: string;
  unread: boolean;
  starred: boolean;
  hasAttachments: boolean;
  isImportant: boolean;
}

const mockEmails: Email[] = [
  {
    id: 1,
    sender: "GitHub",
    subject: "[lumi-web] New pull request: Add dark mode support",
    preview:
      "aveekpatra opened a pull request in lumi-web/frontend #143: Add system-wide dark mode support with user preferences...",
    time: "11:23 AM",
    unread: true,
    starred: true,
    hasAttachments: false,
    isImportant: true,
  },
  {
    id: 2,
    sender: "Vercel Team",
    subject: "Your deployment is now ready",
    preview:
      "✨ Deployment completed: lumi-web-git-main-aveekpatra.vercel.app. View your deployment here...",
    time: "10:45 AM",
    unread: true,
    starred: false,
    hasAttachments: false,
    isImportant: false,
  },
  {
    id: 3,
    sender: "Alex Thompson",
    subject: "Design Review Meeting Notes",
    preview:
      "Hi team, Attached are the notes from today's design review meeting. Key points: 1. Updated color palette 2. New component library...",
    time: "9:30 AM",
    unread: true,
    starred: false,
    hasAttachments: true,
    isImportant: true,
  },
  {
    id: 4,
    sender: "AWS Billing",
    subject: "Your AWS Invoice for May 2024",
    preview:
      "Your invoice for AWS services used between May 1, 2024 and May 31, 2024 is now available. Total amount: $127.84...",
    time: "8:15 AM",
    unread: false,
    starred: false,
    hasAttachments: true,
    isImportant: false,
  },
  {
    id: 5,
    sender: "Sarah Chen",
    subject: "Re: Frontend Performance Optimization",
    preview:
      "I've implemented the suggested changes for code splitting and lazy loading. The bundle size is now reduced by 45%. Here's the comparison...",
    time: "Yesterday",
    unread: false,
    starred: true,
    hasAttachments: true,
    isImportant: true,
  },
  {
    id: 6,
    sender: "npm Security",
    subject: "Security Alert: High Severity Vulnerability",
    preview:
      "We found a high severity vulnerability affecting one or more of your dependencies: react-markdown@4.3.1. Recommended action...",
    time: "Yesterday",
    unread: true,
    starred: false,
    hasAttachments: false,
    isImportant: true,
  },
  {
    id: 7,
    sender: "Product Updates",
    subject: "May 2024 Product Roadmap",
    preview:
      "Here's our product roadmap for the upcoming quarter. Key features: 1. Real-time collaboration 2. Enhanced search functionality...",
    time: "May 20",
    unread: false,
    starred: true,
    hasAttachments: true,
    isImportant: false,
  },
  {
    id: 8,
    sender: "CI/CD Pipeline",
    subject: "[FAILED] Main Branch Build #892",
    preview:
      "❌ Build failed in main branch. Error: Test suite failed in authentication module. View detailed logs...",
    time: "May 19",
    unread: false,
    starred: false,
    hasAttachments: false,
    isImportant: true,
  },
  {
    id: 9,
    sender: "Michael Rodriguez",
    subject: "Updated API Documentation",
    preview:
      "Team, I've updated our API documentation with the new endpoints. Please review the changes at docs.lumi-web.dev/api/v2...",
    time: "May 18",
    unread: false,
    starred: false,
    hasAttachments: false,
    isImportant: false,
  },
  {
    id: 10,
    sender: "HR Department",
    subject: "Reminder: Quarterly Team Building Event",
    preview:
      "Just a reminder about our upcoming virtual team building event on Friday. Please fill out the preference form by EOD...",
    time: "May 17",
    unread: false,
    starred: false,
    hasAttachments: true,
    isImportant: false,
  },
];

export default function MailClient() {
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedEmails, setSelectedEmails] = useState<number[]>([]);
  const [mode, setMode] = useState<"normal" | "visual">("normal");
  const [searchFocused, setSearchFocused] = useState(false);

  // Vim-style navigation handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts if search is focused
      if (searchFocused) return;

      const key = e.key.toLowerCase();

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
          setSelectedIndex((prev) => Math.min(prev + 1, mockEmails.length - 1));
          setSelectedEmail(
            mockEmails[Math.min(selectedIndex + 1, mockEmails.length - 1)]
          );
          break;
        case "k": // Move up
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          setSelectedEmail(mockEmails[Math.max(selectedIndex - 1, 0)]);
          break;
        case "g": // Go to top
          if (e.shiftKey) {
            // G - Go to bottom
            setSelectedIndex(mockEmails.length - 1);
            setSelectedEmail(mockEmails[mockEmails.length - 1]);
          } else {
            // g - Go to top
            setSelectedIndex(0);
            setSelectedEmail(mockEmails[0]);
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
          setSelectedEmails(mockEmails.map((email) => email.id));
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
  }, [selectedIndex, selectedEmail, mode, searchFocused]);

  // Update selected email when navigating
  useEffect(() => {
    setSelectedEmail(mockEmails[selectedIndex]);
  }, [selectedIndex]);

  const toggleEmailSelection = (emailId: number) => {
    setSelectedEmails((prev) =>
      prev.includes(emailId)
        ? prev.filter((id) => id !== emailId)
        : [...prev, emailId]
    );
  };

  const toggleStarred = (emailId: number) => {
    // In a real app, this would update the backend
    console.log("Toggle starred:", emailId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col overflow-hidden font-sans antialiased text-gray-100">
      {/* Top Bar */}
      <div className="h-12 bg-gray-900/80 backdrop-blur-xl flex items-center px-4 z-10 relative">
        <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 hover:bg-gray-800/50 rounded-lg text-gray-400"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>
          <div className="relative">
            <input
              type="text"
              placeholder="Search emails... (Press / to focus)"
              className="w-64 px-4 py-1.5 pl-10 rounded-lg bg-gray-800/50 focus:bg-gray-800/70 border border-gray-700/50 focus:border-blue-500/30 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 text-gray-100 placeholder-gray-500 text-sm"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            <MagnifyingGlassIcon className="absolute left-3 top-1.5 h-4 w-4 text-gray-500" />
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <button className="p-1.5 hover:bg-gray-800/50 rounded-lg text-gray-400">
            <ArrowPathIcon className="h-4 w-4" />
          </button>
          <button className="p-1.5 hover:bg-gray-800/50 rounded-lg text-gray-400">
            <EllipsisVerticalIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div
          className={`
            ${sidebarOpen ? "w-64" : "w-20"} 
            bg-gray-900/80 backdrop-blur-xl
            transition-all duration-300 ease-in-out
            flex flex-col
            relative
          `}
        >
          <div className="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-blue-500/50 to-transparent"></div>
          <div className="p-4">
            <button
              className="
                w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg 
                py-2 px-4 hover:from-blue-600 hover:to-blue-700
                transition-all duration-200
                flex items-center justify-center gap-2
                font-medium text-sm
                shadow-lg shadow-blue-500/20
                border border-blue-400/30
              "
            >
              <PencilSquareIcon className="h-4 w-4" />
              <span className={sidebarOpen ? "block" : "hidden"}>Compose</span>
            </button>
          </div>

          <nav className="mt-2 flex-1">
            <div className="px-3 py-2 mx-2 rounded-lg hover:bg-gray-800/50 cursor-pointer flex items-center gap-3 text-gray-300 font-medium text-sm transition-colors duration-200 border border-transparent hover:border-blue-500/20">
              <InboxIcon className="h-4 w-4" />
              <span className={sidebarOpen ? "block" : "hidden"}>Inbox</span>
            </div>
            <div className="px-3 py-2 mx-2 rounded-lg hover:bg-gray-800/50 cursor-pointer flex items-center gap-3 text-gray-300 font-medium text-sm transition-colors duration-200 border border-transparent hover:border-blue-500/20">
              <StarIcon className="h-4 w-4" />
              <span className={sidebarOpen ? "block" : "hidden"}>Starred</span>
            </div>
            <div className="px-3 py-2 mx-2 rounded-lg hover:bg-gray-800/50 cursor-pointer flex items-center gap-3 text-gray-300 font-medium text-sm transition-colors duration-200 border border-transparent hover:border-blue-500/20">
              <ClockIcon className="h-4 w-4" />
              <span className={sidebarOpen ? "block" : "hidden"}>Snoozed</span>
            </div>
            <div className="px-3 py-2 mx-2 rounded-lg hover:bg-gray-800/50 cursor-pointer flex items-center gap-3 text-gray-300 font-medium text-sm transition-colors duration-200 border border-transparent hover:border-blue-500/20">
              <PaperClipIcon className="h-4 w-4" />
              <span className={sidebarOpen ? "block" : "hidden"}>
                Attachments
              </span>
            </div>
            <div className="px-3 py-2 mx-2 rounded-lg hover:bg-gray-800/50 cursor-pointer flex items-center gap-3 text-gray-300 font-medium text-sm transition-colors duration-200 border border-transparent hover:border-blue-500/20">
              <ArchiveBoxIcon className="h-4 w-4" />
              <span className={sidebarOpen ? "block" : "hidden"}>Archive</span>
            </div>
            <div className="px-3 py-2 mx-2 rounded-lg hover:bg-gray-800/50 cursor-pointer flex items-center gap-3 text-gray-300 font-medium text-sm transition-colors duration-200 border border-transparent hover:border-blue-500/20">
              <TrashIcon className="h-4 w-4" />
              <span className={sidebarOpen ? "block" : "hidden"}>Trash</span>
            </div>
          </nav>
        </div>

        {/* Email List */}
        <div className="w-[400px] bg-gray-900/80 backdrop-blur-xl flex flex-col relative">
          <div className="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-blue-500/50 to-transparent"></div>
          {/* Email List Header */}
          <div className="p-2 flex items-center gap-1 relative">
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
          <div className="overflow-y-auto flex-1">
            {mockEmails.map((email, index) => (
              <div
                key={email.id}
                className={`
                  p-3 relative
                  hover:bg-gray-800/30 cursor-pointer
                  transition-all duration-150
                  ${email.unread ? "bg-blue-900/20" : ""}
                  ${
                    selectedIndex === index
                      ? "bg-blue-900/30 border-l-2 border-l-blue-500"
                      : ""
                  }
                  ${
                    mode === "visual" && selectedEmails.includes(email.id)
                      ? "bg-blue-900/40"
                      : ""
                  }
                `}
                onClick={() => {
                  setSelectedIndex(index);
                  setSelectedEmail(email);
                }}
              >
                <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"></div>
                <div className="flex items-start gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleEmailSelection(email.id);
                    }}
                    className="p-1 hover:bg-gray-800/50 rounded-lg"
                  >
                    <CheckIcon
                      className={`h-3.5 w-3.5 ${
                        selectedEmails.includes(email.id)
                          ? "text-blue-400"
                          : "text-gray-500"
                      }`}
                    />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStarred(email.id);
                    }}
                    className="p-1 hover:bg-gray-800/50 rounded-lg"
                  >
                    <StarIcon
                      className={`h-3.5 w-3.5 ${
                        email.starred
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-gray-500"
                      }`}
                    />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div className="font-medium text-gray-100 truncate text-sm">
                        {email.sender}
                      </div>
                      <div className="text-xs text-gray-400 ml-2">
                        {email.time}
                      </div>
                    </div>
                    <div className="font-medium text-gray-100 mt-0.5 truncate text-sm">
                      {email.subject}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 truncate flex items-center gap-1">
                      {email.hasAttachments && (
                        <PaperClipIcon className="h-3.5 w-3.5" />
                      )}
                      {email.isImportant && (
                        <FlagIcon className="h-3.5 w-3.5 text-yellow-400" />
                      )}
                      <span className="truncate">{email.preview}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Email Content */}
        <div className="flex-1 bg-gray-900/80 backdrop-blur-xl flex flex-col">
          {selectedEmail ? (
            <>
              {/* Email Content Header */}
              <div className="p-3 flex items-center gap-1 relative">
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

              {/* Email Content Body */}
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-100">
                      {selectedEmail.subject}
                    </h2>
                    <div className="text-sm text-gray-400 mt-0.5 flex items-center gap-1">
                      <span className="font-medium text-gray-100">
                        {selectedEmail.sender}
                      </span>
                      <span className="text-gray-600">•</span>
                      <span>{selectedEmail.time}</span>
                    </div>
                  </div>
                </div>
                <div className="prose prose-invert max-w-none">
                  <p className="text-sm leading-relaxed text-gray-300">
                    {selectedEmail.preview}
                  </p>
                </div>
              </div>

              {/* Email Content Footer */}
              <div className="p-3 flex items-center gap-2 relative">
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
                <button className="px-3 py-1.5 rounded-lg bg-gray-800/50 hover:bg-gray-800/70 text-gray-300 flex items-center gap-1.5 text-sm border border-blue-500/20 hover:border-blue-500/30">
                  <ArrowUturnLeftIcon className="h-4 w-4" />
                  Reply
                </button>
                <button className="px-3 py-1.5 rounded-lg bg-gray-800/50 hover:bg-gray-800/70 text-gray-300 flex items-center gap-1.5 text-sm border border-blue-500/20 hover:border-blue-500/30">
                  <ArrowUturnRightIcon className="h-4 w-4" />
                  Forward
                </button>
                <button className="p-1.5 hover:bg-gray-800/50 rounded-lg text-gray-400 border border-transparent hover:border-blue-500/20">
                  <EllipsisVerticalIcon className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="text-4xl mb-2">📨</div>
                <div className="text-sm">Select an email to view</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Keyboard Shortcuts Help (Press ? to toggle) */}
      <div className="fixed bottom-4 right-4 text-xs text-gray-400 bg-gray-900/90 p-3 rounded-lg border border-gray-800">
        <div className="font-medium mb-1">Keyboard Shortcuts:</div>
        <div>j/k - Navigate emails</div>
        <div>g/G - Go to top/bottom</div>
        <div>v - Visual mode</div>
        <div>y - Star email</div>
        <div>d - Archive</div>
        <div>u - Mark unread</div>
        <div>r - Reply</div>
        <div>f - Forward</div>
        <div>a - Select all</div>
        <div>s - Toggle sidebar</div>
        <div>/ - Focus search</div>
      </div>
    </div>
  );
}
