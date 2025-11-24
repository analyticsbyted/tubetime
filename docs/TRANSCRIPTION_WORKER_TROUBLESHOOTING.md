# Transcription Worker Troubleshooting Report

**Date:** November 23, 2024  
**Project:** TubeTime Transcription Worker  
**Environment:** Hugging Face Spaces (Docker)  
**Status:** ⚠️ **BLOCKED - Platform Network Limitation**

**Critical Issue:** Hugging Face Spaces cannot resolve external DNS names (e.g., `www.youtube.com`), preventing the worker from downloading videos. This is a platform restriction that requires deploying to an alternative platform.

## Executive Summary

This document details the issues encountered while deploying and configuring the transcription worker on Hugging Face Spaces, along with all attempted fixes and current status. The worker is designed to transcribe YouTube videos using Whisper (via Hugging Face Transformers) and yt-dlp for audio extraction.

## Architecture Overview

```
Next.js App (localhost:3000)
    ↓ HTTP POST /api/transcription-queue/process
Next.js API Route (app/api/transcription-queue/process/route.js)
    ↓ Calls transcriptionService.transcribeVideo()
Transcription Service (src/services/transcriptionService.js)
    ↓ HTTP POST to Hugging Face Space
Hugging Face Space Worker (FastAPI + Whisper + yt-dlp)
    ↓ Returns transcript JSON
Next.js App (stores in database, displays to user)
```

**Key Components:**
- **Worker URL:** `https://analyticsbyted-tubetime-transcription-worker.hf.space`
- **Worker Secret:** Configured in Hugging Face Space secrets and `.env` file
- **Database:** PostgreSQL (Neon) via Prisma ORM
- **Worker Stack:** Python 3.11, FastAPI, Whisper (distil-whisper/distil-medium.en), yt-dlp, ffmpeg

## Issues Encountered

### Issue 1: Missing Environment Variables

**Problem:**
- Application showed "0 videos added" when attempting to queue videos
- Worker configuration was missing (`TRANSCRIPTION_WORKER_URL` and `TRANSCRIPTION_WORKER_SECRET`)

**Root Cause:**
- Environment variables were not configured in `.env` file
- Worker was not deployed to Hugging Face Spaces

**Fix Applied:**
- Created Hugging Face Space: `analyticsbyted/tubetime-transcription-worker`
- Configured `TRANSCRIPTION_WORKER_SECRET` in Space settings
- Added environment variables to `.env`:
  ```env
  TRANSCRIPTION_WORKER_URL="https://analyticsbyted-tubetime-transcription-worker.hf.space"
  TRANSCRIPTION_WORKER_SECRET="7Ztrj+3PftE0HN2uW54VGHf1e464S+YUsgX9K3k5ar0="
  ```

**Status:** ✅ Resolved

---

### Issue 2: Database Schema Mismatch

**Problem:**
- Error: `Cannot read properties of undefined (reading 'findUnique')`
- Error: `The table 'public.Transcript' does not exist in the current database`
- Error: `The column 'TranscriptionQueue.processingStartedAt' does not exist`

**Root Cause:**
- Prisma schema had models/fields that weren't migrated to the database
- Missing `Transcript` table
- Missing `processingStartedAt` and `retryCount` columns in `TranscriptionQueue` table

**Fixes Applied:**

1. **Created Transcript table:**
   ```bash
   npx prisma migrate dev --name add_transcript_table
   ```

2. **Added missing columns to TranscriptionQueue:**
   - Created SQL script to add `processingStartedAt` and `retryCount` columns
   - Executed via `npx prisma db execute`

3. **Regenerated Prisma Client:**
   ```bash
   npx prisma generate
   ```

**Status:** ✅ Resolved

---

### Issue 3: Prisma Client Not Initialized

**Problem:**
- Error: `Cannot read properties of undefined (reading 'findUnique')`
- API routes failing with undefined `prisma` object

**Root Cause:**
- Prisma client needed to be regenerated after schema changes
- Server needed restart to load new Prisma client

**Fixes Applied:**

1. **Added defensive checks in API routes:**
   ```javascript
   if (!prisma) {
     return NextResponse.json(
       { error: 'Database connection error. Please try again.' },
       { status: 500 }
     );
   }
   if (!prisma.transcriptionQueue) {
     return NextResponse.json(
       { error: 'Database model not available. Please restart the server.' },
       { status: 500 }
     );
   }
   ```

2. **Regenerated Prisma Client:**
   ```bash
   npx prisma generate
   ```

3. **Cleared Next.js cache and restarted server:**
   ```bash
   rm -rf .next
   npm run dev
   ```

**Status:** ✅ Resolved

---

### Issue 4: Transcription Worker "Not Found" Errors

**Problem:**
- All videos returning "Video not found or unavailable" error
- Worker processing videos but yt-dlp failing to download

**Root Cause:**
- yt-dlp's `extract_info()` was being called with just the video ID
- yt-dlp is more reliable when given a full YouTube URL format

**Fixes Attempted:**

#### Fix 4.1: Construct Full YouTube URL
**Change:**
```python
# Before
info = ydl.extract_info(video_id, download=True)

# After
youtube_url = f"https://www.youtube.com/watch?v={video_id}"
info = ydl.extract_info(youtube_url, download=True)
```

**Result:** User rejected this change initially

#### Fix 4.2: Full URL with Fallback
**Change:**
```python
# Try full URL first, fallback to video ID
youtube_url = f"https://www.youtube.com/watch?v={video_id}"

with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    try:
        info = ydl.extract_info(youtube_url, download=True)
    except Exception as e:
        # Fallback: try with just video ID if URL format fails
        logger.warning("Failed with URL format, trying video ID directly: %s", str(e))
        info = ydl.extract_info(video_id, download=True)
```

**Status:** ✅ Applied (commit: `87e48fb`)

**Current Status:** Waiting for Hugging Face Space to rebuild

---

### Issue 5: Missing UI Controls for Queue Management

**Problem:**
- No way to clear failed items from transcription queue
- No way to manually trigger worker processing
- Buttons disappeared when items moved from "pending" to "failed"

**Fixes Applied:**

1. **Added "Process" button:**
   - Manually triggers worker to process pending items
   - Located in TranscriptionProgress component header
   - Only visible when there are pending items

2. **Added "Clear" button:**
   - Removes pending items from queue
   - Only visible when there are pending items

3. **Added "Clear Failed" button:**
   - Removes failed items from queue
   - Visible when there are failed items (and no pending items)

**Files Modified:**
- `src/components/TranscriptionProgress.jsx`
- `app/page.jsx` (added `onQueueUpdate` callback)

**Status:** ✅ Resolved

---

### Issue 7: DNS Resolution Failure - Critical Network Issue

**Problem:**
- Even with `force_ipv4: True`, yt-dlp cannot resolve `www.youtube.com`
- Error: `Failed to resolve 'www.youtube.com' ([Errno -5] No address associated with hostname)`
- This is a **platform-level network restriction**, not a code issue

**Root Cause:**
Hugging Face Spaces appears to have DNS resolution restrictions or network policies that prevent the container from resolving external domains like `www.youtube.com`. This is a fundamental network connectivity issue at the platform level.

**Evidence from Logs:**
```
[debug] yt-dlp version stable@2025.11.12 from yt-dlp/yt-dlp [335653be8] (pip) API
[debug] params: {'force_ipv4': True, ...}
[youtube] Extracting URL: https://www.youtube.com/watch?v=73K6vs4qZqY
WARNING: [youtube] Failed to resolve 'www.youtube.com' ([Errno -5] No address associated with hostname). Retrying (1/3)...
WARNING: [youtube] Failed to resolve 'www.youtube.com' ([Errno -5] No address associated with hostname). Retrying (2/3)...
WARNING: [youtube] Failed to resolve 'www.youtube.com' ([Errno -5] No address associated with hostname). Retrying (3/3)...
ERROR: [youtube] Unable to download API page: Failed to resolve 'www.youtube.com'
```

**Fixes Attempted:**
1. ✅ Updated `yt-dlp` to latest version (unpinned in requirements.txt)
2. ✅ Enabled verbose logging (`quiet: False, verbose: True`)
3. ✅ Added `force_ipv4: True` to yt-dlp options
4. ✅ Constructed full YouTube URL format
5. ❌ **All failed** - DNS resolution still cannot resolve `www.youtube.com`

**Status:** ❌ **CONFIRMED - Platform Limitation**

**Conclusion:**
This is a **Hugging Face Spaces platform limitation**. The container cannot resolve external DNS names, which prevents any outbound HTTP requests to YouTube. This is not fixable through code changes alone.

**Confirmed Evidence:**
- Tested with `force_ipv4: True` - DNS resolution still fails
- Tested with latest yt-dlp version - DNS resolution still fails
- Tested with verbose logging - Shows DNS failure at socket level: `socket.gaierror: [Errno -5] No address associated with hostname`
- Health endpoint works (internal networking OK)
- Authentication works (API accessible)
- **Only DNS resolution fails** - This is a platform network/DNS configuration issue

**Recommended Solutions:**

1. **Deploy to Alternative Platform** (Recommended):
   - **Railway** (https://railway.app) - Supports Docker, good network access
   - **Render** (https://render.com) - Docker support, unrestricted networking
   - **Fly.io** (https://fly.io) - Docker support, global network
   - **Google Cloud Run** - Serverless containers with full network access
   - **AWS ECS/Fargate** - Full control over networking

2. **Use YouTube Data API Instead** (Limitation: No audio download):
   - Use YouTube Data API v3 to get video metadata
   - Would require a different approach (can't download audio for transcription)
   - Not suitable for this use case

3. **Contact Hugging Face Support**:
   - Ask about network restrictions on Spaces
   - Request DNS configuration options
   - Inquire about allowing outbound connections to YouTube

4. **Use Proxy/VPN Service**:
   - Configure a proxy server that the Space can reach
   - Route yt-dlp requests through the proxy
   - Complex setup, may violate Hugging Face Terms of Service


### Environment Variables (.env)
```env
TRANSCRIPTION_WORKER_URL="https://analyticsbyted-tubetime-transcription-worker.hf.space"
TRANSCRIPTION_WORKER_SECRET="7Ztrj+3PftE0HN2uW54VGHf1e464S+YUsgX9K3k5ar0="
```

### Hugging Face Space Configuration
- **Space Name:** `analyticsbyted/tubetime-transcription-worker`
- **SDK:** Docker
- **Port:** 7860
- **Secret:** `TRANSCRIPTION_WORKER_SECRET` (configured in Space settings)

### Database Schema
- ✅ `Transcript` table exists
- ✅ `TranscriptionQueue` table exists with all required columns:
  - `id`, `videoId`, `status`, `priority`, `errorMessage`
  - `createdAt`, `updatedAt`, `completedAt`
  - `processingStartedAt` (added via SQL script)
  - `retryCount` (added via SQL script)
  - `userId` (foreign key to User)

### Worker Code (huggingface-space/app.py)
- ✅ FastAPI application with `/transcribe` endpoint
- ✅ Bearer token authentication
- ✅ yt-dlp for audio extraction
- ✅ Whisper for transcription
- ✅ Full YouTube URL construction with fallback

## Testing Status

### ✅ Working
- Environment variable configuration
- Database schema and migrations
- Prisma client initialization
- Queue management UI (Process, Clear, Clear Failed buttons)
- Error message display

### ❌ Blocked
- **Worker video download** - DNS resolution failure (platform limitation)
- **End-to-end transcription workflow** - Cannot proceed without video download
- **Error handling for various video types** - Cannot test due to DNS issue

### 🔄 Alternative Solutions Required
- Deploy worker to alternative platform (Railway, Render, Fly.io, etc.)
- Or use YouTube Data API (limitation: cannot download audio)

## Next Steps

### ⚠️ Immediate Action Required: Platform Migration

**Hugging Face Spaces is not suitable for this use case** due to DNS resolution restrictions. The following steps are recommended:

1. **Choose Alternative Platform:**
   - **Recommended:** Railway.app (easy Docker deployment, good free tier)
   - **Alternative:** Render.com (Docker support, free tier available)
   - **Alternative:** Fly.io (global network, Docker support)

2. **Migration Steps:**
   - Export current worker code from `huggingface-space/` directory
   - Create new deployment on chosen platform
   - Update `TRANSCRIPTION_WORKER_URL` in `.env` file
   - Test connection using `test_worker_connection.cjs`

3. **If Staying on Hugging Face Spaces:**
   - Contact Hugging Face support about DNS/network restrictions
   - Request network configuration options
   - Consider if there's a way to enable external DNS resolution

### Current Status Verification

1. **Space Status:**
   - ✅ Health endpoint works: `GET https://analyticsbyted-tubetime-transcription-worker.hf.space/`
   - ✅ Returns: `{"status":"ok","model":"distil-whisper/distil-medium.en","device":"cpu"}`
   - ❌ Cannot resolve `www.youtube.com` - DNS failure

2. **Test Results:**
   - ✅ Worker is running and accessible
   - ✅ Authentication works (Bearer token accepted)
   - ❌ Video download fails due to DNS resolution
   - ❌ Transcription cannot proceed without video download

## Known Limitations

1. **Video Duration Limit:** 15 minutes (configured in `MAX_DURATION_SECONDS`)
2. **Worker Timeout:** 5 minutes per video (configured in `transcriptionService.js`)
3. **Concurrent Processing:** Maximum 5 items per worker trigger
4. **Video Accessibility:** Only publicly available videos can be transcribed

## Files Modified

### Backend
- `app/api/transcription-queue/process/route.js` - Added Prisma checks, fixed `transcribeVideo` call
- `app/api/transcription-queue/route.js` - Added Prisma checks for GET and POST
- `src/services/transcriptionService.js` - Fixed function signature (object parameter)
- `src/services/transcriptionWorkerService.js` - Enhanced error handling

### Frontend
- `src/components/TranscriptionProgress.jsx` - Added Process/Clear buttons, improved error display
- `app/page.jsx` - Added `onQueueUpdate` callback

### Worker
- `huggingface-space/app.py` - Full YouTube URL construction with fallback
- `huggingface-space/Dockerfile` - Non-root user, exec-form CMD

### Database
- Created `Transcript` table migration
- Added `processingStartedAt` and `retryCount` columns to `TranscriptionQueue`

## Debugging Commands

### Check Worker Health
```bash
curl https://analyticsbyted-tubetime-transcription-worker.hf.space/
```

### Test Transcription (requires authentication)
```bash
curl -X POST "https://analyticsbyted-tubetime-transcription-worker.hf.space/transcribe" \
  -H "Authorization: Bearer 7Ztrj+3PftE0HN2uW54VGHf1e464S+YUsgX9K3k5ar0=" \
  -H "Content-Type: application/json" \
  -d '{"videoId": "dQw4w9WgXcQ", "language": "en"}'
```

### Check Database Schema
```bash
npx prisma migrate status
npx prisma studio  # Visual database browser
```

### Regenerate Prisma Client
```bash
npx prisma generate
```

## References

- **Hugging Face Space:** https://huggingface.co/spaces/analyticsbyted/tubetime-transcription-worker
- **Worker Repository:** `huggingface-space/` directory
- **Deployment Guide:** `docs/QUICK_DEPLOY_GUIDE.md`
- **Detailed Setup:** `docs/HUGGINGFACE_SPACE_SETUP.md`

## Contact Information

For questions or issues, refer to:
- Project documentation in `docs/` directory
- Hugging Face Space logs for worker-specific errors
- Next.js server logs for API route errors
- Browser console for client-side errors

---

**Last Updated:** November 23, 2024  
**Document Version:** 1.0

