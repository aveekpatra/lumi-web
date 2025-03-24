"use client";

import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  Bars3Icon,
} from "@heroicons/react/24/outline";

interface TopBarProps {
  onSearch: (query: string) => void;
  onRefresh: () => void;
  isLoading?: boolean;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export function TopBar({
  onSearch,
  onRefresh,
  isLoading,
  onToggleSidebar,
  isSidebarOpen,
}: TopBarProps) {
  return (
    <div className="h-14 flex-shrink-0 bg-white border-b border-gray-200 flex items-center px-4 z-10 shadow-sm">
      <button
        onClick={onToggleSidebar}
        className={`p-1.5 hover:bg-gray-100 rounded-md text-gray-500 transition-colors ${
          isSidebarOpen ? "text-indigo-600" : ""
        }`}
      >
        <Bars3Icon className="h-5 w-5" />
      </button>

      <div className="flex-1 flex items-center mx-4">
        <div className="max-w-md w-full bg-gray-100 rounded-lg flex items-center px-3 py-1.5 focus-within:ring-2 focus-within:ring-indigo-200">
          <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Search mail..."
            className="flex-1 bg-transparent border-none focus:outline-none text-sm text-gray-700 placeholder-gray-400"
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
      </div>

      <button
        onClick={onRefresh}
        disabled={isLoading}
        className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-indigo-600"></div>
        ) : (
          <ArrowPathIcon className="h-5 w-5" />
        )}
      </button>
    </div>
  );
}
