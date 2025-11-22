# localStorage to Database Migration Plan

This document outlines the strategy for migrating client-side localStorage utilities to authenticated, database-backed API routes.

**Status:** ✅ **MIGRATION COMPLETE** - All localStorage utilities have been migrated to database-only operations (v4.7.0). Clean cutover completed. Phase 7 (Display Transcripts) complete (v4.8.0). Automated Transcription Workflow complete (v4.9.0).

## Current State Analysis

### localStorage Utilities Identified

1. **`collections.js`** - Collections/Playlists management
   - Functions: `saveCollection`, `getCollections`, `getCollection`, `updateCollection`, `deleteCollection`, `addVideosToCollection`
   - Data Structure: `{ id, name, videoIds[], videos[], createdAt, updatedAt }`
   - Current Storage: `tubetime_collections` in localStorage

2. **`searchHistory.js`** - Search query history
   - Functions: `saveSearchHistory`, `getSearchHistory`, `clearSearchHistory`, `formatHistoryTimestamp`
   - Data Structure: `{ query, startDate, endDate, timestamp }`
   - Current Storage: `tubetime_search_history` in localStorage (max 10 items)

3. **`favorites.js`** - Favorite searches and channels
   - Functions: `getFavorites`, `saveFavorite`, `deleteFavorite`, `isFavorited`, `getFavorite`
   - Data Structure: `{ id, name, type: 'search'|'channel', data: {...}, createdAt, updatedAt }`
   - Current Storage: `tubetime_favorites` in localStorage (max 50 items)
   - **Note**: No database model exists yet - needs to be created

4. **`transcriptionQueue.js`** - Video transcription queue
   - Functions: `getQueue`, `addToQueue`, `removeFromQueue`, `clearQueue`, `isInQueue`, `getQueueSize`
   - Data Structure: `string[]` (array of video IDs)
   - Current Storage: `tubetime_transcription_queue` in localStorage (max 1000 items)
   - **Note**: No database model exists yet - needs to be created

### Database Schema Status

✅ **Existing Models:**
- `Collection` - Ready for migration
- `Video` - Ready for migration
- `VideosInCollections` - Ready for migration
- `SearchHistory` - Partially ready (needs field expansion)

❌ **Missing Models:**
- `Favorite` - Needs to be created
- `TranscriptionQueue` or `TranscriptionJob` - Needs to be created

## Recommended Implementation Strategy

### Phase 1: Schema Updates (Prerequisites)

**Priority: CRITICAL - Must complete before API routes**

1. **Update `SearchHistory` Model**
   - Current: Only stores `query` (string)
   - Needed: Store full search parameters
   - **Decision**: Add fields or use JSON field?
     - **Option A**: Add individual fields (`query`, `channelName`, `startDate`, `endDate`, `duration`, `language`, `order`)
     - **Option B**: Use JSON field (`searchParams` JSONB)
   - **Recommendation**: Option A (individual fields) for better queryability and indexing

2. **Create `Favorite` Model**
   ```prisma
   model Favorite {
     id        String   @id @default(cuid())
     name      String
     type      String   // 'search' or 'channel'
     data      Json     // Store search params or channel info
     createdAt DateTime @default(now())
     updatedAt DateTime @updatedAt
     userId    String
     user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
     
     @@index([userId, type])
   }
   ```

3. **Create `TranscriptionQueue` Model**
   ```prisma
   model TranscriptionQueue {
     id          String   @id @default(cuid())
     videoId     String
     status      String   @default("pending") // 'pending', 'processing', 'completed', 'failed'
     priority    Int      @default(0)
     errorMessage String?
     createdAt   DateTime @default(now())
     updatedAt   DateTime @updatedAt
     completedAt DateTime?
     userId      String
     user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
     video       Video    @relation(fields: [videoId], references: [id], onDelete: Cascade)
     
     @@unique([userId, videoId])
     @@index([userId, status])
   }
   ```

### Phase 2: Collections Migration (High Priority)

**Why First?**
- Core feature with complex relationships
- Most user-facing functionality
- Establishes patterns for other migrations

**Implementation Steps:**

1. **Create API Routes** (`app/api/collections/route.js`)
   - `GET /api/collections` - List user's collections
   - `POST /api/collections` - Create new collection
   - `GET /api/collections/[id]` - Get specific collection
   - `PUT /api/collections/[id]` - Update collection
   - `DELETE /api/collections/[id]` - Delete collection
   - `POST /api/collections/[id]/videos` - Add videos to collection

2. **Key Implementation Details:**
   - Use `getServerSession` from `next-auth` to get `userId`
   - Upsert `Video` records when adding to collections (denormalize metadata)
   - Handle many-to-many relationships via `VideosInCollections`
   - Return collection with populated video data

3. **Frontend Integration:**
   - Create `src/services/collectionsService.js` (API client)
   - Update `CollectionModal.jsx` to use API
   - Update `ActionBar.jsx` "Save Collection" handler
   - Maintain backward compatibility during transition

### Phase 3: Search History Migration (Medium Priority)

**Why Second?**
- Simpler data structure
- Less critical than collections
- Good practice for simpler migrations

**Implementation Steps:**

1. **Update Schema First** (add fields to `SearchHistory`)
2. **Create API Routes** (`app/api/search-history/route.js`)
   - `GET /api/search-history` - Get user's search history
   - `POST /api/search-history` - Save new search
   - `DELETE /api/search-history` - Clear history
   - `DELETE /api/search-history/[id]` - Delete specific entry

3. **Frontend Integration:**
   - Update `searchHistory.js` to call API routes
   - Update `SearchHistory.jsx` component
   - Update `EnhancedSearchBar.jsx` to use API

### Phase 4: Favorites Migration (Medium Priority)

**Why Third?**
- Requires new model creation
- Similar complexity to search history
- Good user experience feature

**Implementation Steps:**

1. **Create Schema** (add `Favorite` model)
2. **Create API Routes** (`app/api/favorites/route.js`)
   - `GET /api/favorites` - Get user's favorites
   - `POST /api/favorites` - Create favorite
   - `DELETE /api/favorites/[id]` - Delete favorite
   - `GET /api/favorites/check` - Check if favorited (query param)

3. **Frontend Integration:**
   - Update `favorites.js` to call API routes
   - Update `FavoritesSidebar.jsx` component
   - Update `SearchStats.jsx` favorite button

### Phase 5: Transcription Queue Migration (Lower Priority)

**Why Last?**
- Most complex (status tracking, error handling)
- Less user-facing (background process)
- May need additional features (retry logic, priority)

**Implementation Steps:**

1. **Create Schema** (add `TranscriptionQueue` model)
2. **Create API Routes** (`app/api/transcription-queue/route.js`)
   - `GET /api/transcription-queue` - Get user's queue
   - `POST /api/transcription-queue` - Add videos to queue
   - `DELETE /api/transcription-queue` - Clear queue
   - `DELETE /api/transcription-queue/[id]` - Remove specific item
   - `PUT /api/transcription-queue/[id]` - Update status (for future processing)

3. **Frontend Integration:**
   - Update `transcriptionQueue.js` to call API routes
   - Update `ActionBar.jsx` "Queue for Transcription" handler

## Implementation Best Practices

### 1. Authentication Pattern

**Every API route should:**
```javascript
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function GET(request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
  
  const userId = session.user.id
  // ... use userId for scoped queries
}
```

### 2. Error Handling

- Consistent error responses: `{ error: string }`
- Proper HTTP status codes (401, 403, 404, 400, 500)
- Log errors server-side, return user-friendly messages

### 3. Data Validation

- Validate input on server-side (never trust client)
- Use Prisma's type safety
- Return clear validation errors

### 4. Migration Strategy

**Dual-Write Pattern (Recommended):**
1. Write to both localStorage AND database during transition
2. Read from database first, fallback to localStorage
3. Gradually migrate users
4. Remove localStorage writes after full migration

**Alternative: Clean Cutover**
- Migrate all at once
- Simpler but requires careful testing
- Better for controlled rollout

### 5. Backward Compatibility

- Keep localStorage utilities as fallback during migration
- Add feature flags if needed
- Provide migration script for existing users

## Alternative Approach: Unified Data Service

Instead of separate API routes, consider a unified approach:

**Option: Single API Route with Actions**
```
POST /api/user-data
{
  "action": "collections|history|favorites|queue",
  "operation": "get|create|update|delete",
  "data": {...}
}
```

**Pros:**
- Single authentication point
- Consistent error handling
- Easier to add new data types

**Cons:**
- Less RESTful
- Harder to cache
- More complex routing logic

**Recommendation:** Use separate routes (more RESTful, better caching, clearer API)

## Testing Strategy

1. **Unit Tests:**
   - Test API routes with mock sessions
   - Test Prisma operations
   - Test error cases

2. **Integration Tests:**
   - Test full flow: API → Database → Response
   - Test authentication requirements
   - Test user scoping

3. **Migration Tests:**
   - Test localStorage → Database migration
   - Test backward compatibility
   - Test data integrity

## Rollout Plan

1. **Development:**
   - Implement one feature at a time
   - Test thoroughly
   - Document API contracts

2. **Staging:**
   - Deploy to staging environment
   - Test with real user scenarios
   - Verify data migration

3. **Production:**
   - Deploy with feature flag
   - Enable for beta users first
   - Monitor for errors
   - Gradually roll out to all users

## Success Metrics

- ✅ All localStorage utilities migrated to API routes
- ✅ User data persists across sessions/devices
- ✅ No data loss during migration
- ✅ API response times < 200ms (p95)
- ✅ Zero authentication bypasses
- ✅ 100% user-scoped queries

## Timeline Estimate

- **Phase 1 (Schema Updates):** 1-2 days
- **Phase 2 (Collections):** 3-4 days
- **Phase 3 (Search History):** 1-2 days
- **Phase 4 (Favorites):** 1-2 days
- **Phase 5 (Transcription Queue):** 2-3 days
- **Phase 6 (Transcription Worker):** 3-5 days
- **Phase 7 (Display Transcripts):** 5-7 days
- **Testing & Polish:** 2-3 days

**Total: ~20-28 days** (depending on complexity and testing depth)

## Open Questions

1. **SearchHistory Schema:** Individual fields vs JSON field?
2. **Video Metadata:** Should we always upsert, or check if exists first?
3. **Migration Strategy:** Dual-write vs clean cutover?
4. **Rate Limiting:** Should we add rate limits to API routes?
5. **Caching:** Should we cache user data? (Redis, etc.)
6. **Batch Operations:** Support bulk operations for collections?

## Next Steps

1. ✅ Review and approve this plan
2. ✅ Create missing Prisma models
3. ✅ Update SearchHistory schema
4. ✅ Run migrations (Migration: `20251120023547_add_favorites_and_transcription_queue_expand_search_history`)
5. ✅ Phase 2: Collections API routes - COMPLETE
6. ✅ Phase 2: Collections Frontend Integration - COMPLETE
7. ✅ Phase 2: Testing - COMPLETE (All scenarios passed)
8. ✅ Phase 3: Search History API routes - COMPLETE
9. ✅ Phase 3: Search History Frontend Integration - COMPLETE
10. ✅ Phase 3: Testing Guide Created - COMPLETE (`TESTING_PHASE3_PHASE4.md`)
11. ✅ Phase 3: Manual Testing - COMPLETE (All scenarios passed on 2025-11-20)
12. ✅ Phase 4: Favorites API routes - COMPLETE
13. ✅ Phase 4: Favorites Frontend Integration - COMPLETE
14. ✅ Phase 4: Testing Guide Created - COMPLETE (`TESTING_PHASE3_PHASE4.md`)
15. ⏳ Phase 4: Manual Testing - PENDING
16. ✅ Bug Fixes (v4.5.1) - COMPLETE (empty array handling, race conditions)
17. ✅ Phase 5: Transcription Queue API routes - COMPLETE
18. ✅ Phase 5: Transcription Queue Frontend Integration - COMPLETE
19. ✅ Phase 5: Testing Guide Created - COMPLETE (`TESTING_PHASE5.md`)
20. ⏳ Phase 5: Manual Testing - PENDING
21. ✅ Clean Cutover: Removed all localStorage code (v4.7.0) - COMPLETE

## Phase 1 Status: ✅ COMPLETE

**Migration Applied:** `20251120023547_add_favorites_and_transcription_queue_expand_search_history`

**Models Created/Updated:**
- ✅ `SearchHistory` - Expanded with individual fields (query, channelName, startDate, endDate, duration, language, order, maxResults)
- ✅ `Favorite` - New model created with JSON data field
- ✅ `TranscriptionQueue` - New model created with status tracking
- ✅ `User` - Updated with new relations
- ✅ `Video` - Updated with transcriptionQueue relation

**Indexes Created:**
- SearchHistory: `[userId, createdAt]`, `[userId, query]`
- Favorite: `[userId, type]`, `[userId, createdAt]`
- TranscriptionQueue: `[userId, status]`, `[userId, createdAt]`
- TranscriptionQueue: Unique constraint `[userId, videoId]`

**Prisma Client:** Regenerated successfully

## Phase 4 Status: ✅ COMPLETE

**Favorites API Routes & Frontend Integration (v4.5.0)**

**Backend API Routes:**
- ✅ `GET /api/favorites` - List user's favorites (with optional type filter)
- ✅ `POST /api/favorites` - Create new favorite (with duplicate detection)
- ✅ `DELETE /api/favorites` - Clear all favorites
- ✅ `GET /api/favorites/[id]` - Get specific favorite
- ✅ `PUT /api/favorites/[id]` - Update favorite
- ✅ `DELETE /api/favorites/[id]` - Delete specific favorite
- ✅ `GET /api/favorites/check` - Check if favorite exists by name and type

**Frontend Integration:**
- ✅ Created `src/services/favoritesService.js` API client
- ✅ Updated `src/utils/favorites.js` with dual-write pattern
- ✅ Updated `FavoritesSidebar.jsx` with async API integration
- ✅ Updated `EnhancedSearchBar.jsx` to use async favorites API
- ✅ Updated `SearchStats.jsx` to use async favorites API

**Features:**
- ✅ Duplicate detection (prevents duplicate favorites by name+type)
- ✅ Update existing favorites if name+type match
- ✅ Dual-write pattern (database + localStorage)
- ✅ Handles both database IDs (cuid) and localStorage IDs
- ✅ All operations are async

**Documentation:**
- ✅ Created `FAVORITES_IMPLEMENTATION_SUMMARY.md` summary
- ✅ Created `TESTING_PHASE3_PHASE4.md` comprehensive testing guide

**Bug Fixes (v4.5.1):**
- ✅ Fixed race conditions in `FavoritesSidebar.jsx`

## Phase 5 Status: ✅ COMPLETE

**Transcription Queue API Routes & Frontend Integration (v4.6.0)**

**Backend API Routes:**
- ✅ `GET /api/transcription-queue` - List user's queue items (with optional status filter)
- ✅ `POST /api/transcription-queue` - Add videos to queue (batch operation with transaction)
- ✅ `DELETE /api/transcription-queue` - Clear queue or batch delete by video IDs (with optional status filter)
- ✅ `GET /api/transcription-queue/[id]` - Get specific queue item
- ✅ `PUT /api/transcription-queue/[id]` - Update queue item (status, priority, errorMessage)
- ✅ `DELETE /api/transcription-queue/[id]` - Remove specific queue item

**Frontend Integration:**
- ✅ Created `src/services/transcriptionQueueService.js` API client
- ✅ Updated `src/utils/transcriptionQueue.js` with dual-write pattern
- ✅ Updated `app/page.jsx` to use async queue operations

**Features:**
- ✅ Status transition validation (pending → processing → completed/failed, failed → pending for retry)
- ✅ Batch operations with Prisma transactions for atomicity
- ✅ Batch delete optimization (eliminates N+1 query problem, single atomic operation)
- ✅ Priority support (higher number = higher priority)
- ✅ Duplicate detection (prevents adding same video twice)
- ✅ Dual-write pattern (database + localStorage)
- ✅ Efficient API responses (returns summary instead of all items for batch operations)
- ✅ Video upsert (creates video record if not exists)

**Status Transitions:**
- `pending` → `processing` (valid)
- `processing` → `completed` (valid)
- `processing` → `failed` (valid)
- `failed` → `pending` (valid, for retries)
- `completed` → (no transitions, must re-queue as new item)

**Documentation:**
- ✅ Testing guide - COMPLETE (`TESTING_PHASE5.md`)

## Phase 7 Status: ✅ COMPLETE

**Display Transcripts UI/UX (v4.8.0)**

**Backend API Routes:**
- ✅ `GET /api/transcripts/[videoId]` - Fetch transcript for a specific video (with metadata)
- ✅ `GET /api/transcripts` - List all transcripts with pagination and language filtering

**Frontend Integration:**
- ✅ Created `transcriptService.js` API client with error handling
- ✅ Created `useTranscriptStatus.js` hook for availability checking
- ✅ Updated `VideoCard.jsx` to display transcript status badge
- ✅ Created `TranscriptsPage` (`/transcripts`) for browsing user's transcripts

**Core Components:**
- ✅ `TranscriptViewer.jsx` - Main viewer with search, highlighting, and navigation
- ✅ `TranscriptModal.jsx` - Responsive modal wrapper with loading/error states
- ✅ `TranscriptBadge.jsx` - Status indicator component

**Features:**
- ✅ **Interactive Viewer:** View transcripts as segments or full text
- ✅ **Advanced Search:** Real-time client-side search with term highlighting and match navigation
- ✅ **Copy & Export:** Copy to clipboard or download as text file
- ✅ **Navigation:** Dedicated "Transcripts" page with grid/list views
- ✅ **Status Indication:** Badges on video cards show transcript availability (Available, Processing, Failed)

**UX & Accessibility:**
- ✅ **Responsive Design:** optimized for mobile and desktop
- ✅ **Focus Management:** Focus trapping in modals, restoration on close
- ✅ **Screen Reader Support:** ARIA labels, live regions for search results

## Automated Transcription Workflow Status: ✅ COMPLETE

**Automated Transcription Workflow (v4.9.0)**

**User Experience Enhancements:**
- ✅ Auto-trigger transcription worker after queuing videos
- ✅ Real-time progress panel with status indicators (pending, processing, completed, failed)
- ✅ Time estimates based on video duration (~1 min processing per min of video)
- ✅ Auto-open transcript modal when transcription completes
- ✅ Graceful fallback if worker is not configured (no errors shown to user)

**Technical Implementation:**
- ✅ Created `TranscriptionProgress.jsx` component for visual progress display
- ✅ Created `useTranscriptionQueue.js` hook for polling queue status (5-second intervals)
- ✅ Created `transcriptionWorkerService.js` client-side service
- ✅ Created `/api/transcription-queue/process` user-facing API route (requires authentication)
- ✅ Updated `app/page.jsx` with auto-trigger, progress panel, and auto-open logic
- ✅ Made `transcriptionService.js` environment checks lazy to fix build errors

**Documentation:**
- ✅ Created `AUTOMATED_TRANSCRIPTION_UX.md`: Comprehensive workflow guide
- ✅ Created `TRANSCRIPTION_WORKFLOW.md`: Manual workflow guide (for reference/fallback)
- ✅ **Keyboard Navigation:** Full keyboard support including shortcuts (Enter/Shift+Enter for search)

**Documentation:**
- ✅ Updated `CHANGELOG.md`
- ✅ Updated `CONTEXT.md`

## Phase 3 Status: ✅ COMPLETE

**Search History API Routes & Frontend Integration (v4.4.0)**

**Backend API Routes:**
- ✅ `GET /api/search-history` - List user's search history (with pagination)
- ✅ `POST /api/search-history` - Save new search (with duplicate detection)
- ✅ `DELETE /api/search-history` - Clear all history
- ✅ `DELETE /api/search-history/[id]` - Delete specific entry

**Frontend Integration:**
- ✅ Created `src/services/searchHistoryService.js` API client
- ✅ Updated `src/utils/searchHistory.js` with dual-write pattern
- ✅ Updated `SearchHistory.jsx` component with async API integration
- ✅ Updated `useVideoSearch.js` to save all search parameters
- ✅ Updated `page.jsx` to restore all search parameters

**Features:**
- ✅ Full parameter support (query, channelName, dates, filters, etc.)
- ✅ Duplicate detection (prevents saving same search within 1 minute)
- ✅ Automatic cleanup (keeps only last 50 entries per user)
- ✅ Dual-write pattern (database + localStorage)
- ✅ Backward compatibility maintained

**Documentation & Testing:**
- ✅ Created `SEARCH_HISTORY_IMPLEMENTATION_SUMMARY.md` summary
- ✅ Created `TESTING_PHASE3_PHASE4.md` comprehensive testing guide
- ✅ Automated unit tests executed (`npm run test -- src/utils/__tests__/searchHistory.test.js`)

**Bug Fixes (v4.5.1):**
- ✅ Fixed empty array handling in `getSearchHistory()`
- ✅ Fixed race conditions in `SearchHistory.jsx`

## Phase 2 Status: ✅ COMPLETE

**Collections API Routes & Frontend Integration (v4.3.0)**

**Backend API Routes:**
- ✅ `GET /api/collections` - List user's collections
- ✅ `POST /api/collections` - Create new collection
- ✅ `GET /api/collections/[id]` - Get specific collection with videos
- ✅ `PUT /api/collections/[id]` - Update collection (rename)
- ✅ `DELETE /api/collections/[id]` - Delete collection
- ✅ `POST /api/collections/[id]/videos` - Add video to collection

**Frontend Integration:**
- ✅ Created `src/services/collectionsService.js` API client
- ✅ Updated `CollectionModal.jsx` with API integration
- ✅ Implemented dual-write pattern (database + localStorage)
- ✅ Added authentication integration with NextAuth.js
- ✅ Comprehensive error handling and user feedback

**Testing:**
- ✅ All test scenarios passed successfully
- ✅ Authenticated flow verified (database primary)
- ✅ Unauthenticated flow verified (localStorage fallback)
- ✅ Dual-write behavior verified (failure scenarios)
- ✅ Error handling verified
- ✅ Edge cases verified

**Documentation:**
- ✅ Created `TESTING_COLLECTIONS.md` testing guide
- ✅ Created `COLLECTIONS_IMPLEMENTATION_SUMMARY.md` summary
- ✅ Updated `CHANGELOG.md` with v4.3.0 release notes

