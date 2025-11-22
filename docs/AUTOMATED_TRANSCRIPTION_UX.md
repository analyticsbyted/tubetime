# Automated Transcription UX

## Overview

The transcription workflow is now fully automated after a user queues videos. The system handles:
- Automatic worker triggering
- Real-time progress updates
- Time estimates
- Auto-opening transcripts when ready
- Visual feedback throughout the process

## User Flow

### 1. Queue Videos
- User selects videos and clicks "Queue for Transcription"
- Videos are validated (duration, duplicates, etc.)
- Success message: "X videos queued. Processing will begin shortly..."

### 2. Automatic Processing
- System automatically triggers the transcription worker
- No manual intervention required
- Worker processes up to 5 videos per run

### 3. Real-Time Progress
- **TranscriptionProgress Component**: Shows in top-right corner
- **Status Indicators**:
  - 🟡 **Pending**: Waiting to process (shows estimated time)
  - 🔵 **Processing**: Currently transcribing (shows remaining time)
  - 🟢 **Completed**: Transcript ready (click to view)
  - 🔴 **Failed**: Error occurred (shows error message)

### 4. Time Estimates
- Based on video duration
- Formula: ~1 minute of processing per minute of video
- Minimum: 30 seconds
- Maximum: 5 minutes
- Updates in real-time during processing

### 5. Auto-Open Transcript
- When a recently queued video completes, transcript modal opens automatically
- Toast notification: "Transcript ready for [video title]!"
- User can immediately view, search, copy, or export

## Components

### `TranscriptionProgress.jsx`
- Fixed position in top-right corner
- Shows all active queue items
- Groups by status (processing, pending, completed, failed)
- Displays time estimates and progress
- Click "View Transcript" to open completed items

### `useTranscriptionQueue.js`
- Polls queue API every 5 seconds
- Automatically updates when status changes
- Handles authentication gracefully
- Can be filtered by status

### `app/api/transcription-queue/process/route.js`
- User-facing API route (requires authentication)
- Wraps worker processing logic
- Only processes user's own queue items
- Returns processing results

## Technical Details

### Auto-Trigger Logic
```javascript
// In app/page.jsx
const triggerWorkerAutomatically = async () => {
  if (isProcessingQueue) return;
  setIsProcessingQueue(true);
  try {
    await triggerWorker({ maxItems: 5 });
    await refetchQueue();
  } catch (error) {
    // Silently handle - worker might not be configured
    // Queue will be processed by cron job
  } finally {
    setIsProcessingQueue(false);
  }
};
```

### Auto-Open Logic
```javascript
// Watches for completed items in recently queued videos
useEffect(() => {
  const completedItems = transcriptionQueue.items.filter(
    item => item.status === 'completed' && recentlyQueuedVideos.has(item.videoId)
  );
  
  if (completedItems.length > 0) {
    setTranscriptModalVideoId(firstCompleted.videoId);
    toast.success(`Transcript ready!`);
  }
}, [transcriptionQueue, recentlyQueuedVideos]);
```

## Fallback Behavior

If the worker is not configured or fails:
- Videos remain in queue
- Progress panel still shows status
- Cron job or manual trigger can process later
- No errors shown to user (graceful degradation)

## Future Enhancements

- [ ] WebSocket support for real-time updates (instead of polling)
- [ ] Batch processing progress bar
- [ ] Notification system for completed transcriptions
- [ ] Retry failed transcriptions with one click
- [ ] Estimated completion time for entire queue

