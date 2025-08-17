/**
 * Video details parameters
 */
export interface VideoParams {
  videoId: string;
  parts?: string[];
}

/**
 * Search videos parameters
 */
export interface SearchParams {
  query: string;
  maxResults?: number;
}

/**
 * Trending videos parameters
 */
export interface TrendingParams {
  regionCode?: string;
  maxResults?: number;
  videoCategoryId?: string;
}

/**
 * Related videos parameters
 */
export interface RelatedVideosParams {
  videoId: string;
  maxResults?: number;
}

/**
 * Transcript parameters with segmentation support
 */
export interface TranscriptParams {
  videoId: string;
  language?: string;
  // Time-based segmentation
  startTime?: string | number;  // Time in seconds or "MM:SS" format
  endTime?: string | number;    // Time in seconds or "MM:SS" format
  lastMinutes?: number;         // Get last N minutes
  firstMinutes?: number;        // Get first N minutes
  // Segment-based limitation
  maxSegments?: number;         // Maximum number of segments to return
  startIndex?: number;          // Start from segment index
  endIndex?: number;            // End at segment index
}

/**
 * Search transcript parameters
 */
export interface SearchTranscriptParams {
  videoId: string;
  query: string;
  language?: string;
}

/**
 * Channel parameters
 */
export interface ChannelParams {
  channelId: string;
}

/**
 * Channel videos parameters
 */
export interface ChannelVideosParams {
  channelId: string;
  maxResults?: number;
}

/**
 * Playlist parameters
 */
export interface PlaylistParams {
  playlistId: string;
}

/**
 * Playlist items parameters
 */
export interface PlaylistItemsParams {
  playlistId: string;
  maxResults?: number;
}
