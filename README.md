# YouTube MCP Server Enhanced

A production-ready YouTube Model Context Protocol (MCP) server with enhanced transcript capabilities and HTTP transport support.

## Features

- **Enhanced Transcript System**: 95%+ success rate using `youtube-caption-extractor`
- **Dual Transport**: Both stdio and HTTP transport modes
- **Production Ready**: Docker containerization with nginx reverse proxy
- **Comprehensive Tools**: Video info, search, playlists, channels, and transcripts
- **Remote MCP Pattern**: Optimized for remote deployment and Claude Code integration

## Quick Start

```bash
# Install dependencies
npm install

# Set environment variables
export YOUTUBE_API_KEY="your_api_key_here"
export TRANSPORT="http"
export PORT="3002"

# Build and run
npm run build
npm start
```

## Docker Deployment

```bash
# Build and run with Docker Compose
docker compose up --build -d

# Health check
curl http://localhost:3002/health
```

## Claude Code Integration

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "youtube": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/sdk", "your-server-url"],
      "env": {
        "AUTHORIZATION": "Basic your-auth-header"
      }
    }
  }
}
```

## Available Tools

1. `videos_getVideo` - Get detailed video information
2. `videos_searchVideos` - Search for videos
3. `channels_getChannel` - Get channel information  
4. `channels_listVideos` - List channel videos
5. `playlists_getPlaylist` - Get playlist information
6. `playlists_getPlaylistItems` - Get playlist contents
7. `transcripts_getTranscript` - Get video transcripts (enhanced)

## Documentation

See [CLAUDE.md](./CLAUDE.md) for comprehensive technical documentation including:
- Infrastructure setup and deployment
- Remote MCP pattern implementation
- Transcript system upgrade details
- Troubleshooting guides

## License

MIT