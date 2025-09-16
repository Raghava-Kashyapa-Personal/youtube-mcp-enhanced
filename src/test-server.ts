// Simple test server to verify our architecture works
import { HttpApiServer } from './http-api.js';

async function main() {
  console.log('Starting test server...');
  const server = new HttpApiServer();
  await server.start(3004);
  console.log('Server started on port 3004');
  console.log('Test endpoints:');
  console.log('- GET http://localhost:3004/health');
  console.log('- POST http://localhost:3004/api/transcribe {"videoId":"dQw4w9WgXcQ"}');
}

main().catch(console.error);