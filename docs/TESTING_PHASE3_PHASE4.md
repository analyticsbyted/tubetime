# Testing Guide: Phase 3 (Search History) & Phase 4 (Favorites)

## Overview

This document provides comprehensive testing scenarios for Phase 3 (Search History) and Phase 4 (Favorites) migrations. Test systematically to ensure all functionality works correctly with the dual-write pattern.

## Prerequisites

- Application running locally (`npm run dev`)
- Database migrations applied (`npx prisma migrate deploy`)
- Browser DevTools open (Console and Network tabs)
- Access to browser localStorage (DevTools → Application → Local Storage)

## Phase 3: Search History Testing

### Test 1: Authenticated User - Save Search History

**Steps:**
1. Sign in with Google/GitHub
2. Perform a search with query "test search"
3. Add date filters (start date and end date)
4. Add channel filter
5. Add duration/language filters
6. Check browser console for any errors
7. Check Network tab - verify POST to `/api/search-history` succeeded
8. Open Search History modal (click history icon)
9. Verify the search appears in history with all parameters

**Expected Results:**
- ✅ Search saved to database (check Network tab - 201 Created)
- ✅ Search saved to localStorage (check DevTools → Application → Local Storage → `tubetime_search_history`)
- ✅ History modal shows the search entry
- ✅ All search parameters are displayed correctly
- ✅ Timestamp shows relative time ("Just now", "1m ago", etc.)

**Verify Database:**
```bash
npx prisma studio
# Navigate to SearchHistory table
# Verify entry exists with correct userId, query, dates, filters
```

### Test 2: Authenticated User - Duplicate Detection

**Steps:**
1. Sign in
2. Perform search "duplicate test"
3. Immediately perform the same search again (within 1 minute)
4. Open Search History modal
5. Verify only one entry exists (or timestamp was updated)

**Expected Results:**
- ✅ Database returns 200 OK (update) instead of 201 Created
- ✅ Only one entry in history (or timestamp refreshed)
- ✅ No duplicate entries

### Test 3: Authenticated User - Get History

**Steps:**
1. Sign in
2. Perform multiple searches (at least 3)
3. Open Search History modal
4. Verify all searches appear
5. Verify they're ordered by most recent first
6. Click on a history entry
7. Verify search parameters are restored correctly

**Expected Results:**
- ✅ All searches appear in history
- ✅ Ordered by most recent first
- ✅ Clicking entry restores all search parameters
- ✅ Search executes with restored parameters

### Test 4: Authenticated User - Clear History

**Steps:**
1. Sign in
2. Perform several searches
3. Open Search History modal
4. Click "Clear All"
5. Confirm deletion
6. Verify history is empty
7. Check localStorage - should be empty
8. Check database - should be empty (via Prisma Studio)

**Expected Results:**
- ✅ History modal shows empty state
- ✅ localStorage cleared (`tubetime_search_history` removed or empty)
- ✅ Database cleared (no entries for user in SearchHistory table)
- ✅ No errors in console

### Test 5: Unauthenticated User - Save to localStorage Only

**Steps:**
1. Sign out (or use incognito window)
2. Perform a search
3. Check Network tab - verify no API call to `/api/search-history` (or 401 if attempted)
4. Check localStorage - verify entry exists
5. Open Search History modal
6. Verify search appears

**Expected Results:**
- ✅ No database save attempted (or 401 error if attempted)
- ✅ Search saved to localStorage only
- ✅ History modal shows localStorage entries
- ✅ No console errors

### Test 6: Unauthenticated User - Get History from localStorage

**Steps:**
1. Sign out
2. Perform multiple searches
3. Open Search History modal
4. Verify all searches appear
5. Click on a history entry
6. Verify search executes correctly

**Expected Results:**
- ✅ All localStorage searches appear
- ✅ Clicking entry works correctly
- ✅ No API calls attempted

### Test 7: Dual-Write Failure Scenarios

**Test 7a: Database Write Fails, localStorage Succeeds**
- Simulate: Temporarily break API route or disconnect network
- Steps:
  1. Sign in
  2. Open Network tab → Throttle to "Offline" or break API route
  3. Perform a search
  4. Check console for warnings
  5. Check localStorage - entry should exist
  6. Restore network/API
  7. Perform another search
  8. Verify both entries appear (localStorage + new database entry)

**Expected Results:**
- ✅ localStorage entry created successfully
- ✅ Console shows warning about database failure
- ✅ No error thrown to user
- ✅ After network restore, new searches work normally

**Test 7b: localStorage Write Fails, Database Succeeds**
- Simulate: Disable localStorage or fill quota
- Steps:
  1. Sign in
  2. Fill localStorage quota (or disable in DevTools)
  3. Perform a search
  4. Check console for errors
  5. Check database - entry should exist
  6. Check localStorage - may be empty or reduced

**Expected Results:**
- ✅ Database entry created successfully
- ✅ Console shows localStorage error
- ✅ Search history still works (reads from database)
- ✅ No error thrown to user

### Test 8: Edge Cases

**Test 8a: Empty Search (should not save)**
- Steps:
  1. Sign in
  2. Perform search with empty query and empty channel
  3. Verify no history entry created

**Test 8b: Channel-Only Search**
- Steps:
  1. Sign in
  2. Search by channel only (no query)
  3. Verify history entry shows channel name
  4. Verify all parameters saved correctly

**Test 8c: Search with All Filters**
- Steps:
  1. Sign in
  2. Perform search with: query, channel, dates, duration, language, order, maxResults
  3. Verify all parameters saved
  4. Click history entry
  5. Verify all parameters restored

**Test 8d: Automatic Cleanup (50 entries limit)**
- Steps:
  1. Sign in
  2. Perform 55+ searches (or manually add entries via API)
  3. Verify only last 50 entries exist in database
  4. Check cleanup logic works

## Phase 4: Favorites Testing

### Test 1: Authenticated User - Save Favorite Search

**Steps:**
1. Sign in
2. Perform a search with query "favorite test"
3. Click star icon in search bar (or use "Save Favorite" button)
4. Check Network tab - verify POST to `/api/favorites` succeeded
5. Check localStorage - verify entry exists
6. Open Favorites sidebar
7. Verify favorite appears under "Searches"

**Expected Results:**
- ✅ Favorite saved to database (201 Created)
- ✅ Favorite saved to localStorage
- ✅ Favorites sidebar shows the favorite
- ✅ All search parameters saved correctly

**Verify Database:**
```bash
npx prisma studio
# Navigate to Favorite table
# Verify entry exists with type='search', correct userId, name, data
```

### Test 2: Authenticated User - Save Favorite Channel

**Steps:**
1. Sign in
2. Perform a search
3. In Search Stats, click star icon next to a channel name
4. Check Network tab - verify POST to `/api/favorites` succeeded
5. Open Favorites sidebar
6. Verify favorite appears under "Channels"

**Expected Results:**
- ✅ Favorite saved to database
- ✅ Favorite saved to localStorage
- ✅ Favorites sidebar shows channel under "Channels"
- ✅ Star icon shows as filled/active

### Test 3: Authenticated User - Duplicate Detection

**Steps:**
1. Sign in
2. Save favorite "test favorite" (search type)
3. Try to save "test favorite" again (same name, same type)
4. Check Network tab - verify 200 OK (update) instead of 201 Created
5. Verify only one favorite exists

**Expected Results:**
- ✅ Database returns 200 OK (update existing)
- ✅ Only one favorite with that name+type
- ✅ Data updated if different

### Test 4: Authenticated User - Get Favorites

**Steps:**
1. Sign in
2. Save multiple favorites (both searches and channels)
3. Open Favorites sidebar
4. Verify all favorites appear
5. Verify they're grouped by type (Searches vs Channels)
6. Verify they're ordered by most recent first
7. Click on a favorite
8. Verify search parameters are restored correctly

**Expected Results:**
- ✅ All favorites appear
- ✅ Correctly grouped by type
- ✅ Ordered by most recent first
- ✅ Clicking favorite restores search correctly

### Test 5: Authenticated User - Delete Favorite

**Steps:**
1. Sign in
2. Save a favorite
3. Open Favorites sidebar
4. Hover over favorite → click trash icon
5. Verify favorite disappears
6. Check Network tab - verify DELETE to `/api/favorites/[id]` succeeded
7. Check localStorage - entry should be removed
8. Check database - entry should be removed

**Expected Results:**
- ✅ Favorite removed from UI immediately
- ✅ Database entry deleted (204 No Content)
- ✅ localStorage entry deleted
- ✅ No errors in console

### Test 6: Authenticated User - Toggle Favorite (SearchStats)

**Steps:**
1. Sign in
2. Perform a search
3. In Search Stats, click star icon next to a channel
4. Verify star fills and toast shows "added to favorites"
5. Click star again
6. Verify star unfills and toast shows "removed from favorites"
7. Verify favorite appears/disappears in Favorites sidebar

**Expected Results:**
- ✅ Star icon toggles correctly
- ✅ Toast notifications show correct messages
- ✅ Favorite added/removed from database
- ✅ Favorite added/removed from localStorage
- ✅ Favorites sidebar updates correctly

### Test 7: Unauthenticated User - Save to localStorage Only

**Steps:**
1. Sign out (or use incognito window)
2. Perform a search
3. Try to save favorite (click star or "Save Favorite")
4. Check Network tab - verify no API call (or 401 if attempted)
5. Check localStorage - verify entry exists
6. Open Favorites sidebar
7. Verify favorite appears

**Expected Results:**
- ✅ No database save attempted (or 401 error)
- ✅ Favorite saved to localStorage only
- ✅ Favorites sidebar shows localStorage entries
- ✅ No console errors

### Test 8: Unauthenticated User - Get Favorites from localStorage

**Steps:**
1. Sign out
2. Save multiple favorites (localStorage only)
3. Open Favorites sidebar
4. Verify all favorites appear
5. Click on a favorite
6. Verify search executes correctly

**Expected Results:**
- ✅ All localStorage favorites appear
- ✅ Clicking favorite works correctly
- ✅ No API calls attempted

### Test 9: Dual-Write Failure Scenarios

**Test 9a: Database Write Fails, localStorage Succeeds**
- Steps:
  1. Sign in
  2. Throttle network to "Offline" or break API route
  3. Try to save favorite
  4. Check console for warnings
  5. Check localStorage - entry should exist
  6. Restore network
  7. Save another favorite
  8. Verify both appear

**Expected Results:**
- ✅ localStorage entry created
- ✅ Console shows warning
- ✅ No error thrown to user
- ✅ After restore, new favorites work normally

**Test 9b: localStorage Write Fails, Database Succeeds**
- Steps:
  1. Sign in
  2. Disable localStorage or fill quota
  3. Try to save favorite
  4. Check console for errors
  5. Check database - entry should exist
  6. Verify favorite still works (reads from database)

**Expected Results:**
- ✅ Database entry created
- ✅ Console shows localStorage error
- ✅ Favorites still work (reads from database)
- ✅ No error thrown to user

### Test 10: ID Format Handling

**Test 10a: Database ID (cuid format)**
- Steps:
  1. Sign in
  2. Save favorite (gets database ID)
  3. Delete favorite
  4. Verify deletion works correctly

**Test 10b: localStorage ID (favorite_ prefix)**
- Steps:
  1. Sign out
  2. Save favorite (gets localStorage ID)
  3. Sign in
  4. Delete favorite
  5. Verify deletion works correctly (deletes from localStorage)

**Expected Results:**
- ✅ Both ID formats handled correctly
- ✅ Deletion works for both formats
- ✅ No errors

### Test 11: Edge Cases

**Test 11a: Empty Favorite Name (should fail)**
- Steps:
  1. Sign in
  2. Try to save favorite with empty name
  3. Verify error message shown

**Test 11b: Invalid Favorite Type (should fail)**
- Steps:
  1. Sign in
  2. Try to save favorite with invalid type
  3. Verify error message shown

**Test 11c: Favorite with All Search Parameters**
- Steps:
  1. Sign in
  2. Save favorite with all parameters (query, channel, dates, filters)
  3. Click favorite
  4. Verify all parameters restored correctly

**Test 11d: Favorite Name Case Sensitivity**
- Steps:
  1. Sign in
  2. Save favorite "Test"
  3. Try to save favorite "test" (different case)
  4. Verify treated as duplicate (updates existing)

## Cross-Phase Testing

### Test 12: Migration Scenario (localStorage → Database)

**Steps:**
1. Sign out
2. Save several favorites and search history entries (localStorage only)
3. Sign in
4. Verify:
   - Old localStorage favorites still visible
   - New favorites saved to both database and localStorage
   - Old localStorage search history still visible
   - New searches saved to both database and localStorage

**Expected Results:**
- ✅ Old localStorage data still accessible
- ✅ New data saved to both systems
- ✅ No data loss
- ✅ Smooth transition

### Test 13: Session Expiration

**Steps:**
1. Sign in
2. Save favorites and search history
3. Let session expire (or manually expire)
4. Try to save new favorite/search
5. Verify:
   - Falls back to localStorage
   - User prompted to sign in (if applicable)
   - No errors thrown

**Expected Results:**
- ✅ Graceful fallback to localStorage
- ✅ User-friendly error messages
- ✅ No crashes

## Performance Testing

### Test 14: Large Data Sets

**Test 14a: Many Search History Entries**
- Steps:
  1. Sign in
  2. Perform 50+ searches
  3. Verify:
   - History loads quickly
   - Only last 50 shown in database
   - UI remains responsive

**Test 14b: Many Favorites**
- Steps:
  1. Sign in
  2. Save 50+ favorites
  3. Verify:
   - Favorites sidebar loads quickly
   - UI remains responsive
   - No performance degradation

## Browser Compatibility

### Test 15: Different Browsers

Test on:
- Chrome/Edge (Chromium)
- Firefox
- Safari
- Mobile browsers (if applicable)

Verify:
- localStorage works correctly
- API calls work correctly
- No browser-specific errors

## Error Handling Verification

### Test 16: Network Errors

**Steps:**
1. Sign in
2. Open DevTools → Network → Throttle to "Slow 3G"
3. Perform operations (save history, save favorite)
4. Verify:
   - Appropriate error handling
   - User-friendly messages
   - Fallback to localStorage works

### Test 17: API Errors

**Steps:**
1. Sign in
2. Temporarily break API routes (return 500 errors)
3. Perform operations
4. Verify:
   - Errors caught and handled
   - User-friendly error messages
   - Fallback to localStorage works

## Checklist Summary

### Phase 3: Search History
- [ ] Authenticated save works (database + localStorage)
- [ ] Unauthenticated save works (localStorage only)
- [ ] Duplicate detection works
- [ ] Get history works (database priority)
- [ ] Clear history works (both systems)
- [ ] History restoration works (all parameters)
- [ ] Dual-write failure scenarios handled
- [ ] Edge cases handled
- [ ] Automatic cleanup works (50 entry limit)

### Phase 4: Favorites
- [ ] Authenticated save works (database + localStorage)
- [ ] Unauthenticated save works (localStorage only)
- [ ] Duplicate detection works (updates existing)
- [ ] Get favorites works (database priority)
- [ ] Delete favorite works (both systems)
- [ ] Toggle favorite works (SearchStats)
- [ ] ID format handling works (cuid vs favorite_)
- [ ] Dual-write failure scenarios handled
- [ ] Edge cases handled
- [ ] Favorites sidebar displays correctly

### Cross-Phase
- [ ] Migration scenario works (localStorage → database)
- [ ] Session expiration handled gracefully
- [ ] Performance acceptable with large datasets
- [ ] Browser compatibility verified
- [ ] Error handling robust

## Reporting Issues

When reporting issues, include:
1. Test number and name
2. Steps to reproduce
3. Expected vs actual results
4. Browser and version
5. Console errors (if any)
6. Network tab screenshots (if applicable)
7. Database state (if applicable)

## Success Criteria

All tests should pass with:
- ✅ No console errors
- ✅ No data loss
- ✅ Graceful error handling
- ✅ User-friendly feedback
- ✅ Correct dual-write behavior
- ✅ Proper fallback mechanisms

