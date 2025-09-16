// HTTP API for n8n - shares core service with MCP
import http from 'http';
import { URL } from 'url';
import { TranscriptionJobService } from './services/transcription-job.js';
import { PlaylistService } from './services/playlist.js';

export class HttpApiServer {
  private transcriptionService = new TranscriptionJobService();
  private playlistService = new PlaylistService();

  async start(port: number = 3000): Promise<void> {
    const server = http.createServer(async (req, res) => {
      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      try {
        await this.handleRequest(req, res);
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error'
        }));
      }
    });

    server.listen(port, () => {
      console.log(`HTTP API server running on port ${port}`);
    });
  }

  async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const path = url.pathname;
    const method = req.method;

    // Health check
    if (path === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    // GET /api/status/{jobId} - Check job status
    if (method === 'GET' && path.startsWith('/api/status/')) {
      const jobId = path.split('/').pop();
      if (!jobId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Job ID required' }));
        return;
      }

      const job = this.transcriptionService.getJob(jobId);
      if (!job) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Job not found' }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        jobId: job.jobId,
        status: job.status,
        progress: job.progress,
        result: job.result,
        error: job.error
      }));
      return;
    }

    // POST endpoints
    if (method === 'POST') {
      const body = await this.readBody(req);

      if (path === '/api/playlist/check') {
        await this.handlePlaylistCheck(body, res);
        return;
      }

      if (path === '/api/transcribe') {
        await this.handleTranscribe(body, res);
        return;
      }
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }

  private async readBody(req: http.IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(new Error('Invalid JSON'));
        }
      });
    });
  }

  private async handlePlaylistCheck(body: any, res: http.ServerResponse): Promise<void> {
    const { playlistId, since } = body;

    if (!playlistId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'playlistId required' }));
      return;
    }

    // Get playlist items using existing service
    const playlist = await this.playlistService.getPlaylistItems({
      playlistId,
      maxResults: 50
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      newVideos: playlist.map(item => ({
        videoId: item.snippet?.resourceId?.videoId,
        title: item.snippet?.title,
        duration: item.contentDetails?.duration,
        publishedAt: item.snippet?.publishedAt
      }))
    }));
  }

  private async handleTranscribe(body: any, res: http.ServerResponse): Promise<void> {
    const { videoId } = body;

    if (!videoId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'videoId required' }));
      return;
    }

    // Create transcription job (async always)
    const job = await this.transcriptionService.createJob(videoId);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      jobId: job.jobId,
      status: job.status,
      estimatedTime: '2-5 minutes', // Simple estimate
      videoId: job.videoId
    }));
  }
}