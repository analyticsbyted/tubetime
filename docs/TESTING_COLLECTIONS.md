# Collections Feature Testing Guide

This document provides a systematic testing plan for the Collections feature frontend integration with dual-write pattern.

## Prerequisites

Before testing, ensure:
- ✅ Development server is running: `npm run dev`
- ✅ Database is accessible: `npx prisma studio` opens successfully
- ✅ Environment variables are configured (`.env.local`)
- ✅ Authentication providers (Google/GitHub) are configured

## Testing Scenarios

### 1. Authenticated Flow (Database Primary) ⭐ HIGH PRIORITY

**Objective:** Verify that authenticated users can create, manage, and persist collections in the database.

#### Test Steps:

1. **Sign In**
   - Click "Sign In" button in header
   - Select Google or GitHub provider
   - Complete OAuth flow
   - ✅ Verify: User avatar and name appear in header
   - ✅ Verify: "Sign Out" button is visible

2. **Create Collection**
   - Perform a video search (e.g., "SpaceX launch" with date range)
   - Select 2-3 videos using checkboxes
   - Click "Save Collection" button in ActionBar
   - Enter collection name: "Test Collection 1"
   - Click "Save Collection" button
   - ✅ Verify: Toast notification shows success message
   - ✅ Verify: Modal closes after save
   - ✅ Verify: Collection name is cleared

3. **Verify Database Persistence**
   - Open Prisma Studio: `npx prisma studio`
   - Navigate to `Collection` table
   - ✅ Verify: Collection "Test Collection 1" exists
   - ✅ Verify: Collection has correct `userId` (matches your user ID)
   - ✅ Verify: `createdAt` and `updatedAt` timestamps are set
   - Navigate to `Video` table
   - ✅ Verify: Videos from collection exist in Video table
   - ✅ Verify: Video metadata (title, channelTitle, publishedAt, thumbnailUrl) is correct
   - Navigate to `VideosInCollections` table
   - ✅ Verify: Join records exist linking videos to collection
   - ✅ Verify: `assignedAt` timestamps are set

4. **Verify localStorage Persistence**
   - Open browser DevTools → Application → Local Storage
   - Look for key: `tubetime_collections`
   - ✅ Verify: Collection exists in localStorage
   - ✅ Verify: Collection has same name and video IDs
   - ✅ Verify: Video metadata is stored in localStorage

5. **Add More Videos to Collection**
   - Perform another search
   - Select 1-2 more videos
   - Click "Save Collection" → Select existing collection (if UI supports) OR create new collection
   - ✅ Verify: Videos are added successfully
   - ✅ Verify: Database shows updated collection with new videos
   - ✅ Verify: localStorage is updated

6. **Update Collection Name**
   - If UI supports editing, update collection name
   - OR use API directly: `PUT /api/collections/[id]` with new name
   - ✅ Verify: Database shows updated name
   - ✅ Verify: `updatedAt` timestamp is updated

7. **Delete Collection**
   - Delete a collection (if UI supports) OR use API: `DELETE /api/collections/[id]`
   - ✅ Verify: Collection is removed from database
   - ✅ Verify: VideosInCollections records are cascade deleted
   - ✅ Verify: Videos remain in Video table (not cascade deleted)

**Expected Results:**
- All operations succeed
- Data persists in both database and localStorage
- Toast notifications are clear and helpful
- No console errors

---

### 2. Unauthenticated Flow (localStorage Fallback) ⭐ HIGH PRIORITY

**Objective:** Verify that unauthenticated users can still save collections locally.

#### Test Steps:

1. **Sign Out**
   - Click "Sign Out" button
   - ✅ Verify: User is logged out
   - ✅ Verify: "Sign In" button appears in header

2. **Create Collection (Unauthenticated)**
   - Perform a video search
   - Select 2-3 videos
   - Click "Save Collection" button
   - ✅ Verify: Info message appears: "Sign in to sync"
   - ✅ Verify: Message explains local save vs cloud sync
   - Enter collection name: "Local Test Collection"
   - Click "Save Collection"
   - ✅ Verify: Toast shows: "Collection saved locally!"
   - ✅ Verify: Toast description mentions signing in to sync

3. **Verify localStorage Only**
   - Open browser DevTools → Application → Local Storage
   - ✅ Verify: Collection exists in `tubetime_collections`
   - ✅ Verify: Collection has correct name and videos
   - Open Prisma Studio
   - ✅ Verify: Collection does NOT exist in database (as expected)

4. **Sign In After Local Save**
   - Sign in with same account
   - Create a new collection while authenticated
   - ✅ Verify: New collection is saved to both database and localStorage
   - ✅ Verify: Old local-only collection remains in localStorage

**Expected Results:**
- Unauthenticated users can save collections locally
- Clear messaging about local vs cloud storage
- No errors or crashes
- Sign-in prompt is helpful but not blocking

---

### 3. Dual-Write Behavior (Advanced) ⭐ MEDIUM PRIORITY

**Objective:** Verify graceful handling when database writes fail but localStorage succeeds.

#### Test Steps:

1. **Simulate Database Write Failure**
   - **Option A:** Temporarily break API route (comment out database code)
   - **Option B:** Disconnect from internet after sign-in
   - **Option C:** Use browser DevTools → Network tab → Throttle to "Offline"
   - Sign in (if not already)
   - Create a collection with videos
   - ✅ Verify: Database write fails (check Network tab for 500/network error)
   - ✅ Verify: localStorage write succeeds
   - ✅ Verify: Toast shows warning: "Collection saved locally. Cloud save failed..."
   - ✅ Verify: Collection is usable in UI (from localStorage)

2. **Simulate localStorage Write Failure**
   - **Option A:** Fill localStorage quota (add large data manually)
   - **Option B:** Disable localStorage in browser settings
   - Sign in
   - Create a collection
   - ✅ Verify: Database write succeeds
   - ✅ Verify: localStorage write fails
   - ✅ Verify: Toast shows: "Collection saved to cloud! Local save failed..."
   - ✅ Verify: Collection is accessible (from database)

3. **Simulate Both Failures**
   - Break both database and localStorage
   - Attempt to save collection
   - ✅ Verify: Error toast appears
   - ✅ Verify: User-friendly error message
   - ✅ Verify: No data corruption

4. **Session Expiration During Save**
   - Sign in
   - Wait for session to expire OR manually expire session
   - Attempt to save collection
   - ✅ Verify: Database write fails with Unauthorized
   - ✅ Verify: localStorage write succeeds
   - ✅ Verify: Toast shows: "Session expired. Saving locally..."

**Expected Results:**
- Graceful degradation in all failure scenarios
- User data is never lost
- Clear error messages
- Application remains functional

---

### 4. Error Handling & User Feedback ⭐ MEDIUM PRIORITY

**Objective:** Verify proper error handling and user-friendly feedback.

#### Test Steps:

1. **Validation Errors**
   - Try to save collection with empty name
   - ✅ Verify: Toast error: "Please enter a collection name"
   - ✅ Verify: Save button is disabled when name is empty
   - ✅ Verify: Modal does not close

2. **Network Errors**
   - Throttle network to "Slow 3G" or "Offline"
   - Attempt to save collection (authenticated)
   - ✅ Verify: Appropriate error message appears
   - ✅ Verify: localStorage fallback works
   - ✅ Verify: No infinite loading states

3. **Unauthorized Errors**
   - Sign out
   - Try to access collections API directly (if possible)
   - ✅ Verify: 401 error is handled gracefully
   - ✅ Verify: User is prompted to sign in

4. **Duplicate Video Handling**
   - Add same video to collection twice
   - ✅ Verify: Second attempt shows: "Video is already in this collection"
   - ✅ Verify: No duplicate entries in database
   - ✅ Verify: No errors or crashes

5. **Large Collection Handling**
   - Create collection with 50+ videos
   - ✅ Verify: All videos are added successfully
   - ✅ Verify: Performance is acceptable
   - ✅ Verify: No timeout errors

**Expected Results:**
- All errors are caught and handled
- Error messages are user-friendly
- No crashes or unhandled exceptions
- Application state remains consistent

---

### 5. Edge Cases ⭐ LOW PRIORITY

**Objective:** Test edge cases and boundary conditions.

#### Test Steps:

1. **Empty Collection**
   - Try to create collection with no videos selected
   - ✅ Verify: Appropriate validation/error message

2. **Special Characters in Name**
   - Create collection with name: "Test & Collection < > ' \" "
   - ✅ Verify: Name is saved correctly
   - ✅ Verify: No HTML/script injection issues

3. **Very Long Collection Name**
   - Create collection with 200+ character name
   - ✅ Verify: Name is truncated or validated appropriately

4. **Concurrent Saves**
   - Open two browser tabs
   - Sign in to both
   - Create collections simultaneously
   - ✅ Verify: Both saves succeed
   - ✅ Verify: No race conditions

5. **Video Metadata Edge Cases**
   - Add video with missing thumbnailUrl
   - Add video with invalid publishedAt format
   - ✅ Verify: Appropriate validation/error handling

**Expected Results:**
- Edge cases are handled gracefully
- No security vulnerabilities
- Data integrity is maintained

---

## Verification Checklist

After completing all test scenarios, verify:

### Database Integrity
- [ ] All collections have valid `userId` foreign keys
- [ ] All VideosInCollections records reference valid collections and videos
- [ ] Cascade deletes work correctly
- [ ] No orphaned records

### localStorage Integrity
- [ ] Collections are stored in correct format
- [ ] Video metadata is complete
- [ ] No corrupted data
- [ ] Quota limits are respected

### User Experience
- [ ] Loading states are clear
- [ ] Error messages are helpful
- [ ] Success messages are informative
- [ ] No UI glitches or flickering

### Performance
- [ ] Collections load quickly
- [ ] Large collections don't cause lag
- [ ] Network requests are optimized
- [ ] No memory leaks

---

## Common Issues & Solutions

### Issue: "Unauthorized" errors even when signed in
**Solution:** Check that `NEXTAUTH_SECRET` is set and session is valid. Clear cookies and sign in again.

### Issue: Videos not appearing in collection
**Solution:** Check Network tab for API errors. Verify video metadata format matches API expectations.

### Issue: localStorage quota exceeded
**Solution:** Clear old localStorage data or implement cleanup logic.

### Issue: Database connection errors
**Solution:** Verify `DATABASE_URL` is correct and Neon database is active (not paused).

---

## Testing Tools

- **Prisma Studio:** `npx prisma studio` - Visual database browser
- **Browser DevTools:** Network tab, Application tab (localStorage)
- **Postman/Thunder Client:** Test API routes directly
- **Console Logs:** Check for errors and warnings

---

## Next Steps After Testing

1. Document any bugs found
2. Create issues/tickets for fixes
3. Update documentation based on findings
4. Consider performance optimizations
5. Plan for bulk operations enhancement

---

## Notes

- During dual-write period, both database and localStorage should have data
- After migration period, localStorage writes can be removed
- Consider implementing a migration script to move localStorage data to database for existing users

