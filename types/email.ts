export type EmailSection =
  | "inbox"
  | "compose"
  | "sent"
  | "done"
  | "archive"
  | "trash"
  | "tracked"
  | "metrics";

export interface Email {
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
  isArchived: boolean;
  isTrashed: boolean;
  isSnoozed: boolean;
  hasAttachments: boolean;
  isSent: boolean;
  isDone: boolean;
  isTracked: boolean;
  labelIds: string[];
  snippet: string;
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
