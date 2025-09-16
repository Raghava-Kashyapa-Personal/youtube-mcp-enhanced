// Core transcription service - shared by MCP and HTTP API
import { TranscriptService } from './transcript.js';
import { VideoService } from './video.js';
import { v4 as uuid } from 'uuid';

export interface TranscriptionJob {
  jobId: string;
  videoId: string;
  status: 'processing' | 'completed' | 'failed';
  progress?: {
    chunksTotal: number;
    chunksCompleted: number;
    percentComplete: number;
  };
  result?: {
    transcript: string;
    metadata: any;
  };
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export class TranscriptionJobService {
  private jobs = new Map<string, TranscriptionJob>();
  private transcriptService = new TranscriptService();
  private videoService = new VideoService();

  // Create new transcription job - used by both MCP and HTTP
  async createJob(videoId: string): Promise<TranscriptionJob> {
    const jobId = uuid();
    const job: TranscriptionJob = {
      jobId,
      videoId,
      status: 'processing',
      createdAt: new Date(),
    };

    this.jobs.set(jobId, job);

    // Start processing in background
    this.processJob(jobId).catch(error => {
      const job = this.jobs.get(jobId);
      if (job) {
        job.status = 'failed';
        job.error = error.message;
      }
    });

    return job;
  }

  // Get job status - used by both MCP and HTTP
  getJob(jobId: string): TranscriptionJob | undefined {
    return this.jobs.get(jobId);
  }

  // Background processing - use existing MCP transcript service
  private async processJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    try {
      // Just use the existing transcript service - it handles chunking internally
      const result = await this.transcriptService.getTranscript({
        videoId: job.videoId
      });

      job.status = 'completed';
      job.result = {
        transcript: result.transcript.map(t => t.text).join(' '),
        metadata: {
          totalSegments: result.transcript.length,
          source: result.metadata?.source || 'youtube-caption-extractor'
        }
      };
      job.completedAt = new Date();

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
    }
  }
}