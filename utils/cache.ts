import { Email } from "@/types/email";

export interface EmailCache {
  emails: Email[];
  timestamp: string;
  nextPageToken?: string;
}

export interface SectionCache {
  [section: string]: EmailCache;
}

export interface CacheMetadata {
  version: string;
  lastUpdate: string;
}

const CACHE_VERSION = "1.0";
const DEFAULT_CACHE_AGE = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_AGE = 24 * 60 * 60 * 1000; // 24 hours

export function isCacheValid(
  timestamp: string,
  maxAge: number = DEFAULT_CACHE_AGE
): boolean {
  const cacheAge = new Date().getTime() - new Date(timestamp).getTime();
  return cacheAge < maxAge;
}

export function getCachedEmails(section: string): Email[] | null {
  try {
    const sectionCache = localStorage.getItem(`email_cache_${section}`);
    if (!sectionCache) return null;

    const cache: EmailCache = JSON.parse(sectionCache);
    if (!isCacheValid(cache.timestamp)) return null;

    return cache.emails;
  } catch (error) {
    console.error("[Cache] Error getting cached emails:", error);
    return null;
  }
}

export function cacheSectionEmails(
  section: string,
  emails: Email[],
  nextPageToken?: string
): void {
  try {
    const cache: EmailCache = {
      emails,
      timestamp: new Date().toISOString(),
      nextPageToken,
    };
    localStorage.setItem(`email_cache_${section}`, JSON.stringify(cache));
  } catch (error) {
    console.error("[Cache] Error caching emails:", error);
  }
}

export function updateCacheMetadata(): void {
  try {
    const metadata: CacheMetadata = {
      version: CACHE_VERSION,
      lastUpdate: new Date().toISOString(),
    };
    localStorage.setItem("email_cache_metadata", JSON.stringify(metadata));
  } catch (error) {
    console.error("[Cache] Error updating cache metadata:", error);
  }
}

export function cleanupOldCache(): void {
  try {
    const keys = Object.keys(localStorage);
    const now = new Date().getTime();

    keys.forEach((key) => {
      if (key.startsWith("email_cache_") && key !== "email_cache_metadata") {
        const cache = localStorage.getItem(key);
        if (cache) {
          const { timestamp } = JSON.parse(cache);
          const age = now - new Date(timestamp).getTime();
          if (age > MAX_CACHE_AGE) {
            localStorage.removeItem(key);
          }
        }
      }
    });
  } catch (error) {
    console.error("[Cache] Error cleaning up old cache:", error);
  }
}

export function clearAllCache(): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith("email_cache_")) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error("[Cache] Error clearing cache:", error);
  }
}

export function shouldRefreshCache(section: string): boolean {
  try {
    const sectionCache = localStorage.getItem(`email_cache_${section}`);
    if (!sectionCache) return true;

    const cache: EmailCache = JSON.parse(sectionCache);
    return !isCacheValid(cache.timestamp);
  } catch (error) {
    console.error("[Cache] Error checking cache refresh:", error);
    return true;
  }
}
