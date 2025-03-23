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
