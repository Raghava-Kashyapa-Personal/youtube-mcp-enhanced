// HTTP API for n8n - simplified synchronous processing
import http from 'http';
import { URL } from 'url';
import { TranscriptService } from './services/transcript.js';
import { VideoService } from './services/video.js';
import { PlaylistService } from './services/playlist.js';

export class HttpApiServer {
  private transcriptService = new TranscriptService();
  private videoService = new VideoService();
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

    // GET /api/playlist/next-video?playlistId=PLxxx - Get next video to process
    if (method === 'GET' && path.startsWith('/api/playlist/next-video')) {
      const playlistId = url.searchParams.get('playlistId');
      if (!playlistId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'playlistId parameter required' }));
        return;
      }

      try {
        const nextVideo = await this.playlistService.getNextVideoToProcess(playlistId);
        if (!nextVideo) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ nextVideo: null, message: 'No videos in playlist' }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ nextVideo }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error'
        }));
      }
      return;
    }

    // POST /api/transcribe-video - Synchronous video transcription
    if (method === 'POST' && path === '/api/transcribe-video') {
      const body = await this.readBody(req);
      await this.handleTranscribeVideo(body, res);
      return;
    }

    // DELETE /api/playlist/remove-video - Remove video from playlist
    if (method === 'DELETE' && path === '/api/playlist/remove-video') {
      const body = await this.readBody(req);
      await this.handleRemoveVideo(body, res);
      return;
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

  /**
   * Handle synchronous video transcription
   * Reuses core TranscriptService for consistency with MCP
   */
  private async handleTranscribeVideo(body: any, res: http.ServerResponse): Promise<void> {
    const { videoId } = body;

    if (!videoId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'videoId required' }));
      return;
    }

    const startTime = Date.now();

    try {
      // Get video metadata
      const videoInfo = await this.videoService.getVideo({ videoId });

      // Get transcript using existing service (same as MCP)
      const transcriptResult = await this.transcriptService.getTranscript({ videoId });

      // Combine transcript segments into full text
      const fullTranscript = transcriptResult.transcript
        .map(segment => segment.text)
        .join(' ');

      const processingTime = Date.now() - startTime;

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        videoId,
        title: videoInfo.title,
        transcript: fullTranscript,
        metadata: {
          ...transcriptResult.metadata,
          segmentCount: transcriptResult.transcript.length,
          videoInfo: {
            title: videoInfo.title,
            duration: videoInfo.duration,
            channelTitle: videoInfo.channelTitle
          }
        },
        processingTime
      }));

    } catch (error) {
      console.error('Transcription error:', error);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        videoId
      }));
    }
  }

  /**
   * Handle video removal from playlist
   * Reuses core PlaylistService for consistency with MCP
   */
  private async handleRemoveVideo(body: any, res: http.ServerResponse): Promise<void> {
    const { playlistItemId } = body;

    if (!playlistItemId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'playlistItemId required' }));
      return;
    }

    try {
      const removed = await this.playlistService.removeVideoFromPlaylist(playlistItemId);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        removed,
        playlistItemId
      }));

    } catch (error) {
      console.error('Video removal error:', error);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        playlistItemId,
        note: 'Video removal requires OAuth 2.0 authentication'
      }));
    }
  }
}