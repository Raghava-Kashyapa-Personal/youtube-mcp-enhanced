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
   * Get the transcript of a YouTube video
   * Now supports auto-generated captions
   */
  async getTranscript({ 
    videoId, 
    language = process.env.YOUTUBE_TRANSCRIPT_LANG || 'en' 
  }: TranscriptParams): Promise<any> {
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
      const transcript = subtitles.map(subtitle => ({
        text: subtitle.text,
        start: Number(subtitle.start),
        duration: Number(subtitle.dur),
        offset: Math.round(Number(subtitle.start) * 1000), // Convert to ms for compatibility
      }));
      
      return {
        videoId,
        language,
        transcript,
        metadata: {
          segmentCount: transcript.length,
          source: 'youtube-caption-extractor',
          totalDuration: Math.max(...subtitles.map(s => Number(s.start) + Number(s.dur)))
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
      
      // Get transcript first
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
  async getTimestampedTranscript({ 
    videoId, 
    language = process.env.YOUTUBE_TRANSCRIPT_LANG || 'en' 
  }: TranscriptParams): Promise<any> {
    try {
      this.initialize();
      
      // Get raw transcript
      const transcriptResult = await this.getTranscript({ videoId, language });
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
        videoId,
        language,
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