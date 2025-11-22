# Transcription Workflow Guide

This guide explains how to process queued videos and get transcriptions.

## Overview

1. **Queue Videos**: Select videos and click "Queue for Transcription"
2. **Process Queue**: Trigger the transcription worker to process pending items
3. **View Transcripts**: Once complete, view transcripts via the badge or Transcripts page

## Processing the Queue

### Option 1: Manual Trigger (Development/Testing)

For local development or testing, you can manually trigger the worker:

```bash
# Using curl
curl -X POST http://localhost:3000/api/transcription-worker \
  -H "Authorization: Bearer YOUR_TRANSCRIPTION_WORKER_SECRET" \
  -H "Content-Type: application/json"

# Or using the secret as a query parameter
curl -X POST "http://localhost:3000/api/transcription-worker?secret=YOUR_TRANSCRIPTION_WORKER_SECRET"
```

**Response:**
```json
{
  "processed": 1,
  "completed": 1,
  "failed": 0,
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

### Option 2: Automated Cron Job (Production)

For production, set up a cron job to automatically process the queue:

#### Using a Cron Service (Recommended)

**Option A: Vercel Cron Jobs** (if deployed on Vercel)
1. Create `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/transcription-worker",
    "schedule": "*/5 * * * *"
  }]
}
```

2. Add environment variable in Vercel dashboard:
   - `TRANSCRIPTION_WORKER_SECRET`: Your secret key

**Option B: External Cron Service** (e.g., cron-job.org, EasyCron)
1. Set up a scheduled HTTP request:
   - URL: `https://your-domain.com/api/transcription-worker`
   - Method: POST
   - Headers: `Authorization: Bearer YOUR_SECRET`
   - Schedule: Every 5 minutes (or as needed)

**Option C: Server Cron** (if you have server access)
```bash
# Add to crontab (runs every 5 minutes)
*/5 * * * * curl -X POST https://your-domain.com/api/transcription-worker -H "Authorization: Bearer YOUR_SECRET"
```

### Option 3: Check Queue Status

You can check the queue status via the API:

```bash
# Get queue statistics
curl http://localhost:3000/api/transcription-worker \
  -H "Authorization: Bearer YOUR_TRANSCRIPTION_WORKER_SECRET"
```

**Response:**
```json
{
  "queueStats": {
    "pending": 1,
    "processing": 0,
    "completed": 5,
    "failed": 0
  },
  "workerHealth": {
    "status": "ok",
    "model": "distil-whisper/distil-medium.en"
  }
}
```

## Viewing Transcripts

Once a video is transcribed:

1. **Via Video Card Badge**: 
   - The transcript badge will show "Transcript" (green)
   - Click the badge to open the transcript modal

2. **Via Transcripts Page**:
   - Navigate to `/transcripts` (link in header)
   - Browse all your transcripts
   - Click any transcript to view it

## Queue Status Indicators

- **No Badge**: Video not queued or transcript not available
- **"Processing..." Badge**: Currently being transcribed
- **"Transcript" Badge**: Ready to view (click to open)
- **"Failed" Badge**: Transcription failed (check error message)

## Troubleshooting

### Worker Not Processing

1. **Check Environment Variables**:
   - `TRANSCRIPTION_WORKER_URL`: URL of your Hugging Face Space
   - `TRANSCRIPTION_WORKER_SECRET`: Secret key (must match on both sides)

2. **Check Worker Health**:
   ```bash
   curl http://localhost:3000/api/transcription-worker \
     -H "Authorization: Bearer YOUR_SECRET"
   ```

3. **Check Queue Status**:
   - View queue in database: `npx prisma studio`
   - Check for pending items with status "pending"

### Videos Stuck in "Processing"

- Check worker logs for errors
- Videos may have timed out (5-minute timeout)
- Retry failed items by updating status back to "pending"

### Transcript Not Appearing

- Wait a few minutes for processing to complete
- Check the queue status to see if processing completed
- Refresh the page to update badge status
- Check browser console for errors

