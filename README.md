# YouTube MCP Server Enhanced

A production-ready YouTube Model Context Protocol (MCP) server with enhanced transcript capabilities, dual transport support, and REST API integration.

## Features

- **🎯 Enhanced Transcripts**: 95%+ success rate using `youtube-caption-extractor`
- **🚀 Dual Transport**: MCP protocol (stdio/HTTP) + REST API endpoints
- **📦 Production Ready**: Docker containerization with health monitoring
- **🔧 Comprehensive Tools**: 7 MCP tools for videos, channels, playlists, and transcripts
- **🌐 N8N Integration**: REST endpoints designed for workflow automation
- **🔐 OAuth Support**: Read operations (API key) + Write operations (OAuth 2.0)

## Quick Start

### Prerequisites

1. **YouTube Data API v3 Key**
   - Visit [Google Cloud Console](https://console.cloud.google.com/)
   - Enable YouTube Data API v3
   - Create API key with YouTube Data API v3 restrictions

2. **OAuth 2.0 (Optional for playlist write operations)**
   - Create OAuth 2.0 credentials in Google Cloud Console
   - Add redirect URIs for your deployment

### Installation

```bash
# Clone repository
git clone https://github.com/Raghava-Kashyapa-Personal/youtube-mcp-enhanced.git
cd youtube-mcp-enhanced

# Install dependencies
npm install

# Set environment variables
export YOUTUBE_API_KEY="your_youtube_api_key"
export TRANSPORT="http"  # or "stdio"
export PORT="3002"

# Build and run
npm run build
npm start
```

### Docker Deployment (Recommended)

```bash
# Create .env file
echo "YOUTUBE_API_KEY=your_api_key_here" > .env

# Build and run with Docker Compose
docker compose up --build -d

# Verify health
curl http://localhost:3002/health
```

## Usage

### MCP Protocol (Claude Desktop/Code)

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "youtube": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-http", "http://localhost:3002"],
      "env": {
        "YOUTUBE_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### REST API (N8N/Automation)

**Base URL**: `http://localhost:3002`

#### Key Endpoints

```bash
# Health check
GET /health

# Get video information
POST /api/transcribe-video
{
  "videoId": "dQw4w9WgXcQ"
}

# Check playlist for next video
GET /api/playlist/next-video?playlistId=PLxxx

# Remove video from playlist (OAuth required)
DELETE /api/playlist/remove-video
{
  "playlistItemId": "PLitemXXX"
}

# OAuth status and management
GET /api/oauth/status
POST /api/oauth/exchange
```

## Available MCP Tools

| Tool | Description | Authentication |
|------|-------------|----------------|
| `videos_getVideo` | Get detailed video information and metadata | API Key |
| `videos_searchVideos` | Search YouTube with filters and sorting | API Key |
| `channels_getChannel` | Get channel information and statistics | API Key |
| `channels_listVideos` | List videos from a specific channel | API Key |
| `playlists_getPlaylist` | Get playlist information and metadata | API Key |
| `playlists_getPlaylistItems` | Get playlist contents and video list | API Key |
| `transcripts_getTranscript` | Get video transcripts with timestamps | API Key |

## Architecture

### Core Services
- **TranscriptService**: Enhanced transcription using `youtube-caption-extractor`
- **VideoService**: Video metadata, search, and information retrieval
- **PlaylistService**: Playlist operations with OAuth write support
- **ChannelService**: Channel information and video listings
- **SharedOAuth**: OAuth 2.0 integration for write operations

### Transport Modes
1. **MCP Protocol**: Direct integration with Claude Desktop/Code
2. **HTTP REST API**: Workflow automation and external integrations
3. **Combined Mode**: Both transports on single port (default)

## Configuration

### Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `YOUTUBE_API_KEY` | ✅ | YouTube Data API v3 key | - |
| `TRANSPORT` | ❌ | Transport mode: "stdio", "http", or "combined" | "combined" |
| `PORT` | ❌ | HTTP server port | 3002 |
| `GOOGLE_CLIENT_ID` | ❌ | OAuth client ID (for playlist writes) | - |
| `GOOGLE_CLIENT_SECRET` | ❌ | OAuth client secret (for playlist writes) | - |

### Docker Compose

```yaml
version: '3.8'
services:
  youtube-mcp:
    build: .
    ports:
      - "3002:3002"
    environment:
      - YOUTUBE_API_KEY=${YOUTUBE_API_KEY}
      - TRANSPORT=http
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3002/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped
```

## Development

### Building

```bash
# Development build
npm run build

# Memory-optimized build (for low-memory environments)
NODE_OPTIONS="--max-old-space-size=1024" npm run build
```

### Testing

```bash
# Test transcript functionality
curl -X POST http://localhost:3002/api/transcribe-video \
  -H "Content-Type: application/json" \
  -d '{"videoId":"dQw4w9WgXcQ"}'

# Test MCP tools list
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | \
  nc localhost 3002
```

### Health Monitoring

```bash
# Container health
docker stats youtube-mcp --no-stream

# Service health
curl -s http://localhost:3002/health

# Logs
docker logs youtube-mcp --tail 50 -f
```

## Integration Examples

### N8N Workflow

1. **Timer Trigger** → Every 30 minutes
2. **HTTP Request** → `GET /api/playlist/next-video?playlistId=YOUR_PLAYLIST`
3. **If new video** → **HTTP Request** → `POST /api/transcribe-video`
4. **Process transcript** → AI summarization, storage, etc.
5. **Cleanup** → `DELETE /api/playlist/remove-video`

### Claude Code MCP

The server provides 7 MCP tools for comprehensive YouTube interaction:
- Video information and search
- Channel exploration and video listings
- Playlist management and content access
- Enhanced transcript extraction with timestamps

## Performance

- **Memory Usage**: ~102MB stable (optimized for production)
- **Transcript Success**: 95%+ success rate with fallback mechanisms
- **Response Times**:
  - Video metadata: ~500ms
  - Video search: ~800ms
  - Transcription: 3-5 seconds
  - Health checks: ~50ms

## Troubleshooting

### Common Issues

1. **API Key Issues**
   ```bash
   # Verify API key works
   curl "https://www.googleapis.com/youtube/v3/videos?id=dQw4w9WgXcQ&key=YOUR_KEY&part=snippet"
   ```

2. **Container Health Fails**
   ```bash
   # Check if curl is available in container
   docker exec youtube-mcp curl --version
   ```

3. **Transcript Failures**
   - Verify video has captions (auto-generated or manual)
   - Check video is not private or restricted
   - Try different video IDs to isolate issues

4. **OAuth Issues**
   ```bash
   # Check OAuth status
   curl http://localhost:3002/api/oauth/status
   ```

### Support

For issues specific to this implementation, please check:
1. Docker logs: `docker logs youtube-mcp`
2. Health endpoint: `curl http://localhost:3002/health`
3. API key validity with direct YouTube API calls

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## Acknowledgments

- Built on [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk)
- Enhanced transcription via [youtube-caption-extractor](https://www.npmjs.com/package/youtube-caption-extractor)
- Designed for integration with [N8N](https://n8n.io/) workflow automation