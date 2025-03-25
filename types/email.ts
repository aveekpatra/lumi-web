export type EmailSection =
  | "inbox"
  | "compose"
  | "sent"
  | "done"
  | "archive"
  | "trash"
  | "tracked"
  | "metrics"
  | "all"
  | "gemini";

export interface Email {
  id: string;
  fromName: string;
  fromEmail: string;
  from?: string;
  to?: string;
  subject: string;
  snippet: string;
  date: string;
  bodyText?: string;
  bodyHtml?: string;
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
  isArchived: boolean;
  isTracked: boolean;
  isTrashed?: boolean;
  isSnoozed?: boolean;
  isSent?: boolean;
  isScheduled?: boolean;
  isDraft?: boolean;
  isSpam?: boolean;
  isImportant?: boolean;
  isDone?: boolean;
  labelIds?: string[];
  labels?: string[];
}

export interface EmailsResponse {
  emails: Email[];
  nextPageToken: string | null;
  resultSizeEstimate?: number;
}

export interface EmailCacheMetadata {
  timestamp: number;
  nextPageToken: string | null;
  totalEmails: number;
  resultSizeEstimate: number;
  isComplete: boolean;
}

// Legacy interface for backward compatibility
export interface EmailCacheDetails {
  timestamp: number;
  nextPageToken: string | null;
  emails: Email[];
}
