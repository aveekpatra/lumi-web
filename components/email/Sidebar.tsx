"use client";

import { EmailSection } from "../../types/email";
import {
  InboxIcon,
  PencilSquareIcon,
  PaperAirplaneIcon,
  ArchiveBoxIcon,
  TrashIcon,
  FlagIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";

interface SidebarProps {
  currentSection: EmailSection;
  onSectionChange: (section: EmailSection) => void;
}

export function Sidebar({ currentSection, onSectionChange }: SidebarProps) {
  return (
    <div className="h-full bg-white border-r border-gray-200 flex flex-col overflow-hidden shadow-sm">
      <div className="p-4">
        <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
          <PencilSquareIcon className="h-4 w-4" />
          <span className="font-medium">Compose</span>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2">
        <div className="space-y-1">
          <button
            onClick={() => onSectionChange("inbox")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm ${
              currentSection === "inbox"
                ? "bg-indigo-50 text-indigo-700 font-medium"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <InboxIcon className="h-4 w-4 flex-shrink-0" />
            <span>Inbox</span>
          </button>
          <button
            onClick={() => onSectionChange("sent")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm ${
              currentSection === "sent"
                ? "bg-indigo-50 text-indigo-700 font-medium"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <PaperAirplaneIcon className="h-4 w-4 flex-shrink-0" />
            <span>Sent</span>
          </button>
          <button
            onClick={() => onSectionChange("archive")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm ${
              currentSection === "archive"
                ? "bg-indigo-50 text-indigo-700 font-medium"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <ArchiveBoxIcon className="h-4 w-4 flex-shrink-0" />
            <span>Archive</span>
          </button>
          <button
            onClick={() => onSectionChange("trash")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm ${
              currentSection === "trash"
                ? "bg-indigo-50 text-indigo-700 font-medium"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <TrashIcon className="h-4 w-4 flex-shrink-0" />
            <span>Trash</span>
          </button>
          <button
            onClick={() => onSectionChange("tracked")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm ${
              currentSection === "tracked"
                ? "bg-indigo-50 text-indigo-700 font-medium"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <FlagIcon className="h-4 w-4 flex-shrink-0" />
            <span>Tracked Mail</span>
          </button>
          <button
            onClick={() => onSectionChange("metrics")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm ${
              currentSection === "metrics"
                ? "bg-indigo-50 text-indigo-700 font-medium"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <ChartBarIcon className="h-4 w-4 flex-shrink-0" />
            <span>Metrics</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
