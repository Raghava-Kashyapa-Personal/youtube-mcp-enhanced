import { google } from 'googleapis';
import { PlaylistParams, PlaylistItemsParams, SearchParams } from '../types.js';

/**
 * Service for interacting with YouTube playlists
 */
export class PlaylistService {
  private youtube;
  private initialized = false;

  constructor() {
    // Don't initialize in constructor
  }

  /**
   * Initialize the YouTube client only when needed
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
   * Note: Requires OAuth 2.0 with playlist modification scope
   */
  async removeVideoFromPlaylist(playlistItemId: string): Promise<boolean> {
    try {
      this.initialize();

      // Note: This requires OAuth 2.0 authentication, not just API key
      // The current implementation uses API key only, so this will fail
      // TODO: Add OAuth 2.0 support for write operations
      await this.youtube.playlistItems.delete({
        id: playlistItemId
      });

      return true;
    } catch (error) {
      // For now, return false and log the error
      console.error('Playlist removal failed (OAuth required):', error);
      throw new Error(`Failed to remove video from playlist: ${error instanceof Error ? error.message : String(error)}`);
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
}