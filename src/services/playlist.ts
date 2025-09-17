import { google } from 'googleapis';
import { PlaylistParams, PlaylistItemsParams, SearchParams } from '../types.js';
import { createSharedOAuthClient } from '../shared-oauth/index.js';

/**
 * Service for interacting with YouTube playlists
 * Supports both read (API key) and write (OAuth) operations
 */
export class PlaylistService {
  private youtube;
  private youtubeWithOAuth;
  private initialized = false;
  private oauthClient = createSharedOAuthClient();

  constructor() {
    // Don't initialize in constructor
  }

  /**
   * Initialize the YouTube client for read operations (API key)
   */
  private initialize() {
    if (this.initialized) return;

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      throw new Error('YOUTUBE_API_KEY environment variable is not set.');
    }

    this.youtube = google.youtube({
      version: "v3",
      auth: apiKey
    });

    this.initialized = true;
  }

  /**
   * Initialize YouTube client with OAuth for write operations
   */
  private async initializeWithOAuth() {
    const hasValidTokens = await this.oauthClient.hasValidTokens('youtube');

    if (!hasValidTokens) {
      throw new Error('YouTube OAuth authentication required for write operations. Please authenticate first.');
    }

    const authenticatedClient = await this.oauthClient.getAuthenticatedClient('youtube');

    this.youtubeWithOAuth = google.youtube({
      version: "v3",
      auth: authenticatedClient
    });

    return this.youtubeWithOAuth;
  }

  /**
   * Get information about a YouTube playlist
   */
  async getPlaylist({ 
    playlistId 
  }: PlaylistParams): Promise<any> {
    try {
      this.initialize();
      
      const response = await this.youtube.playlists.list({
        part: ['snippet', 'contentDetails'],
        id: [playlistId]
      });
      
      return response.data.items?.[0] || null;
    } catch (error) {
      throw new Error(`Failed to get playlist: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get videos in a YouTube playlist
   */
  async getPlaylistItems({ 
    playlistId, 
    maxResults = 50 
  }: PlaylistItemsParams): Promise<any[]> {
    try {
      this.initialize();
      
      const response = await this.youtube.playlistItems.list({
        part: ['snippet', 'contentDetails'],
        playlistId,
        maxResults
      });
      
      return response.data.items || [];
    } catch (error) {
      throw new Error(`Failed to get playlist items: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Search for playlists on YouTube
   */
  async searchPlaylists({
    query,
    maxResults = 10
  }: SearchParams): Promise<any[]> {
    try {
      this.initialize();

      const response = await this.youtube.search.list({
        part: ['snippet'],
        q: query,
        maxResults,
        type: ['playlist']
      });

      return response.data.items || [];
    } catch (error) {
      throw new Error(`Failed to search playlists: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get the next video to process from a playlist (first video)
   * Reusable by both MCP and HTTP API
   */
  async getNextVideoToProcess(playlistId: string): Promise<{
    videoId: string;
    title: string;
    duration?: string;
    publishedAt: string;
    playlistItemId: string;
  } | null> {
    try {
      this.initialize();

      const response = await this.youtube.playlistItems.list({
        part: ['snippet', 'contentDetails'],
        playlistId,
        maxResults: 1
      });

      const item = response.data.items?.[0];
      if (!item) return null;

      return {
        videoId: item.snippet?.resourceId?.videoId || '',
        title: item.snippet?.title || '',
        duration: item.contentDetails?.duration,
        publishedAt: item.snippet?.publishedAt || '',
        playlistItemId: item.id || ''
      };
    } catch (error) {
      throw new Error(`Failed to get next video: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Remove a video from a playlist
   * Reusable by both MCP and HTTP API
   * Uses OAuth 2.0 authentication for write operations
   */
  async removeVideoFromPlaylist(playlistItemId: string): Promise<boolean> {
    try {
      const youtubeWithAuth = await this.initializeWithOAuth();

      await youtubeWithAuth.playlistItems.delete({
        id: playlistItemId
      });

      return true;
    } catch (error) {
      console.error('Playlist removal failed:', error);
      throw new Error(`Failed to remove video from playlist: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Add a video to a playlist
   * Reusable by both MCP and HTTP API
   * Uses OAuth 2.0 authentication for write operations
   */
  async addVideoToPlaylist(playlistId: string, videoId: string): Promise<string> {
    try {
      const youtubeWithAuth = await this.initializeWithOAuth();

      const response = await youtubeWithAuth.playlistItems.insert({
        part: ['snippet'],
        requestBody: {
          snippet: {
            playlistId: playlistId,
            resourceId: {
              kind: 'youtube#video',
              videoId: videoId
            }
          }
        }
      });

      return response.data.id || '';
    } catch (error) {
      console.error('Failed to add video to playlist:', error);
      throw new Error(`Failed to add video to playlist: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Helper method to check if playlist contains any videos
   * Reusable by both MCP and HTTP API
   */
  async hasVideos(playlistId: string): Promise<boolean> {
    try {
      const nextVideo = await this.getNextVideoToProcess(playlistId);
      return nextVideo !== null;
    } catch (error) {
      throw new Error(`Failed to check playlist videos: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get OAuth authentication status for YouTube write operations
   */
  async getOAuthStatus(): Promise<{ authenticated: boolean; authUrl?: string }> {
    const hasValidTokens = await this.oauthClient.hasValidTokens('youtube');

    if (hasValidTokens) {
      return { authenticated: true };
    } else {
      const authUrl = await this.oauthClient.getAuthUrl('youtube');
      return { authenticated: false, authUrl };
    }
  }
}