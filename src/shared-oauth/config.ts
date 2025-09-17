import path from 'path';

export interface GoogleOAuthConfig {
  credentialsPath: string;
  tokensPath: string;
  redirectUri: string;
  accountMode: 'normal' | 'test';
}

/**
 * Default configuration for shared Google OAuth
 */
export const DEFAULT_CONFIG: GoogleOAuthConfig = {
  credentialsPath: process.env.GOOGLE_OAUTH_CREDENTIALS_PATH || '/root/google-calendar-mcp/gcp-oauth.keys.json',
  tokensPath: process.env.GOOGLE_OAUTH_TOKENS_PATH || '/app/oauth-tokens.json', // Service-specific path
  redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:3500/oauth2callback',
  accountMode: (process.env.GOOGLE_ACCOUNT_MODE as 'normal' | 'test') || 'normal'
};

/**
 * Get OAuth configuration with overrides
 */
export function getOAuthConfig(overrides?: Partial<GoogleOAuthConfig>): GoogleOAuthConfig {
  return {
    ...DEFAULT_CONFIG,
    ...overrides
  };
}

/**
 * Generate helpful error message for missing credentials
 */
export function generateCredentialsErrorMessage(credentialsPath: string): string {
  return `
Shared Google OAuth Configuration Required

Missing or invalid OAuth credentials file: ${credentialsPath}

Required format:
{
  "installed": {
    "client_id": "your-client-id.apps.googleusercontent.com",
    "client_secret": "your-client-secret",
    "project_id": "your-project-id",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "redirect_uris": ["http://localhost:3500/oauth2callback"]
  }
}

Setup Instructions:
1. Go to Google Cloud Console (console.cloud.google.com)
2. Enable required APIs: Calendar, YouTube Data API v3, Gmail
3. Create OAuth 2.0 credentials (or use existing from calendar-mcp)
4. Ensure these scopes are configured:
   - Calendar: https://www.googleapis.com/auth/calendar
   - YouTube: https://www.googleapis.com/auth/youtube
   - Gmail: https://www.googleapis.com/auth/gmail.modify

The shared OAuth system reuses existing calendar-mcp credentials.
`;
}