import { getSubtitles } from "youtube-caption-extractor";
import { TranscriptParams, SearchTranscriptParams } from '../types.js';

/**
 * Enhanced service for interacting with YouTube video transcripts
 * Uses youtube-caption-extractor for better auto-generated caption support
 */
export class TranscriptService {
  private initialized = false;

  constructor() {
    // No initialization needed
  }

  private initialize() {
    if (this.initialized) return;
    this.initialized = true;
  }

  /**
   * Parse time string (MM:SS or HH:MM:SS) to seconds
   */
  private parseTimeToSeconds(time: string | number): number {
    if (typeof time === 'number') return time;
    
    const parts = time.split(':').map(Number);
    if (parts.length === 2) {
      // MM:SS format
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      // HH:MM:SS format
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
  }

  /**
   * Filter transcript segments based on time or index parameters
   */
  private filterTranscriptSegments(transcript: any[], params: TranscriptParams): any[] {
    let filtered = [...transcript];
    
    // Calculate total duration for relative time calculations
    const totalDuration = Math.max(...transcript.map(s => s.start + s.duration));
    
    // Apply time-based filtering first
    if (params.startTime !== undefined || params.endTime !== undefined) {
      const startSeconds = params.startTime !== undefined ? this.parseTimeToSeconds(params.startTime) : 0;
      const endSeconds = params.endTime !== undefined ? this.parseTimeToSeconds(params.endTime) : totalDuration;
      
      filtered = filtered.filter(segment => 
        segment.start >= startSeconds && segment.start <= endSeconds
      );
    }
    
    // Apply lastMinutes filter
    if (params.lastMinutes !== undefined) {
      const startSeconds = totalDuration - (params.lastMinutes * 60);
      filtered = filtered.filter(segment => segment.start >= startSeconds);
    }
    
    // Apply firstMinutes filter
    if (params.firstMinutes !== undefined) {
      const endSeconds = params.firstMinutes * 60;
      filtered = filtered.filter(segment => segment.start <= endSeconds);
    }
    
    // Apply index-based filtering
    if (params.startIndex !== undefined || params.endIndex !== undefined) {
      const startIdx = params.startIndex || 0;
      const endIdx = params.endIndex !== undefined ? params.endIndex + 1 : filtered.length;
      filtered = filtered.slice(startIdx, endIdx);
    }
    
    // Apply maxSegments limit (after other filters)
    if (params.maxSegments !== undefined && filtered.length > params.maxSegments) {
      filtered = filtered.slice(0, params.maxSegments);
    }
    
    return filtered;
  }

  /**
   * Get the transcript of a YouTube video with segmentation support
   * Now supports auto-generated captions and time-based/segment-based filtering
   */
  async getTranscript(params: TranscriptParams): Promise<any> {
    const { videoId, language = process.env.YOUTUBE_TRANSCRIPT_LANG || 'en' } = params;
    try {
      this.initialize();
      
      // Use youtube-caption-extractor for better caption access
      const subtitles = await getSubtitles({ 
        videoID: videoId, 
        lang: language 
      });
      
      if (!subtitles || subtitles.length === 0) {
        throw new Error(`No transcript found for video ${videoId} in language ${language}`);
      }
      
      // Convert to consistent format
      const fullTranscript = subtitles.map(subtitle => ({
        text: subtitle.text,
        start: Number(subtitle.start),
        duration: Number(subtitle.dur),
        offset: Math.round(Number(subtitle.start) * 1000), // Convert to ms for compatibility
      }));
      
      // Apply segmentation filters
      const filteredTranscript = this.filterTranscriptSegments(fullTranscript, params);
      
      // Calculate metadata for filtered transcript
      const totalDuration = Math.max(...fullTranscript.map(s => s.start + s.duration));
      const filteredDuration = filteredTranscript.length > 0 
        ? Math.max(...filteredTranscript.map(s => s.start + s.duration)) - Math.min(...filteredTranscript.map(s => s.start))
        : 0;
      
      return {
        videoId,
        language,
        transcript: filteredTranscript,
        metadata: {
          segmentCount: filteredTranscript.length,
          totalSegments: fullTranscript.length,
          source: 'youtube-caption-extractor',
          totalDuration: totalDuration,
          filteredDuration: filteredDuration,
          appliedFilters: {
            startTime: params.startTime,
            endTime: params.endTime,
            lastMinutes: params.lastMinutes,
            firstMinutes: params.firstMinutes,
            maxSegments: params.maxSegments,
            startIndex: params.startIndex,
            endIndex: params.endIndex
          }
        }
      };
    } catch (error) {
      throw new Error(`Failed to get transcript: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Search within a transcript
   */
  async searchTranscript({ 
    videoId, 
    query,
    language = process.env.YOUTUBE_TRANSCRIPT_LANG || 'en' 
  }: SearchTranscriptParams): Promise<any> {
    try {
      this.initialize();
      
      // Get full transcript first (no segmentation for search)
      const transcriptResult = await this.getTranscript({ videoId, language });
      const transcript = transcriptResult.transcript;
      
      // Search through transcript for the query
      const matches = transcript.filter((item: any) => 
        item.text.toLowerCase().includes(query.toLowerCase())
      );
      
      return {
        videoId,
        query,
        language,
        matches,
        totalMatches: matches.length,
        metadata: transcriptResult.metadata
      };
    } catch (error) {
      throw new Error(`Failed to search transcript: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Get transcript with timestamps in human-readable format
   */
  async getTimestampedTranscript(params: TranscriptParams): Promise<any> {
    try {
      this.initialize();
      
      // Get raw transcript (with any segmentation filters applied)
      const transcriptResult = await this.getTranscript(params);
      const transcript = transcriptResult.transcript;
      
      // Format timestamps in human-readable format
      const timestampedTranscript = transcript.map((item: any) => {
        const seconds = item.start;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        
        let formattedTime;
        if (hours > 0) {
          formattedTime = `${hours}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        } else {
          formattedTime = `${remainingMinutes}:${remainingSeconds.toString().padStart(2, '0')}`;
        }
        
        return {
          timestamp: formattedTime,
          text: item.text,
          startTimeSeconds: item.start,
          durationSeconds: item.duration,
          startTimeMs: Math.round(item.start * 1000),
          durationMs: Math.round(item.duration * 1000)
        };
      });
      
      return {
        videoId: params.videoId,
        language: params.language || process.env.YOUTUBE_TRANSCRIPT_LANG || 'en',
        timestampedTranscript,
        metadata: {
          ...transcriptResult.metadata,
          format: 'timestamped'
        }
      };
    } catch (error) {
      throw new Error(`Failed to get timestamped transcript: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}