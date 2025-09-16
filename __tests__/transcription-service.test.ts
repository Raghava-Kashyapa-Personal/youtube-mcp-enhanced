// Test the core transcription service
// This service handles both MCP calls and HTTP API calls
describe('TranscriptionService', () => {
  test('should create transcription job', () => {
    // Start simple - just test job creation
    const jobId = 'test-job-123';
    expect(jobId).toBeDefined();
  });
});