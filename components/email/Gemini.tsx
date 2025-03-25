"use client";

import { useState } from "react";
import { Email } from "@/types/email";
import { SparklesIcon } from "@heroicons/react/24/outline";

interface GeminiProps {
  emails: Email[];
  selectedEmail?: Email | null;
}

export function Gemini({ emails, selectedEmail }: GeminiProps) {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    try {
      // TODO: Implement Gemini API call here
      // For now, we'll simulate a response
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setResponse(
        "This is a placeholder response. The Gemini API integration will be implemented here."
      );
    } catch (error) {
      console.error("Error getting Gemini response:", error);
      setResponse("Sorry, there was an error processing your request.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-2">
          <SparklesIcon className="h-6 w-6 text-indigo-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            Gemini AI Assistant
          </h2>
        </div>
        <p className="text-sm text-gray-600">
          Ask questions about your emails or get AI-powered insights
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Selected Email Context */}
        {selectedEmail && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Selected Email
            </h3>
            <div className="text-sm text-gray-600">
              <p>
                <span className="font-medium">From:</span>{" "}
                {selectedEmail.fromName}
              </p>
              <p>
                <span className="font-medium">Subject:</span>{" "}
                {selectedEmail.subject}
              </p>
              <p className="mt-2 line-clamp-2">{selectedEmail.snippet}</p>
            </div>
          </div>
        )}

        {/* Email Stats */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            Email Overview
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Total Emails</p>
              <p className="font-medium text-gray-900">{emails.length}</p>
            </div>
            <div>
              <p className="text-gray-600">Unread</p>
              <p className="font-medium text-gray-900">
                {emails.filter((e) => !e.isRead).length}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Starred</p>
              <p className="font-medium text-gray-900">
                {emails.filter((e) => e.isStarred).length}
              </p>
            </div>
            <div>
              <p className="text-gray-600">With Attachments</p>
              <p className="font-medium text-gray-900">
                {emails.filter((e) => e.hasAttachments).length}
              </p>
            </div>
          </div>
        </div>

        {/* Gemini Chat Interface */}
        <div className="space-y-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask about your emails..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={isLoading || !prompt.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                "Ask"
              )}
            </button>
          </form>

          {/* Response Area */}
          {response && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="prose prose-sm max-w-none">{response}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
