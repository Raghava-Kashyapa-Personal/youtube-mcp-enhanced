// MCP tools that use shared core services
import { TranscriptionJobService } from './services/transcription-job.js';

export class McpTranscriptionTools {
  private transcriptionService = new TranscriptionJobService();

  // MCP tool: Start transcription job
  async startTranscription(params: { videoId: string }) {
    const job = await this.transcriptionService.createJob(params.videoId);

    return {
      jobId: job.jobId,
      status: job.status,
      message: `Transcription job created for video ${params.videoId}. Use checkTranscriptionStatus to monitor progress.`
    };
  }

  // MCP tool: Check transcription job status
  async checkTranscriptionStatus(params: { jobId: string }) {
    const job = this.transcriptionService.getJob(params.jobId);

    if (!job) {
      return { error: 'Job not found' };
    }

    if (job.status === 'completed' && job.result) {
      return {
        status: 'completed',
        transcript: job.result.transcript,
        metadata: job.result.metadata,
        processingTime: job.completedAt ?
          (job.completedAt.getTime() - job.createdAt.getTime()) / 1000 + ' seconds' :
          null
      };
    }

    if (job.status === 'failed') {
      return {
        status: 'failed',
        error: job.error
      };
    }

    return {
      status: 'processing',
      progress: job.progress,
      message: 'Transcription in progress. Check again in a moment.'
    };
  }
}