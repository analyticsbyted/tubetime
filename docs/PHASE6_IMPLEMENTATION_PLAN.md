# Phase 6: Transcription Worker Implementation Plan

## Overview

Phase 6 implements the background worker that processes videos in the transcription queue. The worker will:
1. Process pending queue items
2. Download audio from YouTube videos
3. Transcribe the audio using a transcription service
4. Store transcripts in the database
5. Update queue item status appropriately

## Goals

- **Automated Processing:** Background worker processes queue items without user intervention
- **Status Management:** Proper status transitions (pending → processing → completed/failed)
- **Error Handling:** Robust error handling with retry logic for transient failures
- **Scalability:** Support for processing multiple items concurrently
- **Security:** Secure worker endpoint with authentication
- **Cost Efficiency:** Optimize transcription service usage

## Database Schema Changes

### New Model: `Transcript`

```prisma
model Transcript {
  id           String    @id @default(cuid())
  videoId      String    @unique // One transcript per video
  content      String    @db.Text // Full transcript text
  segments     Json? // Optional: Timestamped segments for better UX
  language     String? // Detected language code (e.g., 'en', 'es')
  confidence   Float? // Confidence score (0-1) if provided by service
  duration     Int? // Video duration in seconds
  wordCount    Int? // Word count for quick reference
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  video        Video     @relation(fields: [videoId], references: [id], onDelete: Cascade)

  @@index([videoId])
}
```

### Update `Video` Model

```prisma
model Video {
  // ... existing fields ...
  transcriptionQueue TranscriptionQueue[]
  transcript         Transcript? // One-to-one relationship
}
```

### Migration Strategy

1. Create migration: `npx prisma migrate dev --name add_transcript_model`
2. Update Prisma client: `npx prisma generate`

## Transcription Service Selection

### Option 1: OpenAI Whisper API (Recommended for MVP)

**Pros:**
- High accuracy
- Supports multiple languages
- Simple API
- Good documentation
- Pay-per-use pricing

**Cons:**
- Requires API key
- Cost per minute of audio
- Rate limits

**Implementation:**
- Use `openai` npm package
- API endpoint: `https://api.openai.com/v1/audio/transcriptions`
- Requires: `OPENAI_API_KEY` environment variable

### Option 2: AssemblyAI

**Pros:**
- Good accuracy
- Real-time transcription support
- Good developer experience
- Free tier available

**Cons:**
- Requires API key
- Different pricing model

### Option 3: Self-Hosted Whisper (Future)

**Pros:**
- No per-minute costs
- Full control
- Privacy-friendly

**Cons:**
- Requires GPU infrastructure
- More complex setup
- Higher initial setup cost

**Recommendation:** Start with OpenAI Whisper API for MVP, can migrate to self-hosted later.

## Architecture

### 1. Transcription Service (`src/services/transcriptionService.js`)

Core service for downloading audio and transcribing.

**Responsibilities:**
- Download audio from YouTube video
- Convert to format suitable for transcription API
- Call transcription service
- Return transcript data

**Key Functions:**
```javascript
/**
 * Downloads audio from YouTube video
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<Buffer>} Audio buffer
 */
async function downloadAudio(videoId) { }

/**
 * Transcribes audio using transcription service
 * @param {Buffer} audioBuffer - Audio data
 * @param {string} language - Optional language hint
 * @returns {Promise<{text: string, segments?: Array, language?: string}>}
 */
async function transcribeAudio(audioBuffer, language) { }

/**
 * Full transcription pipeline
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<TranscriptData>}
 */
async function transcribeVideo(videoId) { }
```

**Dependencies:**
- `ytdl-core` or `@distube/ytdl-core` - YouTube audio download
- `openai` - OpenAI Whisper API client
- `fs` (temporary file handling)

### 2. Worker API Route (`app/api/transcription-worker/route.js`)

Background worker endpoint that processes queue items.

**Security:**
- Secret key authentication (not user session)
- Environment variable: `TRANSCRIPTION_WORKER_SECRET`
- Prevents unauthorized access

**Endpoints:**

#### `POST /api/transcription-worker/process`
Process a single queue item or batch.

**Request:**
```json
{
  "queueItemId": "optional-specific-item-id",
  "maxItems": 5, // Optional: max items to process in this run
  "secret": "worker-secret-key"
}
```

**Response:**
```json
{
  "processed": 3,
  "completed": 2,
  "failed": 1,
  "results": [
    {
      "queueItemId": "...",
      "videoId": "...",
      "status": "completed",
      "transcriptId": "..."
    }
  ]
}
```

**Processing Logic:**
1. Authenticate using secret key
2. Fetch pending queue items (ordered by priority desc, createdAt asc)
3. For each item:
   - Update status: `pending` → `processing`
   - Download and transcribe video
   - Store transcript in database
   - Update status: `processing` → `completed`
   - Set `completedAt` timestamp
   - If error: Update status → `failed`, store error message
4. Return results

#### `GET /api/transcription-worker/status`
Get worker status and queue statistics.

**Response:**
```json
{
  "pending": 10,
  "processing": 2,
  "completed": 150,
  "failed": 5,
  "total": 167
}
```

### 3. Worker Service (`src/services/transcriptionWorkerService.js`)

Client-side service for interacting with worker (optional, for admin UI).

**Functions:**
- `processQueue(maxItems)` - Trigger processing
- `getWorkerStatus()` - Get queue statistics

## Implementation Steps

### Step 1: Database Schema (1-2 hours)

1. Add `Transcript` model to `prisma/schema.prisma`
2. Update `Video` model to include transcript relation
3. Run migration: `npx prisma migrate dev --name add_transcript_model`
4. Generate Prisma client: `npx prisma generate`

### Step 2: Transcription Service (4-6 hours)

1. Install dependencies:
   ```bash
   npm install openai @distube/ytdl-core
   ```

2. Create `src/services/transcriptionService.js`:
   - Implement `downloadAudio(videoId)`
   - Implement `transcribeAudio(audioBuffer, language)`
   - Implement `transcribeVideo(videoId)` (main function)
   - Add error handling and retry logic

3. Add environment variable:
   ```env
   OPENAI_API_KEY="your-openai-api-key"
   ```

4. Create unit tests for transcription service

### Step 3: Worker API Route (3-4 hours)

1. Create `app/api/transcription-worker/route.js`:
   - Implement `POST /api/transcription-worker/process`
   - Implement `GET /api/transcription-worker/status`
   - Add secret key authentication
   - Implement queue item processing logic
   - Add proper error handling

2. Add environment variable:
   ```env
   TRANSCRIPTION_WORKER_SECRET="generate-secure-random-string"
   ```

3. Create integration tests

### Step 4: Transcript Storage (2-3 hours)

1. Create API route for fetching transcripts:
   - `GET /api/transcripts/[videoId]` - Get transcript for video
   - Requires authentication (user must own the video in queue)

2. Update transcription worker to store transcripts:
   - After successful transcription, create `Transcript` record
   - Link to `Video` via `videoId`

### Step 5: Error Handling & Retry Logic (2-3 hours)

1. Implement retry logic for transient failures:
   - Network errors
   - Rate limit errors
   - Temporary service unavailability

2. Implement exponential backoff:
   - First retry: 1 minute
   - Second retry: 5 minutes
   - Third retry: 15 minutes
   - Max retries: 3

3. Store error messages in `errorMessage` field

4. Allow manual retry for failed items (update status: `failed` → `pending`)

### Step 6: Testing (3-4 hours)

1. **Unit Tests:**
   - Transcription service functions
   - Audio download
   - Error handling

2. **Integration Tests:**
   - Worker endpoint processing
   - Status transitions
   - Transcript storage

3. **Manual Testing:**
   - Queue a video
   - Trigger worker
   - Verify transcript is created
   - Verify status updates
   - Test error scenarios

### Step 7: Documentation (1-2 hours)

1. Update `CONTEXT.md` with Phase 6 details
2. Update `MIGRATION_PLAN.md` to mark Phase 6 complete
3. Create `TRANSCRIPTION_WORKER_IMPLEMENTATION_SUMMARY.md`
4. Update `README.md` with transcription feature details
5. Add troubleshooting guide for transcription issues

## Error Handling Strategy

### Transient Errors (Retry)
- Network timeouts
- Rate limit errors (429)
- Service temporarily unavailable (503)
- YouTube download failures

### Permanent Errors (Mark as Failed)
- Video not found (404)
- Video is private/unavailable
- Invalid video ID
- Transcription service authentication errors

### Error Storage
- Store error message in `TranscriptionQueue.errorMessage`
- Update status to `failed`
- Allow manual retry by updating status: `failed` → `pending`

## Security Considerations

1. **Worker Endpoint Authentication:**
   - Use secret key (not user session)
   - Store in environment variable
   - Validate on every request

2. **API Key Security:**
   - Store `OPENAI_API_KEY` in environment variable
   - Never expose in client-side code
   - Rotate keys regularly

3. **User Data Isolation:**
   - Transcripts are linked to videos
   - Users can only access transcripts for videos they queued
   - Verify ownership in transcript API routes

## Performance Considerations

1. **Concurrent Processing:**
   - Process multiple items concurrently (limit: 3-5 at a time)
   - Use `Promise.all()` with concurrency limit

2. **Rate Limiting:**
   - Respect transcription service rate limits
   - Implement queue with delays between requests

3. **Caching:**
   - Check if transcript already exists before processing
   - Reuse transcripts for same video (even across users)

4. **Resource Management:**
   - Clean up temporary audio files
   - Limit audio file size (skip very long videos initially)

## Cost Estimation

### OpenAI Whisper API Pricing (as of 2024)
- $0.006 per minute of audio
- Example: 10-minute video = $0.06

### Cost Mitigation
1. **User Limits:** Limit queue size per user (e.g., 50 items)
2. **Video Length Limits:** Skip videos longer than 60 minutes initially
3. **Caching:** Reuse transcripts for same video
4. **Priority System:** Process high-priority items first

## Deployment Considerations

### Development
- Manual trigger: Call worker endpoint via curl/Postman
- Or: Create simple admin UI button

### Production
- **Option 1:** Cron job (Vercel Cron, GitHub Actions, etc.)
  - Schedule: Every 5-10 minutes
  - Call worker endpoint

- **Option 2:** Queue-based (Future)
  - Use message queue (Redis, RabbitMQ, etc.)
  - Worker processes items as they arrive

- **Option 3:** On-demand
  - Trigger worker when items are added to queue
  - Use Next.js API route with background processing

**Recommendation:** Start with cron job for MVP, migrate to queue-based later if needed.

## Environment Variables

Add to `.env` and `.env.local`:

```env
# Transcription Service
OPENAI_API_KEY="sk-..."

# Worker Security
TRANSCRIPTION_WORKER_SECRET="generate-secure-random-string-here"

# Optional: Worker Configuration
TRANSCRIPTION_WORKER_MAX_CONCURRENT=3
TRANSCRIPTION_WORKER_MAX_RETRIES=3
```

## Testing Checklist

### Unit Tests
- [ ] `downloadAudio()` - Success case
- [ ] `downloadAudio()` - Invalid video ID
- [ ] `downloadAudio()` - Private video
- [ ] `transcribeAudio()` - Success case
- [ ] `transcribeAudio()` - API error handling
- [ ] `transcribeVideo()` - Full pipeline

### Integration Tests
- [ ] Worker processes pending item
- [ ] Status transitions correctly
- [ ] Transcript stored in database
- [ ] Error handling for failed transcription
- [ ] Retry logic for transient errors
- [ ] Secret key authentication

### Manual Tests
- [ ] Queue a video
- [ ] Trigger worker
- [ ] Verify transcript created
- [ ] Verify status updated
- [ ] Test error scenarios
- [ ] Test retry for failed items

## Success Criteria

- ✅ Worker processes pending queue items
- ✅ Transcripts are stored in database
- ✅ Status transitions work correctly
- ✅ Error handling is robust
- ✅ Retry logic works for transient failures
- ✅ Security is properly implemented
- ✅ Documentation is complete
- ✅ Tests pass

## Future Enhancements (Post-MVP)

1. **Real-time Updates:** WebSocket notifications for status changes
2. **Progress Tracking:** Show transcription progress percentage
3. **Batch Processing UI:** Admin interface to manage queue
4. **Transcript Search:** Full-text search across transcripts
5. **Transcript Segments:** Timestamped segments for better UX
6. **Multiple Language Support:** Auto-detect and transcribe in multiple languages
7. **Self-Hosted Whisper:** Reduce costs with self-hosted solution
8. **Transcript Export:** Export transcripts as text/JSON/CSV

## Timeline Estimate

- **Database Schema:** 1-2 hours
- **Transcription Service:** 4-6 hours
- **Worker API Route:** 3-4 hours
- **Transcript Storage:** 2-3 hours
- **Error Handling:** 2-3 hours
- **Testing:** 3-4 hours
- **Documentation:** 1-2 hours

**Total: ~16-24 hours** (2-3 days of focused work)

## Dependencies

### New npm Packages
```json
{
  "openai": "^4.0.0",
  "@distube/ytdl-core": "^4.14.0"
}
```

### Environment Variables
- `OPENAI_API_KEY` - OpenAI API key for Whisper
- `TRANSCRIPTION_WORKER_SECRET` - Secret key for worker authentication

## Questions for Review

1. **Transcription Service:** Confirm OpenAI Whisper API is acceptable, or prefer AssemblyAI/other?
2. **Cost Limits:** Should we implement user limits or video length limits initially?
3. **Deployment:** Cron job vs on-demand vs queue-based - which approach?
4. **Concurrency:** How many items should be processed concurrently? (Recommend: 3-5)
5. **Retry Strategy:** Confirm retry logic and backoff timing?
6. **Transcript Format:** Do we need timestamped segments initially, or just full text?

## Approval

Please review this plan and provide feedback on:
- Transcription service selection
- Architecture approach
- Error handling strategy
- Deployment method
- Any concerns or modifications needed

Once approved, we'll proceed with implementation.

