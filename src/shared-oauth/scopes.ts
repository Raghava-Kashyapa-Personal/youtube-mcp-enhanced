/**
 * Centralized Google API scopes for all MCP services
 */

// Calendar API scopes
export const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
];

// YouTube API scopes
export const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/youtube.force-ssl',
  'https://www.googleapis.com/auth/youtube.readonly'
];

// Gmail API scopes
export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.readonly'
];

// Combined scopes for all services
export const ALL_GOOGLE_SCOPES = [
  ...CALENDAR_SCOPES,
  ...YOUTUBE_SCOPES,
  ...GMAIL_SCOPES
];

// Service-specific scope groups
export const SERVICE_SCOPES = {
  calendar: CALENDAR_SCOPES,
  youtube: YOUTUBE_SCOPES,
  gmail: GMAIL_SCOPES,
  all: ALL_GOOGLE_SCOPES
} as const;

export type GoogleService = keyof typeof SERVICE_SCOPES;