import { OAuth2Client, Credentials } from 'google-auth-library';
import * as fs from 'fs/promises';
import { GoogleOAuthConfig, getOAuthConfig, generateCredentialsErrorMessage } from './config.js';
import { SERVICE_SCOPES, GoogleService } from './scopes.js';

export interface OAuthCredentials {
  client_id: string;
  client_secret: string;
  redirect_uris: string[];
}

export class SharedGoogleOAuthClient {
  private config: GoogleOAuthConfig;
  private oauth2Client: OAuth2Client | null = null;
  private tokens: Credentials | null = null;

  constructor(config?: Partial<GoogleOAuthConfig>) {
    this.config = getOAuthConfig(config);
  }

  /**
   * Initialize the OAuth client with credentials
   */
  async initialize(): Promise<void> {
    if (this.oauth2Client) return; // Already initialized

    try {
      const credentials = await this.loadCredentials();

      this.oauth2Client = new OAuth2Client({
        clientId: credentials.client_id,
        clientSecret: credentials.client_secret,
        redirectUri: this.config.redirectUri
      });

      // Load existing tokens if available
      await this.loadTokens();

      // Set up token refresh
      if (this.tokens) {
        this.oauth2Client.setCredentials(this.tokens);
        this.setupTokenRefresh();
      }

    } catch (error) {
      throw new Error(`Failed to initialize OAuth client: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Get an authenticated OAuth2 client for a specific service
   */
  async getAuthenticatedClient(service: GoogleService = 'all'): Promise<OAuth2Client> {
    await this.initialize();

    if (!this.oauth2Client) {
      throw new Error('OAuth client not initialized');
    }

    if (!this.tokens) {
      throw new Error(`No OAuth tokens available. Please authenticate first using the auth flow for ${service} service.`);
    }

    // Verify we have the required scopes for this service
    const requiredScopes = SERVICE_SCOPES[service];
    const tokenScopes = this.tokens.scope?.split(' ') || [];

    const hasAllScopes = requiredScopes.every(scope =>
      tokenScopes.some(tokenScope => tokenScope.includes(scope))
    );

    if (!hasAllScopes) {
      throw new Error(`OAuth tokens missing required scopes for ${service}. Required: ${requiredScopes.join(', ')}`);
    }

    return this.oauth2Client;
  }

  /**
   * Generate OAuth authorization URL
   */
  async getAuthUrl(service: GoogleService = 'all'): Promise<string> {
    await this.initialize();

    if (!this.oauth2Client) {
      throw new Error('OAuth client not initialized');
    }

    const scopes = SERVICE_SCOPES[service];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent' // Force consent to ensure we get refresh token
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<Credentials> {
    await this.initialize();

    if (!this.oauth2Client) {
      throw new Error('OAuth client not initialized');
    }

    const { tokens } = await this.oauth2Client.getToken(code);

    // Save tokens
    this.tokens = tokens;
    this.oauth2Client.setCredentials(tokens);
    await this.saveTokens();

    this.setupTokenRefresh();

    return tokens;
  }

  /**
   * Check if we have valid tokens for a service
   */
  async hasValidTokens(service: GoogleService = 'all'): Promise<boolean> {
    try {
      await this.getAuthenticatedClient(service);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Load OAuth credentials from file
   */
  private async loadCredentials(): Promise<OAuthCredentials> {
    try {
      const keysContent = await fs.readFile(this.config.credentialsPath, 'utf-8');
      const keys = JSON.parse(keysContent);

      if (keys.installed) {
        const { client_id, client_secret, redirect_uris } = keys.installed;
        return { client_id, client_secret, redirect_uris };
      } else if (keys.client_id && keys.client_secret) {
        return {
          client_id: keys.client_id,
          client_secret: keys.client_secret,
          redirect_uris: keys.redirect_uris || [this.config.redirectUri]
        };
      } else {
        throw new Error('Invalid credentials file format');
      }
    } catch (error) {
      const errorMessage = generateCredentialsErrorMessage(this.config.credentialsPath);
      throw new Error(`${errorMessage}\n\nOriginal error: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Load tokens from file
   */
  private async loadTokens(): Promise<void> {
    try {
      const tokensContent = await fs.readFile(this.config.tokensPath, 'utf-8');
      this.tokens = JSON.parse(tokensContent);
    } catch {
      // No tokens file exists yet - this is normal for first run
      this.tokens = null;
    }
  }

  /**
   * Save tokens to file
   */
  private async saveTokens(): Promise<void> {
    if (this.tokens) {
      await fs.writeFile(this.config.tokensPath, JSON.stringify(this.tokens, null, 2));
    }
  }

  /**
   * Set up automatic token refresh
   */
  private setupTokenRefresh(): void {
    if (!this.oauth2Client) return;

    this.oauth2Client.on('tokens', async (tokens) => {
      if (tokens.refresh_token) {
        this.tokens = { ...this.tokens, ...tokens };
      } else {
        this.tokens = { ...this.tokens, ...tokens };
      }
      await this.saveTokens();
    });
  }
}