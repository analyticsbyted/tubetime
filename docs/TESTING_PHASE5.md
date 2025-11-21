# Testing Guide: Phase 5 (Transcription Queue) - Database-Only

## Overview

This document provides comprehensive testing scenarios for Phase 5 (Transcription Queue) migration. All operations are database-only (no localStorage fallback) and require authentication.

## Prerequisites

- Application running locally (`npm run dev`)
- Database migrations applied (`npx prisma migrate deploy`)
- Browser DevTools open (Console and Network tabs)
- Access to Prisma Studio for database verification (`npx prisma studio`)

## Important Notes

- **Database-Only:** All operations require authentication. No localStorage fallback.
- **Authentication Required:** Unauthenticated users cannot queue videos.
- **Clean Cutover:** localStorage code has been removed (v4.7.0).

## Phase 5: Transcription Queue Testing

### Test 1: Authenticated User - Add Videos to Queue

**Steps:**
1. Sign in with Google/GitHub
2. Perform a search to get video results
3. Select multiple videos (at least 2-3)
4. Click "Queue for Transcription" button
5. Check browser console for success message
6. Check Network tab - verify POST to `/api/transcription-queue` succeeded

**Expected Results:**
- ✅ Toast notification shows success message (e.g., "Added 3 videos to transcription queue")
- ✅ Network request to `/api/transcription-queue` returns 201 Created
- ✅ Response shows `added` and `skipped` counts
- ✅ Selected videos are cleared from selection
- ✅ No errors in console

**Verify Database:**
```bash
npx prisma studio
# Navigate to TranscriptionQueue table
# Verify entries exist with:
#   - Correct userId
#   - videoId matches selected videos
#   - status = "pending"
#   - priority = 0 (default)
```

### Test 2: Authenticated User - Duplicate Detection

**Steps:**
1. Sign in
2. Select a video and queue it
3. Select the same video again and try to queue it
4. Check response message

**Expected Results:**
- ✅ Toast shows message like "Added 0 videos to transcription queue. 1 already in queue."
- ✅ Response shows `added: 0, skipped: 1`
- ✅ Only one entry in database for that video
- ✅ No duplicate entries created

**Verify Database:**
- Check TranscriptionQueue table - should have only one entry per video per user

### Test 3: Authenticated User - Batch Add with Priority

**Steps:**
1. Sign in
2. Select multiple videos (at least 3)
3. Queue them (default priority 0)
4. Select different videos
5. Queue them with higher priority (if UI supports it, or test via API directly)

**Expected Results:**
- ✅ All videos added successfully
- ✅ Priority values stored correctly in database
- ✅ Queue items ordered by priority (higher first)

**Verify Database:**
- Check TranscriptionQueue table - verify priority values are stored
- Verify items can be queried ordered by priority

### Test 4: Authenticated User - Get Queue

**Steps:**
1. Sign in
2. Queue several videos
3. Check queue via API or UI (if queue UI exists)

**Expected Results:**
- ✅ GET `/api/transcription-queue` returns all queue items
- ✅ Items include video metadata (via relation)
- ✅ Items ordered by priority (desc) then creation time (asc)
- ✅ Response includes `items` array and `total` count

**API Test:**
```bash
# In browser console or via curl:
fetch('/api/transcription-queue')
  .then(r => r.json())
  .then(console.log)
```

### Test 5: Authenticated User - Filter by Status

**Steps:**
1. Sign in
2. Queue several videos
3. Test filtering by status:
   - `GET /api/transcription-queue?status=pending`
   - `GET /api/transcription-queue?status=processing`
   - `GET /api/transcription-queue?status=completed`
   - `GET /api/transcription-queue?status=failed`

**Expected Results:**
- ✅ Each status filter returns only items with that status
- ✅ Empty array if no items match status
- ✅ Invalid status returns all items (or 400 error)

### Test 6: Authenticated User - Update Queue Item Status

**Steps:**
1. Sign in
2. Queue a video
3. Get the queue item ID from database or API response
4. Update status via API:
   ```javascript
   // In browser console:
   fetch('/api/transcription-queue/[ITEM_ID]', {
     method: 'PUT',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ status: 'processing' })
   })
   ```

**Expected Results:**
- ✅ Status updates successfully
- ✅ Valid transitions work (pending → processing)
- ✅ Invalid transitions return 400 error
- ✅ `completedAt` set when status changes to "completed"
- ✅ `completedAt` cleared when moving away from "completed"

**Test Status Transitions:**
- ✅ `pending` → `processing` (valid)
- ✅ `processing` → `completed` (valid)
- ✅ `processing` → `failed` (valid)
- ✅ `failed` → `pending` (valid, for retry)
- ❌ `completed` → `processing` (invalid - should return 400)
- ❌ `pending` → `completed` (invalid - should return 400)

### Test 7: Authenticated User - Remove from Queue (Batch Delete)

**Steps:**
1. Sign in
2. Queue multiple videos (at least 3)
3. Remove videos from queue (via UI if available, or API)
4. Check response

**Expected Results:**
- ✅ DELETE `/api/transcription-queue` with body `{ videoIds: [...] }` removes all specified videos
- ✅ Response shows `removed` count
- ✅ Single API call removes all videos (batch operation)
- ✅ Videos removed from database

**API Test:**
```javascript
// In browser console:
fetch('/api/transcription-queue', {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ videoIds: ['video-id-1', 'video-id-2'] })
})
  .then(r => r.json())
  .then(console.log)
```

**Verify Database:**
- Check TranscriptionQueue table - removed videos should be gone
- Verify only one DELETE request was made (not N+1)

### Test 8: Authenticated User - Clear Queue

**Steps:**
1. Sign in
2. Queue several videos
3. Clear queue (via API or UI if available)
4. Verify queue is empty

**Expected Results:**
- ✅ DELETE `/api/transcription-queue` clears all items
- ✅ Returns 204 No Content
- ✅ All queue items removed from database

**Test with Status Filter:**
- ✅ DELETE `/api/transcription-queue?status=failed` clears only failed items
- ✅ Other status items remain

### Test 9: Authenticated User - Update Priority

**Steps:**
1. Sign in
2. Queue a video
3. Update priority via API:
   ```javascript
   fetch('/api/transcription-queue/[ITEM_ID]', {
     method: 'PUT',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ priority: 10 })
   })
   ```

**Expected Results:**
- ✅ Priority updates successfully
- ✅ Negative priority returns 400 error
- ✅ Queue items ordered by priority (higher first)

### Test 10: Authenticated User - Check if Video is in Queue

**Steps:**
1. Sign in
2. Queue a video
3. Check if video is in queue (via `isInQueue` utility or API)

**Expected Results:**
- ✅ Returns `true` for queued video
- ✅ Returns `false` for non-queued video
- ✅ Works correctly with database query

### Test 11: Unauthenticated User - Cannot Queue Videos

**Steps:**
1. Sign out (or use incognito window)
2. Perform a search
3. Select videos
4. Click "Queue for Transcription"
5. Check console and Network tab

**Expected Results:**
- ✅ Error message shown: "Please sign in to add videos to transcription queue"
- ✅ Network request to `/api/transcription-queue` returns 401 Unauthorized
- ✅ No videos added to queue
- ✅ Clear sign-in prompt (if UI shows it)

**Verify:**
- No entries created in database
- Error message is user-friendly

### Test 12: Unauthenticated User - Cannot View Queue

**Steps:**
1. Sign out
2. Try to get queue (via API or UI)

**Expected Results:**
- ✅ Returns empty array (not error)
- ✅ Network request returns 401 Unauthorized
- ✅ No console errors (expected 401s suppressed)

### Test 13: Clean Cutover Verification - No localStorage

**Steps:**
1. Sign in
2. Queue videos
3. Open DevTools → Application → Local Storage
4. Verify no `tubetime_*` keys exist
5. Sign out
6. Verify localStorage is cleared
7. Sign in again
8. Verify queue persists (from database)

**Expected Results:**
- ✅ No localStorage keys for transcription queue
- ✅ All data comes from database
- ✅ Data persists across sessions (when authenticated)
- ✅ localStorage cleared on sign-out

**Verify Code:**
- Check `src/utils/transcriptionQueue.js` - should have no localStorage code
- Check `app/page.jsx` - should clear localStorage on mount
- Check `src/components/Header.jsx` - should clear localStorage on sign-out

### Test 14: Error Handling - Invalid Status Transition

**Steps:**
1. Sign in
2. Queue a video
3. Try to transition from `pending` directly to `completed`:
   ```javascript
   fetch('/api/transcription-queue/[ITEM_ID]', {
     method: 'PUT',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ status: 'completed' })
   })
   ```

**Expected Results:**
- ✅ Returns 400 Bad Request
- ✅ Error message: "Invalid status transition from 'pending' to 'completed'"
- ✅ Status remains unchanged

### Test 15: Error Handling - Invalid Video ID

**Steps:**
1. Sign in
2. Try to queue invalid video IDs:
   - Empty string
   - Non-string values
   - Very long strings

**Expected Results:**
- ✅ Validation errors returned
- ✅ Invalid IDs filtered out
- ✅ Only valid IDs processed
- ✅ Clear error messages

### Test 16: Error Handling - Network Failure

**Steps:**
1. Sign in
2. Disconnect network (or block API in DevTools)
3. Try to queue videos
4. Reconnect network

**Expected Results:**
- ✅ Error message shown to user
- ✅ No partial state (transaction ensures atomicity)
- ✅ User can retry operation

### Test 17: User Scoping - Cannot Access Other User's Queue

**Steps:**
1. Sign in as User A
2. Queue some videos
3. Note the queue item IDs
4. Sign out
5. Sign in as User B
6. Try to access User A's queue items

**Expected Results:**
- ✅ User B cannot see User A's queue items
- ✅ GET `/api/transcription-queue` returns only User B's items
- ✅ Trying to update/delete User A's items returns 403 Forbidden or 404 Not Found

**Verify Database:**
- Check TranscriptionQueue table - verify `userId` matches current user
- Verify queries are filtered by `userId`

### Test 18: Batch Operations - Large Batch

**Steps:**
1. Sign in
2. Select many videos (10-20)
3. Queue them all at once
4. Check response time and database

**Expected Results:**
- ✅ All videos added in single transaction
- ✅ Response shows correct `added` and `skipped` counts
- ✅ Database transaction ensures atomicity
- ✅ Performance is acceptable (single API call)

**Verify Database:**
- All videos should be in queue (or skipped if duplicates)
- Transaction ensures all-or-nothing

### Test 19: Priority Ordering

**Steps:**
1. Sign in
2. Queue videos with different priorities:
   - Video A: priority 0
   - Video B: priority 5
   - Video C: priority 10
3. Get queue and verify ordering

**Expected Results:**
- ✅ Queue items ordered by priority (desc) then creation time (asc)
- ✅ Higher priority items appear first
- ✅ Same priority items ordered by creation time

### Test 20: Video Upsert Logic

**Steps:**
1. Sign in
2. Queue a video (creates Video record if not exists)
3. Queue the same video again (should update existing Video record)
4. Check Video table in database

**Expected Results:**
- ✅ Video record created if doesn't exist
- ✅ Video record updated if exists (or no-op)
- ✅ TranscriptionQueue item links to Video record

**Verify Database:**
- Check Video table - verify video records exist
- Check TranscriptionQueue table - verify `videoId` foreign key works

## Clean Cutover Verification

### Verify localStorage Cleanup

1. **On App Load:**
   - Open DevTools → Application → Local Storage
   - Verify no `tubetime_*` keys exist
   - Check console - no localStorage errors

2. **On Sign-Out:**
   - Sign out
   - Verify localStorage is cleared
   - Check DevTools - no `tubetime_*` keys

3. **Code Verification:**
   - `src/utils/transcriptionQueue.js` - no localStorage code
   - `app/page.jsx` - clears localStorage on mount
   - `src/components/Header.jsx` - clears localStorage on sign-out

## Test Results Template

Use this template to track your testing progress:

```
Test 1: Authenticated User - Add Videos to Queue
Status: [ ] Pass [ ] Fail
Notes: 

Test 2: Authenticated User - Duplicate Detection
Status: [ ] Pass [ ] Fail
Notes: 

... (continue for all tests)
```

## Success Criteria

All tests should pass with:
- ✅ No localStorage dependencies
- ✅ All operations require authentication
- ✅ Clear error messages for unauthenticated users
- ✅ Database is single source of truth
- ✅ Status transitions work correctly
- ✅ Batch operations are efficient
- ✅ User scoping is enforced
- ✅ No console errors (except expected 401s which are suppressed)

## Troubleshooting

### Issue: "Please sign in" errors when signed in
- **Check:** Session might have expired, try signing in again
- **Check:** Verify NextAuth.js session is working

### Issue: Queue items not appearing
- **Check:** Verify database connection
- **Check:** Check Network tab for API errors
- **Check:** Verify user is authenticated

### Issue: Status transitions failing
- **Check:** Verify current status in database
- **Check:** Verify transition is valid (see status transition rules)

### Issue: localStorage still being used
- **Check:** Verify clean cutover was applied (v4.7.0)
- **Check:** Clear browser cache and reload
- **Check:** Verify code doesn't have localStorage references

## Next Steps After Testing

Once all tests pass:
1. ✅ Mark Phase 5 testing as complete in `MIGRATION_PLAN.md`
2. ✅ Update `TRANSCRIPTION_QUEUE_IMPLEMENTATION_SUMMARY.md` with testing results
3. ✅ Consider Phase 6: Transcription Worker implementation

