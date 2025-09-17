/**
 * Shared Google OAuth Library
 *
 * This library provides a centralized OAuth client for all Google services
 * used across MCP services (Calendar, YouTube, Gmail, etc.)
 */

export { SharedGoogleOAuthClient } from './oauth-client.js';
export { SERVICE_SCOPES, CALENDAR_SCOPES, YOUTUBE_SCOPES, GMAIL_SCOPES, ALL_GOOGLE_SCOPES } from './scopes.js';
export { getOAuthConfig, DEFAULT_CONFIG } from './config.js';
export type { GoogleService } from './scopes.js';
export type { GoogleOAuthConfig } from './config.js';
export type { OAuthCredentials } from './oauth-client.js';

/**
 * Convenience function to create a shared OAuth client
 */
import { SharedGoogleOAuthClient } from './oauth-client.js';
import { GoogleOAuthConfig } from './config.js';

export function createSharedOAuthClient(config?: Partial<GoogleOAuthConfig>): SharedGoogleOAuthClient {
  return new SharedGoogleOAuthClient(config);
}

/**
 * Example usage:
 *
 * ```typescript
 * import { createSharedOAuthClient } from 'shared-google-oauth';
 *
 * const oauthClient = createSharedOAuthClient();
 *
 * // Check if authenticated for YouTube
 * const hasYouTubeAuth = await oauthClient.hasValidTokens('youtube');
 *
 * if (!hasYouTubeAuth) {
 *   const authUrl = await oauthClient.getAuthUrl('youtube');
 *   console.log('Visit:', authUrl);
 *   // ... handle auth flow
 * }
 *
 * // Get authenticated client for YouTube API
 * const authenticatedClient = await oauthClient.getAuthenticatedClient('youtube');
 *
 * // Use with googleapis
 * const youtube = google.youtube({ version: 'v3', auth: authenticatedClient });
 * ```
 */