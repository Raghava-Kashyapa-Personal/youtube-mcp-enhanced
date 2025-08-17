import { startMcpServer } from './server.js';
import { parseArgs } from './config/TransportConfig.js';

async function main() {
  try {
    // Check for required environment variables
    if (!process.env.YOUTUBE_API_KEY) {
      console.error('Error: YOUTUBE_API_KEY environment variable is required.');
      console.error('Please set it before running this server.');
      process.exit(1);
    }

    // Parse command line arguments
    const config = parseArgs(process.argv.slice(2));
    
    // Start the server with the parsed config
    await startMcpServer(config);

  } catch (error: unknown) {
    process.stderr.write(`Failed to start server: ${error instanceof Error ? error.message : error}\n`);
    process.exit(1);
  }
}

main().catch((error) => {
  process.stderr.write(`Failed to start YouTube MCP Server: ${error}\n`);
  process.exit(1);
});
