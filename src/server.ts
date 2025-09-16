import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { parseArgs } from './config/TransportConfig.js';
import http from 'http';
import { VideoService } from './services/video.js';
import { TranscriptService } from './services/transcript.js';
import { PlaylistService } from './services/playlist.js';
import { ChannelService } from './services/channel.js';
import { HttpApiServer } from './http-api.js';
import {
    VideoParams,
    SearchParams,
    TranscriptParams,
    ChannelParams,
    ChannelVideosParams,
    PlaylistParams,
    PlaylistItemsParams,
} from './types.js';

export async function startMcpServer(config?: any) {
    // Parse config from args if not provided
    if (!config) {
        config = parseArgs(process.argv.slice(2));
    }
    const server = new Server(
        {
            name: 'rkashyapa-youtube-mcp-enhanced',
            version: '2.0.0',
        },
        {
            capabilities: {
                tools: {},
            },
        }
    );

    const videoService = new VideoService();
    const transcriptService = new TranscriptService();
    const playlistService = new PlaylistService();
    const channelService = new ChannelService();

    server.setRequestHandler(ListToolsRequestSchema, async () => {
        return {
            tools: [
                {
                    name: 'videos_getVideo',
                    description: 'Get detailed information about a YouTube video',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            videoId: {
                                type: 'string',
                                description: 'The YouTube video ID',
                            },
                            parts: {
                                type: 'array',
                                description: 'Parts of the video to retrieve',
                                items: {
                                    type: 'string',
                                },
                            },
                        },
                        required: ['videoId'],
                    },
                },
                {
                    name: 'videos_searchVideos',
                    description: 'Search for videos on YouTube',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            query: {
                                type: 'string',
                                description: 'Search query',
                            },
                            maxResults: {
                                type: 'number',
                                description: 'Maximum number of results to return',
                            },
                        },
                        required: ['query'],
                    },
                },
                {
                    name: 'transcripts_getTranscript',
                    description: 'Get YouTube video transcript with segmentation to avoid 25K token limits. IMPORTANT: Use startIndex+maxSegments for reliable access to any part of long videos. For 7+ hour videos, use startIndex: 0-1000 (hours 1-2), 1000-2000 (hours 2-3), 2000-3000 (hours 3-4), 3000-4000 (hours 4-6), 4000+ (final content).',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            videoId: {
                                type: 'string',
                                description: 'The YouTube video ID (required)',
                            },
                            language: {
                                type: 'string',
                                description: 'Language code (default: en)',
                            },
                            startTime: {
                                type: 'number',
                                description: '⚠️ COMPATIBILITY ISSUE: Use startIndex instead for reliable results',
                            },
                            endTime: {
                                type: 'number',
                                description: '⚠️ COMPATIBILITY ISSUE: Use maxSegments instead for reliable results',
                            },
                            lastMinutes: {
                                type: 'number',
                                description: '✅ RELIABLE: Get last N minutes (e.g., 30 for last 30 minutes)',
                            },
                            firstMinutes: {
                                type: 'number',
                                description: '✅ RELIABLE: Get first N minutes (e.g., 120 for first 2 hours)',
                            },
                            maxSegments: {
                                type: 'number',
                                description: '✅ RECOMMENDED: Max segments to return (use 300-500 to stay under token limits)',
                            },
                            startIndex: {
                                type: 'number',
                                description: '✅ RELIABLE: Start from segment index (0=beginning, 3000=~hour 4-5). Use this to access middle content of long videos.',
                            },
                            endIndex: {
                                type: 'number',
                                description: '✅ RELIABLE: End at segment index (0-based). Optional when using maxSegments.',
                            },
                        },
                        required: ['videoId'],
                    },
                },
                {
                    name: 'channels_getChannel',
                    description: 'Get information about a YouTube channel',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            channelId: {
                                type: 'string',
                                description: 'The YouTube channel ID',
                            },
                        },
                        required: ['channelId'],
                    },
                },
                {
                    name: 'channels_listVideos',
                    description: 'Get videos from a specific channel',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            channelId: {
                                type: 'string',
                                description: 'The YouTube channel ID',
                            },
                            maxResults: {
                                type: 'number',
                                description: 'Maximum number of results to return',
                            },
                        },
                        required: ['channelId'],
                    },
                },
                {
                    name: 'playlists_getPlaylist',
                    description: 'Get information about a YouTube playlist',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            playlistId: {
                                type: 'string',
                                description: 'The YouTube playlist ID',
                            },
                        },
                        required: ['playlistId'],
                    },
                },
                {
                    name: 'playlists_getPlaylistItems',
                    description: 'Get videos in a YouTube playlist',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            playlistId: {
                                type: 'string',
                                description: 'The YouTube playlist ID',
                            },
                            maxResults: {
                                type: 'number',
                                description: 'Maximum number of results to return',
                            },
                        },
                        required: ['playlistId'],
                    },
                },
            ],
        };
    });

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;

        try {
            switch (name) {
                case 'videos_getVideo': {
                    const result = await videoService.getVideo(args as unknown as VideoParams);
                    return {
                        content: [{
                            type: 'text',
                            text: JSON.stringify(result, null, 2)
                        }]
                    };
                }
                
                case 'videos_searchVideos': {
                    const result = await videoService.searchVideos(args as unknown as SearchParams);
                    return {
                        content: [{
                            type: 'text',
                            text: JSON.stringify(result, null, 2)
                        }]
                    };
                }
                
                case 'transcripts_getTranscript': {
                    // Debug logging for parameter debugging
                    console.log('[DEBUG] Received transcript args:', JSON.stringify(args, null, 2));
                    const result = await transcriptService.getTranscript(args as unknown as TranscriptParams);
                    return {
                        content: [{
                            type: 'text',
                            text: JSON.stringify(result, null, 2)
                        }]
                    };
                }
                
                case 'channels_getChannel': {
                    const result = await channelService.getChannel(args as unknown as ChannelParams);
                    return {
                        content: [{
                            type: 'text',
                            text: JSON.stringify(result, null, 2)
                        }]
                    };
                }
                
                case 'channels_listVideos': {
                    const result = await channelService.listVideos(args as unknown as ChannelVideosParams);
                    return {
                        content: [{
                            type: 'text',
                            text: JSON.stringify(result, null, 2)
                        }]
                    };
                }
                
                case 'playlists_getPlaylist': {
                    const result = await playlistService.getPlaylist(args as unknown as PlaylistParams);
                    return {
                        content: [{
                            type: 'text',
                            text: JSON.stringify(result, null, 2)
                        }]
                    };
                }
                
                case 'playlists_getPlaylistItems': {
                    const result = await playlistService.getPlaylistItems(args as unknown as PlaylistItemsParams);
                    return {
                        content: [{
                            type: 'text',
                            text: JSON.stringify(result, null, 2)
                        }]
                    };
                }
                
                default:
                    throw new Error(`Unknown tool: ${name}`);
            }
        } catch (error) {
            return {
                content: [{
                    type: 'text',
                    text: `Error: ${error instanceof Error ? error.message : String(error)}`
                }],
                isError: true
            };
        }
    });

    // Create transport based on config
    if (config.transport.type === 'http') {
        const port = config.transport.port || 3002;
        const host = config.transport.host || '127.0.0.1';
        
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined // Stateless mode
        });
        await server.connect(transport);
        
        // Create HTTP API server instance for n8n endpoints
        const httpApiServer = new HttpApiServer();

        // Create HTTP server
        const httpServer = http.createServer(async (req, res) => {
            // Handle CORS
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id');

            if (req.method === 'OPTIONS') {
                res.writeHead(200);
                res.end();
                return;
            }

            // Handle health check
            if (req.method === 'GET' && req.url === '/health') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    status: 'healthy',
                    server: 'youtube-mcp',
                    version: '1.0.0',
                    timestamp: new Date().toISOString()
                }));
                return;
            }

            // Handle n8n API endpoints first
            const url = new URL(req.url || '', `http://${req.headers.host}`);
            if (url.pathname.startsWith('/api/')) {
                try {
                    await httpApiServer.handleRequest(req, res);
                    return;
                } catch (error) {
                    console.error(`API error: ${error instanceof Error ? error.message : error}`);
                    if (!res.headersSent) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Internal server error' }));
                    }
                    return;
                }
            }

            // Handle MCP transport for other requests
            try {
                await transport.handleRequest(req, res);
            } catch (error) {
                console.error(`Error handling request: ${error instanceof Error ? error.message : error}`);
                if (!res.headersSent) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        jsonrpc: '2.0',
                        error: {
                            code: -32603,
                            message: 'Internal server error',
                        },
                        id: null,
                    }));
                }
            }
        });

        httpServer.listen(port, host, () => {
            console.log(`YouTube MCP Server listening on http://${host}:${port}`);
        });
    } else {
        // Stdio transport
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.log(`YouTube MCP Server v1.0.0 started successfully`);
    }
    
    console.log(`Server will validate YouTube API key when tools are called`);
    return server;
}
