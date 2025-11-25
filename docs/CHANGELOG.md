# Changelog

All notable changes to TubeTime will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.10.6] - 2025-11-24 (Phase 8 Day 3)

### Added

- **Optimistic Updates for Transcription Queue:**
  - Added optimistic updates to `useTranscriptionQueueMutation` hook
  - Queue items appear/disappear instantly in UI before server responds
  - Automatic rollback on error to maintain data consistency
  - TDD test suite expanded with 4 new optimistic update tests

### Changed

- **Transcription Queue Mutations:**
  - `addToQueue`: Optimistically adds items to cache with temporary IDs, status 'pending'
  - `removeFromQueue`: Optimistically removes items from cache immediately
  - `clearQueue`: Optimistically clears cache immediately (supports status filter)
  - All mutations include error rollback to restore previous state on failure

### Technical

- **Optimistic Update Pattern:**
  - `onMutate`: Snapshot previous state and optimistically update cache
  - `onError`: Rollback to previous state if mutation fails
  - `onSuccess`: Invalidate queries to fetch real data from server
  - `onSettled`: Always invalidate queries to ensure consistency

- **Test Infrastructure:**
  - Added 4 new tests for optimistic update behavior
  - Tests verify cache updates happen before server response
  - Tests verify rollback on error for all mutation types

### Notes

- Optimistic updates make queue operations feel instant and responsive
- Error handling ensures data consistency even if mutations fail
- All 133 tests passing (129 previous + 4 new optimistic update tests)
- Transcription Queue now provides instant feedback to users

## [4.10.5] - 2025-11-24 (Phase 8 Day 3)

### Added

- **Optimistic Updates for Favorites:**
  - Added optimistic updates to `useFavoritesMutation` hook
  - Favorites appear/disappear instantly in UI before server responds
  - Automatic rollback on error to maintain data consistency
  - TDD test suite expanded with 4 new optimistic update tests

### Changed

- **Favorites Mutations:**
  - `addFavorite`: Optimistically adds favorite to cache with temporary ID, replaces with real ID on success
  - `deleteFavorite`: Optimistically removes favorite from cache immediately
  - `clearFavorites`: Optimistically clears cache immediately
  - All mutations include error rollback to restore previous state on failure

### Technical

- **Optimistic Update Pattern:**
  - `onMutate`: Snapshot previous state and optimistically update cache
  - `onError`: Rollback to previous state if mutation fails
  - `onSuccess`: Replace optimistic data with real server response
  - `onSettled`: Invalidate queries to ensure consistency

- **Test Infrastructure:**
  - Added 4 new tests for optimistic update behavior
  - Tests verify cache updates happen before server response
  - Tests verify rollback on error

### Notes

- Optimistic updates make UI feel instant and responsive
- Error handling ensures data consistency even if mutations fail
- All 129 tests passing (125 original + 4 new optimistic update tests)
- Favorites component now provides instant feedback to users

## [4.10.4] - 2025-11-24 (Phase 8 Day 2)

### Added

- **Transcription Queue React Query Migration:**
  - Transcription Queue React Query hooks (`src/hooks/useTranscriptionQueueQuery.js`)
  - TDD test suite for Transcription Queue hooks (12 tests)
  - `useTranscriptionQueueQuery`: Hook for fetching queue with smart polling
  - `useTranscriptionQueueMutation`: Hook for add, remove, and clear operations
  - Smart polling: Only polls when there are active items (pending or processing)
  - Background polling: Continues polling even when window is not focused

### Changed

- **Transcription Queue Hook:**
  - Migrated `src/hooks/useTranscriptionQueue.js` from manual polling to React Query
  - Replaced manual setTimeout polling with React Query's `refetchInterval`
  - Implemented smart polling that stops when all items are completed/failed
  - Maintains backward compatibility with existing component usage
  - Improved error handling with graceful degradation

### Technical

- **New Hooks:**
  - `useTranscriptionQueueQuery`: React Query hook for fetching queue with smart polling
  - `useTranscriptionQueueMutation`: React Query hook for queue mutations (add, remove, clear)

- **Test Infrastructure:**
  - `tests/hooks/__tests__/useTranscriptionQueueQuery.test.js`: TDD test suite (12 tests)

### Notes

- TDD pattern successfully applied to Transcription Queue migration
- All 125 tests passing (113 original + 12 new Transcription Queue tests)
- Smart polling reduces unnecessary API calls when queue is idle
- Transcription Queue migration completes all major component migrations

## [4.10.3] - 2025-11-24 (Phase 8 Day 2)

### Added

- **Collections React Query Migration:**
  - Collections React Query hooks (`src/hooks/useCollectionsQuery.js`)
  - TDD test suite for Collections hooks (12 tests)
  - `useCollectionsQuery`: Hook for fetching all collections
  - `useCollectionQuery`: Hook for fetching a single collection by ID
  - `useCollectionsMutation`: Hook for create, update, delete, and add videos operations

### Changed

- **Collections Component:**
  - Migrated `src/components/CollectionModal.jsx` from manual state management to React Query
  - Replaced manual `isSaving` state with React Query `isPending` states
  - Replaced async `handleSave` function with React Query mutations
  - Added automatic cache invalidation after mutations
  - Improved error handling with React Query error callbacks

### Technical

- **New Hooks:**
  - `useCollectionsQuery`: React Query hook for fetching all collections
  - `useCollectionQuery`: React Query hook for fetching a single collection
  - `useCollectionsMutation`: React Query hook for collections mutations (create, update, delete, add videos)

- **Test Infrastructure:**
  - `tests/hooks/__tests__/useCollectionsQuery.test.js`: TDD test suite (12 tests)

### Notes

- TDD pattern successfully applied to Collections migration
- All 113 tests passing (101 original + 12 new Collections tests)
- Collections component migration follows same pattern as Search History and Favorites

## [4.10.2] - 2025-11-24 (Phase 8 Day 2)

### Added

- **Favorites React Query Migration:**
  - Favorites React Query hooks (`src/hooks/useFavoritesQuery.js`)
  - TDD test suite for Favorites hooks (8 tests)
  - `useFavoritesQuery`: Hook for fetching favorites with type filtering
  - `useFavoritesMutation`: Hook for add, delete, and clear operations

### Changed

- **Favorites Component:**
  - Migrated `src/components/FavoritesSidebar.jsx` from manual state management to React Query
  - Removed `useState` and `useEffect` for data fetching
  - Added automatic caching, loading states, and error handling
  - Query only runs when sidebar is open (performance optimization)
  - Improved error handling with error state UI

### Technical

- **New Hooks:**
  - `useFavoritesQuery`: React Query hook for fetching favorites
  - `useFavoritesMutation`: React Query hook for favorites mutations (add, delete, clear)

- **Test Infrastructure:**
  - `tests/hooks/__tests__/useFavoritesQuery.test.js`: TDD test suite (8 tests)

### Notes

- TDD pattern successfully applied to Favorites migration
- All 101 tests passing (93 original + 8 new Favorites tests)
- Favorites component migration follows same pattern as Search History

## [4.10.1] - 2025-11-24 (Phase 8 Day 2)

### Added

- **React Query Infrastructure:**
  - QueryClient configuration (`src/lib/react-query.js`)
  - QueryClientProvider integrated into `src/components/Providers.jsx`
  - Test infrastructure (`tests/setup-react-query.jsx`) for React Query testing
  - Search History React Query hooks (`src/hooks/useSearchHistoryQuery.js`)
  - TDD test suite for React Query hooks (7 tests)

### Changed

- **Search History Component:**
  - Migrated `src/components/SearchHistory.jsx` from manual state management to React Query
  - Removed `useState` and `useEffect` for data fetching
  - Added automatic caching, loading states, and error handling
  - Query only runs when modal is open (performance optimization)

- **Search History API:**
  - Added atomic transaction wrapper to prevent race conditions
  - Fixed duplicate detection using `prisma.$transaction()`
  - Prevents multiple simultaneous requests from creating duplicate entries

- **Video Search Hook:**
  - Added `!isLoadMore` check before saving search history
  - Prevents saving history when loading more results

### Fixed

- **Duplicate Search History Entries:**
  - Fixed race condition causing single search to appear multiple times
  - Server-side: Wrapped duplicate check in atomic transaction
  - Client-side: Prevented duplicate saves during pagination

### Technical

- **New Dependencies:**
  - `@tanstack/react-query@^5.90.10`: Intelligent caching and state management

- **New Hooks:**
  - `useSearchHistoryQuery`: React Query hook for fetching search history
  - `useSearchHistoryMutation`: React Query hook for search history mutations

- **Test Infrastructure:**
  - `tests/setup-react-query.jsx`: React Query test wrapper utilities
  - `tests/hooks/__tests__/useSearchHistoryQuery.test.js`: TDD test suite

### Documentation

- Updated `PHASE8_IMPLEMENTATION_PLAN.md` with Day 2 completion status
- Updated `CONTEXT.md` with Phase 8 progress and bug fixes
- Updated placeholder dates to 2025-11-24 in documentation files

### Notes

- TDD pattern established for future hook development
- All 93 tests passing (86 existing + 7 new React Query tests)
- Search History component serves as reference implementation for remaining migrations

## [4.10.0] - 2025-01-XX (Phase 8 Day 1)

### Added

- **Observability Foundation (Phase 8 Day 1):**
  - Sentry error tracking and performance monitoring
  - Client-side error capture with session replay
  - Server-side error tracking for API routes
  - Edge runtime monitoring support
  - API route monitoring wrapper (`withMonitoring`) for slow request detection (>1000ms)
  - Prisma query monitoring middleware for slow database query detection (>500ms)
  - Source map support for better error debugging
  - Environment-based sampling rates (10% production, 100% development)

### Changed

- **Build Configuration:**
  - Wrapped `next.config.js` with `withSentryConfig` for automatic instrumentation
  - Added Sentry webpack plugin for source map uploads

- **Database Monitoring:**
  - Integrated Prisma monitoring middleware into `src/lib/prisma.js`
  - Automatic slow query logging for database operations

### Technical

- **New Dependencies:**
  - `@sentry/nextjs@^10.26.0`: Comprehensive error tracking and performance monitoring

- **New Utilities:**
  - `src/lib/api-monitoring.js`: Higher-order function to wrap API routes with monitoring
  - `src/lib/prisma-monitoring.js`: Middleware to log slow database queries

- **Configuration Files:**
  - `instrumentation.js`: Next.js instrumentation hook (loads server/edge configs)
  - `instrumentation-client.ts`: Client-side Sentry initialization with replay
  - `sentry.server.config.js`: Server-side Sentry initialization
  - `sentry.edge.config.js`: Edge runtime Sentry initialization
  - `app/global-error.jsx`: Global error boundary with Sentry integration
  - `.sentryclirc`: Sentry CLI configuration for source map uploads (optional)

### Environment Variables Required

```env
# Sentry Configuration (Required for error tracking)
NEXT_PUBLIC_SENTRY_DSN="https://xxx@sentry.io/xxx"

# Sentry Source Map Upload (Optional, for production builds)
SENTRY_ORG="your-org"
SENTRY_PROJECT="your-project"
SENTRY_AUTH_TOKEN="your-auth-token"
```

### Documentation

- Updated `PHASE8_IMPLEMENTATION_PLAN.md` with Day 1 completion status
- Created `OBSERVABILITY_SETUP.md` guide
- Added revert strategy documentation for Sentry removal if needed

### Notes

- Monitoring utilities are ready but not yet integrated into API routes (will be done in Day 2)
- Prisma monitoring is automatically active for all database queries
- Production sampling rates configured to minimize Sentry usage costs

## [4.9.0] - 2025-01-XX

### Added

- **Automated Transcription Workflow:**
  - Auto-trigger transcription worker after queuing videos
  - Real-time progress panel with status indicators (pending, processing, completed, failed)
  - Time estimates based on video duration (~1 min processing per min of video)
  - Auto-open transcript modal when transcription completes
  - User-facing API route (`/api/transcription-queue/process`) for authenticated processing
  - Polling hook (`useTranscriptionQueue`) for real-time queue status updates
  - Graceful fallback if worker is not configured (no errors shown to user)

### Changed

- **Transcription Queue UX:**
  - Queueing videos now automatically triggers processing
  - Progress panel appears in top-right corner showing all active queue items
  - Status updates every 5 seconds automatically
  - Improved toast messages with processing status

- **Build Improvements:**
  - Made `transcriptionService.js` environment variable checks lazy (only checked when functions are called)
  - Fixes build errors when `TRANSCRIPTION_WORKER_URL` is not configured

### Technical

- **New Components:**
  - `TranscriptionProgress.jsx`: Visual progress panel with status indicators and time estimates
  - `useTranscriptionQueue.js`: Polling hook for queue status (5-second intervals)

- **New Services:**
  - `transcriptionWorkerService.js`: Client-side service for triggering worker
  - `/api/transcription-queue/process`: User-facing API route (requires authentication)

- **Updated Components:**
  - `app/page.jsx`: Integrated auto-trigger, progress panel, and auto-open logic
  - `src/services/transcriptionService.js`: Lazy environment variable validation

### Documentation

- Created `AUTOMATED_TRANSCRIPTION_UX.md`: Comprehensive guide to the automated workflow
- Created `TRANSCRIPTION_WORKFLOW.md`: Manual workflow guide (for reference/fallback)

## [4.8.0] - 2025-01-XX

### Added

- **Phase 7: Display Transcripts UI/UX**
  - Transcript viewing modal with segments and full text toggle
  - In-modal search with highlighting and match navigation
  - Copy to clipboard and export as text file functionality
  - Transcripts page (`/transcripts`) with grid and list views
  - Client-side search on transcripts page
  - Transcript badge on video cards showing availability
  - Navigation link in Header component

### Changed

- **Accessibility Improvements:**
  - Added comprehensive ARIA labels to all interactive elements
  - Implemented focus management (trap focus in modal, restore on close)
  - Added screen reader announcements for search results
  - Improved keyboard navigation with visible focus indicators
  - Enhanced semantic HTML structure

- **Responsive Design:**
  - Improved mobile padding and height for transcript modal
  - Better touch targets for mobile devices
  - Refined breakpoints for mobile, tablet, and desktop

### Technical

- **Backend:**
  - Created `GET /api/transcripts/[videoId]` route
  - Created `GET /api/transcripts` route with pagination and filtering
  - Created `transcriptService.js` API client

- **Components:**
  - Created `TranscriptBadge.jsx`, `TranscriptViewer.jsx`, `TranscriptModal.jsx`
  - Created `useTranscriptStatus.js` hook
  - Updated `VideoCard.jsx`, `VideoGrid.jsx`, `Header.jsx`, `app/page.jsx`

- **Performance:**
  - Verified smooth rendering for 15-minute videos (~200-500 segments)
  - Documented virtualization as optional future enhancement for >30min videos

- **Build Fix:**
  - Moved `TranscriptionServiceError` to `src/utils/errors.js` to resolve "use server" export issue

## [4.7.0] - 2025-01-XX

### Removed

- **Clean Cutover - localStorage Removal:**
  - Removed all localStorage read/write operations from `favorites.js`
  - Removed all localStorage read/write operations from `searchHistory.js`
  - Removed all localStorage read/write operations from `transcriptionQueue.js`
  - Removed localStorage fallback from `CollectionModal.jsx`
  - Deleted `src/utils/collections.js` (replaced by `collectionsService.js`)
  - **Total:** ~1,100+ lines of localStorage code removed

### Changed

- **Database-Only Operations:**
  - All persistent data operations now require authentication
  - All utilities are database-only (no localStorage fallback)
  - Simplified codebase with single source of truth
  - Clear error messages guide users to sign in

- **Breaking Changes:**
  - Unauthenticated users can no longer save favorites, search history, or queue items
  - All persistent data operations require authentication
  - Sign-in prompts shown for unauthenticated users attempting to save data

### Added

- **Documentation:**
  - Created `CLEAN_CUTOVER_SUMMARY.md` documenting the localStorage removal
  - Updated `MIGRATION_PLAN.md` to reflect clean cutover completion
  - Updated `CONTEXT.md` to reflect database-only operations

### Benefits

- Simplified codebase (~1,100+ lines removed)
- Better security (all data user-scoped in database)
- Improved performance (no localStorage overhead)
- Single source of truth (database)
- Cleaner error handling

## [4.5.4] - 2025-11-20

### Changed

- Made the "add to favorites" star icon in the Top Channels list always visible, instead of only on hover.
- Centered toast notifications for a more integrated UI feel.
- Adjusted the Favorites sidebar to be positioned relative to the main content area, rather than the viewport.

### Fixed

- Fixed an issue where the Favorites sidebar would not be completely hidden when closed.

## [4.5.3] - 2025-11-20

### Fixed

- **NextAuth.js v5 Beta Compatibility:**
  - Updated all API routes to use `auth()` from `@/auth` instead of deprecated `getServerSession`
  - Fixed Prisma client initialization by removing custom output path in `prisma/schema.prisma`
  - Fixed module resolution for `@/lib/prisma` by updating `jsconfig.json` path aliases
  - Suppressed expected 401 error logging in API routes for unauthenticated users
  - Updated `SearchStats.jsx` to suppress console warnings for expected unauthorized errors

- **Google Sign-In UI Update Issue:**
  - Fixed session not refreshing after Google OAuth callback completes
  - Updated `SessionProvider` to use `refetchOnWindowFocus={true}` to refresh session when window regains focus
  - Added `callbackUrl` parameter to sign-in calls to ensure proper redirect after OAuth
  - Added OAuth callback detection in `Header.jsx` to trigger session refresh check
  - Sign-in button now correctly updates to show user info after Google authentication

### Changed

- **Error Handling:**
  - API routes now check for `Unauthorized` errors before logging to prevent noise in logs
  - Frontend components gracefully handle expected authentication failures without console warnings
  - Improved user experience when logged out (no error spam in console)

- **Session Management:**
  - `SessionProvider` now configured to automatically refresh session on window focus
  - Sign-in buttons explicitly set `callbackUrl` to maintain application state after OAuth redirect

### Known Issues

- ⚠️ **Build errors may appear intermittently** during compilation but don't prevent runtime functionality
- NextAuth.js v5 beta API is still evolving - may require updates as library stabilizes

## [4.5.2] - 2025-11-20

### Changed

- **Project Organization:**
  - Created a new `docs/` directory and moved all Markdown documentation files (`CHANGELOG.md`, `CONTEXT.md`, `MIGRATION_PLAN.md`, `TESTING_COLLECTIONS.md`, `SEARCH_HISTORY_IMPLEMENTATION_SUMMARY.md`, `TESTING_PHASE3_PHASE4.md`, `COLLECTIONS_IMPLEMENTATION_SUMMARY.md`) into it.
  - Created a new `tests/` directory in the project root.
  - Moved all test files from `src/utils/__tests__` and `src/hooks/__tests__` into the new `tests/` directory, maintaining their relative structure.
  - Updated `package.json` test scripts to point to the new `tests/` directory.
  - Updated `README.md` and `CONTEXT.md` to reflect the new project structure.
  - Added `src/generated/` to `.gitignore` so regenerated Prisma client artifacts are not committed.
  - Consolidated Prisma client helper to `src/lib/prisma.js` and removed the legacy root-level copy to avoid confusion about the canonical import path.
  - Updated `jsconfig.json` path alias so `@/*` resolves to `./src/*`, fixing build errors for imports like `@/lib/prisma`.

## [4.5.1] - 2025-01-XX

### Fixed

- **Search History & Favorites Bug Fixes:**
  - Fixed empty array handling in `getSearchHistory()` - now properly returns database results even if empty (for authenticated users)
  - Fixed race conditions in `SearchHistory.jsx` - added cleanup function to prevent state updates after component unmount
  - Fixed race conditions in `FavoritesSidebar.jsx` - added cleanup function to prevent state updates after component unmount
  - Improved error handling consistency across all dual-write operations

### Added

- **Testing Documentation:**
  - Created comprehensive testing guide (`TESTING_PHASE3_PHASE4.md`) with 17 test scenarios covering authenticated/unauthenticated flows, dual-write patterns, error handling, edge cases, and performance

## [4.5.0] - 2025-01-XX

### Added

- **Favorites API Routes & Frontend Integration (Phase 4 Complete):**
  - Created `favoritesService.js` API client with full CRUD operations
  - Implemented dual-write pattern (database + localStorage) for seamless migration
  - Added API routes: `GET /api/favorites`, `POST /api/favorites`, `DELETE /api/favorites`, `GET /api/favorites/[id]`, `PUT /api/favorites/[id]`, `DELETE /api/favorites/[id]`, `GET /api/favorites/check`
  - Added duplicate detection (prevents duplicate favorites by name+type)
  - Updated `FavoritesSidebar.jsx` component with async API integration and loading states
  - Updated `EnhancedSearchBar.jsx` to use async favorites API
  - Updated `SearchStats.jsx` to use async favorites API with proper cleanup

- **Documentation:**
  - Created implementation summary (`FAVORITES_IMPLEMENTATION_SUMMARY.md`)

### Changed

- **Favorites Utility (`favorites.js`):**
  - Updated all functions to be async (maintains same signature)
  - Implemented dual-write pattern (database + localStorage)
  - Updated `getFavorites()` to read from database first, fallback to localStorage
  - Updated `saveFavorite()` to write to both database and localStorage
  - Updated `deleteFavorite()` to delete from both database and localStorage
  - Updated `isFavorited()` to check database first, fallback to localStorage
  - Updated `getFavorite()` to get from database first, fallback to localStorage
  - Handles both database IDs (cuid) and localStorage IDs

- **FavoritesSidebar Component:**
  - Updated to use async `getFavorites()` API
  - Added loading state with spinner
  - Updated delete operation to be async
  - Reloads favorites after deletion

- **EnhancedSearchBar Component:**
  - Updated `handleSaveFavorite` to be async
  - Uses async `isFavorited()` check
  - Uses async `saveFavorite()`

- **SearchStats Component:**
  - Updated `useEffect` to check favorites asynchronously
  - Updated `handleToggleFavorite` to be async
  - Uses async favorites API functions
  - Added proper cleanup in useEffect to prevent race conditions

### Technical Details

- **Dual-Write Pattern:** Favorites are saved to both database (if authenticated) and localStorage during migration period
- **Duplicate Detection:** Prevents duplicate favorites by name+type for same user (updates existing instead)
- **ID Format Handling:** Handles both database IDs (cuid format) and localStorage IDs (favorite_ prefix)
- **Async Operations:** All favorites operations are now async to support API integration
- **Backward Compatibility:** Maintains same function signatures (now async)

### Testing Status

⏳ **Manual testing in progress** - See `FAVORITES_IMPLEMENTATION_SUMMARY.md` for scenarios

## [4.4.0] - 2025-01-XX

### Added

- **Search History API Routes & Frontend Integration (Phase 3 Complete):**
  - Created `searchHistoryService.js` API client with full CRUD operations
  - Implemented dual-write pattern (database + localStorage) for seamless migration
  - Added API routes: `GET /api/search-history`, `POST /api/search-history`, `DELETE /api/search-history`, `DELETE /api/search-history/[id]`
  - Enhanced search history to save all search parameters (query, channelName, dates, filters, etc.)
  - Added duplicate detection (prevents saving same search within 1 minute)
  - Automatic cleanup (keeps only last 50 entries per user in database)
  - Updated `SearchHistory.jsx` component with async API integration and loading states
  - Enhanced history display to show all search parameters (channel, filters, etc.)

- **Documentation:**
  - Created implementation summary (`SEARCH_HISTORY_IMPLEMENTATION_SUMMARY.md`)

### Changed

- **Search History Utility (`searchHistory.js`):**
  - Updated `saveSearchHistory()` to accept full search parameters object
  - Maintained backward compatibility with old API (`saveSearchHistory(query, startDate, endDate)`)
  - Implemented dual-write pattern (database + localStorage)
  - Updated `getSearchHistory()` to read from database first, fallback to localStorage
  - Updated `clearSearchHistory()` to clear both database and localStorage

- **useVideoSearch Hook:**
  - Updated to save all search parameters to history (not just query, dates)
  - Now saves channel-only searches to history
  - Supports saving searches with all filters (duration, language, order, maxResults)

- **SearchHistory Component:**
  - Updated to use async `getSearchHistory()` API
  - Added loading state with spinner
  - Enhanced display to show all search parameters
  - Improved entry display (shows channel name, filters, etc.)
  - Updated clear operation to be async

- **Page Component:**
  - Updated `handleSelectHistory` to restore all search parameters
  - Supports full search restoration from history (including filters)

### Technical Details

- **Dual-Write Pattern:** Search history is saved to both database (if authenticated) and localStorage during migration period
- **Full Parameter Support:** Now saves and restores all search parameters: query, channelName, startDate, endDate, duration, language, order, maxResults
- **Duplicate Detection:** Prevents saving same search within 1 minute (database) and checks all parameters (localStorage)
- **Automatic Cleanup:** Database automatically keeps only last 50 entries per user
- **Backward Compatibility:** Old API format still supported for smooth migration

### Testing Status

✅ **All Search History test scenarios passed (2025-11-20)**  
See `SEARCH_HISTORY_IMPLEMENTATION_SUMMARY.md` and `TESTING_PHASE3_PHASE4.md` for full coverage.

## [4.3.0] - 2025-01-XX

### Added

- **Collections Frontend Integration (Phase 2 Complete):**
  - Created `collectionsService.js` API client with full CRUD operations
  - Implemented dual-write pattern (database + localStorage) for seamless migration
  - Added authentication integration with NextAuth.js session management
  - Enhanced `CollectionModal.jsx` with API integration and error handling
  - Comprehensive error handling with user-friendly toast notifications
  - Loading states and disabled button states during operations
  - Support for both authenticated (database) and unauthenticated (localStorage) users

- **Testing & Documentation:**
  - Created comprehensive testing guide (`TESTING_COLLECTIONS.md`)
  - Created implementation summary (`COLLECTIONS_IMPLEMENTATION_SUMMARY.md`)
  - All test scenarios passed successfully

### Changed

- **CollectionModal Component:**
  - Updated to use API routes instead of localStorage-only
  - Added dual-write pattern for gradual migration
  - Enhanced user feedback with contextual toast messages
  - Added authentication checks and informational messages
  - Improved error handling for network failures and session expiration

### Technical Details

- **Dual-Write Pattern:** Collections are saved to both database (if authenticated) and localStorage during migration period
- **Authentication:** Database operations require authentication; localStorage works for all users
- **Error Handling:** Graceful degradation - data is never lost even if one storage method fails
- **User Experience:** Clear messaging about local vs cloud storage, sign-in prompts, and operation status

### Testing Status

✅ **All test scenarios passed:**
- Authenticated flow (database primary)
- Unauthenticated flow (localStorage fallback)
- Dual-write behavior (failure scenarios)
- Error handling & user feedback
- Edge cases

## [4.2.0] - 2025-01-XX

### Added

- **Database Schema Expansion (Phase 1 Complete):**
  - Expanded `SearchHistory` model with individual fields for full search parameters:
    - `query` (now optional for channel-only searches)
    - `channelName`, `startDate`, `endDate` (RFC 3339 format)
    - `duration` ('short', 'medium', 'long')
    - `language` (language code)
    - `order` (sort order)
    - `maxResults`
  - Created `Favorite` model for user favorites:
    - Stores search and channel favorites with JSON data field
    - Type field ('search' or 'channel')
    - Indexed by userId and type for performance
  - Created `TranscriptionQueue` model for video transcription queue:
    - Status tracking ('pending', 'processing', 'completed', 'failed')
    - Priority system for queue management
    - Error message storage for failed transcriptions
    - Unique constraint on [userId, videoId] to prevent duplicates
  - Added performance indexes:
    - SearchHistory: `[userId, createdAt]`, `[userId, query]`
    - Favorite: `[userId, type]`, `[userId, createdAt]`
    - TranscriptionQueue: `[userId, status]`, `[userId, createdAt]`

- **Migration Documentation:**
  - Created `MIGRATION_PLAN.md` with comprehensive migration strategy
  - Documented localStorage to database migration approach
  - Outlined implementation phases and best practices

### Changed

- **Database Schema:**
  - Updated `User` model with new relations: `favorites`, `transcriptionQueue`
  - Updated `Video` model with `transcriptionQueue` relation
  - `SearchHistory.query` field made optional to support channel-only searches

### Technical Details

- **Migration:** `20251120023547_add_favorites_and_transcription_queue_expand_search_history`
- **Database:** Neon PostgreSQL (neondb)
- **Prisma Version:** v6.19.0
- **Schema Status:** Ready for API route implementation (Phase 2)

## [4.1.1] - 2025-01-XX

### Changed

- **Color Consistency:**
  - Replaced all pure white (`text-white`) with off-white (`text-zinc-100`) throughout the application
  - Replaced all pure black overlays (`bg-black/*`) with zinc overlays (`bg-zinc-950/*`)
  - Updated button text colors, icons, and overlay backgrounds for better visual consistency
  - Improved readability and visual comfort with softer contrast

- **UI/UX Documentation:**
  - Created `UIUX.md` document to track design decisions and guidelines
  - Documented color palette, typography, and component patterns
  - Established design system guidelines for future development

### Files Modified

- `src/components/Header.jsx` - Dropdown menu hover states, YouTube icon
- `src/components/VideoCard.jsx` - YouTube overlay icon, checkmark icon
- `src/components/EnhancedSearchBar.jsx` - Search button text
- `src/components/CollectionModal.jsx` - Save button text, modal overlay
- `src/components/ActionBar.jsx` - Queue button text
- `src/components/SearchBar.jsx` - Search button text
- `src/components/FavoritesSidebar.jsx` - Overlay background
- `src/components/SearchHistory.jsx` - Overlay background

## [4.1.0] - 2025-01-XX

### Fixed

- **NextAuth.js v5 Beta Route Handler Compatibility:**
  - Fixed route handler export pattern to support NextAuth.js v5 beta (`next-auth@5.0.0-beta.30`)
  - Implemented dynamic handler extraction to support both v4 and v5 beta patterns
  - Resolved `CLIENT_FETCH_ERROR` and `TypeError` during sign-in attempts
  - Fixed redirect loop caused by `pages: { signIn: '/' }` configuration

- **OAuth Provider Configuration:**
  - Fixed GitHub OAuth ID leading space issue (added trimming logic)
  - Updated provider imports to use default exports (`import Google from "next-auth/providers/google"`)
  - Removed deprecated `pages` configuration that caused redirect loops

- **Next.js Configuration:**
  - Removed `experimental.esmExternals` option from `next.config.js` (not recommended)
  - Fixed webpack configuration warnings

- **Security Verification:**
  - Verified all API keys are server-side only (never exposed to client)
  - Confirmed no keys appear in URLs, console logs, or network requests
  - Documented security best practices

### Changed

- **Header Component:**
  - Replaced direct provider buttons with single "Sign In" button that opens dropdown menu
  - Improved user experience with standard dropdown menu pattern for provider selection
  - Added provider icons (Google, GitHub) in dropdown menu
  - Better visual feedback during authentication flow
  - Menu closes automatically when provider is selected or when clicking outside

- **Authentication Flow:**
  - Direct provider sign-in eliminates intermediate redirect page
  - Improved error handling for authentication failures
  - Better loading states during OAuth callback

### Technical Details

- **NextAuth.js Version:** Updated to `next-auth@5.0.0-beta.30` with `@auth/prisma-adapter@2.11.1`
- **Route Handler Pattern:** Supports both NextAuth v4 function pattern and v5 beta object pattern
- **Security:** All sensitive credentials remain server-side only via `process.env`

### Development Notes

- **Environment Variables:** All OAuth credentials must be properly configured in `.env.local`
- **GitHub OAuth:** Leading spaces in `GITHUB_ID` are automatically trimmed
- **Long URLs:** The `callbackUrl` parameter in URLs is safe and normal (contains no sensitive data)

## [4.0.0] - 2025-11-19

### Added

#### Phase 2 Backend Foundation - Database & Authentication

- **Database Schema (Prisma):**
  - Complete schema definition with all application models
  - **User Model**: Core user table with NextAuth.js required fields (`id`, `email`, `name`, `emailVerified`, `image`)
  - **Authentication Models**: `Account`, `Session`, `VerificationToken` tables for NextAuth.js integration
  - **Application Models**:
    - `Collection` - User-created video collections/playlists with user association
    - `Video` - YouTube video metadata storage (id, title, channelTitle, publishedAt, thumbnailUrl)
    - `VideosInCollections` - Many-to-many join table for videos and collections
    - `SearchHistory` - User search query history with timestamps
  - All models properly linked with foreign keys and cascade delete behavior
  - Database migrations applied successfully to Neon PostgreSQL

- **Authentication Backend (NextAuth.js):**
  - NextAuth.js v4.24.13 installed and configured
  - Prisma adapter (`@next-auth/prisma-adapter@1.0.7`) integrated for database-backed sessions
  - API route created at `/app/api/auth/[...nextauth]/route.js`
  - OAuth providers configured:
    - Google OAuth (requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`)
    - GitHub OAuth (requires `GITHUB_ID` and `GITHUB_SECRET`)
  - Prisma client singleton created at `src/lib/prisma.js` for database access

- **Authentication UI:**
  - `SessionProvider` added to `src/components/Providers.jsx` to wrap application
  - `AuthButton` component added to `src/components/Header.jsx`
  - Dynamic "Sign In" / "Sign Out" button with user avatar and name display
  - Loading state handling for session fetching
  - Responsive design (hides user name on small screens)

- **Path Alias Configuration:**
  - Created `jsconfig.json` to configure `@/` path alias pointing to project root
  - Enables clean imports like `@/lib/prisma` instead of relative paths

### Changed

- **Header Component**: Updated to include authentication UI alongside existing favorites button
- **Providers Component**: Now includes `SessionProvider` from NextAuth.js for session management

### Technical Details

- **Database**: Neon PostgreSQL (serverless) with Prisma ORM v6.19.0
- **Authentication**: NextAuth.js v4.24.13 with Prisma adapter for persistent sessions
- **Schema Location**: `prisma/schema.prisma`
- **Migrations**: Applied via `npx prisma migrate dev`
- **Prisma Client**: Generated via `npx prisma generate` (uses default `node_modules/@prisma/client`)
- **Prisma Version**: Standardized on v6.19.0 (stable) instead of v7 for reliability

### Development Notes

- **Environment Variables**: Prisma CLI requires `.env` file (not `.env.local`) to read `DATABASE_URL` during migrations. Next.js prioritizes `.env.local` at runtime. Both files can contain the same values, or use `.env` for Prisma-specific variables.
- **OAuth Setup**: OAuth credentials must be configured in Google Cloud Console and GitHub Developer Settings with proper redirect URIs for local development.

### Environment Variables Required

- `DATABASE_URL` - Neon PostgreSQL connection string
- `NEXTAUTH_SECRET` - Secret key for signing tokens (generate with `openssl rand -base64 32`)
- `NEXTAUTH_URL` - Canonical URL (e.g., `http://localhost:3000` for development)
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `GITHUB_ID` - GitHub OAuth app client ID
- `GITHUB_SECRET` - GitHub OAuth app client secret

### Migration Notes

- Database migrations must be run: `npx prisma migrate dev`
- Prisma client must be generated: `npx prisma generate` (usually automatic)
- OAuth provider credentials must be configured in `.env.local`
- Existing `localStorage` utilities remain functional but will be migrated to API routes in future updates

## [3.0.0] - 2025-01-XX

### Changed (Breaking)

#### Major Architectural Refactoring - Next.js Best Practices
- **Monolithic Component Decomposition**: Eliminated `src/App.jsx` in favor of `app/page.jsx` as the main entry point
  - Layout structure moved directly into `app/page.jsx`
  - Header extracted as separate `Header.jsx` component
  - Footer remains a Server Component
- **State Management Overhaul**: Replaced global `AppContext` with focused, granular state management
  - **URL-Based State**: Search parameters now stored in URL query string (shareable, bookmarkable)
  - **Component-Level State**: Modal states moved to local `useState` hooks
  - **Focused Custom Hooks**: Created specialized hooks for specific concerns:
    - `useSearchParams` - URL state management with Next.js `useSearchParams`
    - `useVideoSearch` - Video search operations and state
    - `useVideoSort` - Client-side video sorting logic
  - Removed `src/context/AppContext.jsx` and all related test files

### Added
- **Improved Channel Search**: API route now performs channelId lookup for accurate results
  - Searches YouTube API for channel by name first
  - Uses `channelId` parameter for precise video searches
  - Falls back to name-based filtering only if lookup fails
- **New Components**:
  - `src/components/Header.jsx` - Extracted header component
- **New Hooks**:
  - `src/hooks/useSearchParams.js` - URL-based state management
  - `src/hooks/useVideoSearch.js` - Video search logic
  - `src/hooks/useVideoSort.js` - Sorting logic

### Removed
- `src/App.jsx` - Replaced by `app/page.jsx`
- `src/context/AppContext.jsx` - Replaced by focused hooks and URL state
- `src/context/__tests__/AppContext.test.jsx` - No longer needed
- Empty `src/context/` directory structure

### Technical Improvements
- **Performance**: Eliminated global context re-renders on every state change
- **Maintainability**: Smaller, focused hooks are easier to test and maintain
- **Next.js Alignment**: Follows App Router best practices and patterns
- **Scalability**: Better foundation for Phase 2 database integration
- **User Experience**: URL-based state enables bookmarking and sharing of searches

### Migration Notes
- Search state is now in URL - users can bookmark and share search results
- Modal states are component-local - no global state pollution
- All functionality preserved - no breaking changes to user-facing features

## [2.1.1] - 2025-01-XX

### Fixed
- **Build Configuration**: Fixed `lightningcss` native module compatibility issues
  - Switched from Turbopack to webpack for better native module support
  - Updated PostCSS config to use `.cjs` format with string-based plugins
  - Updated npm scripts to use `--webpack` flag by default
- **PostCSS Configuration**: Resolved ES module/CommonJS conflicts
  - Renamed `postcss.config.js` to `postcss.config.cjs` for webpack compatibility
  - Configured plugins as strings instead of imported functions
- **Environment Variables**: Fixed `.env.local` not being prioritized over `.env`
  - Removed unnecessary `env` config from `next.config.js`
  - Next.js now correctly loads from `.env.local` automatically

### Technical Improvements
- **Native Module Support**: Webpack configuration handles `lightningcss` native bindings correctly
- **Build Stability**: Production builds now complete successfully

## [2.1.0] - 2025-01-XX

### Added
- **API Route Testing**: Comprehensive test suite for `/api/youtube/search` endpoint
  - Tests for API key validation, request validation, successful searches, error handling, channel filtering, and date filtering
  - Uses Vitest with custom MockRequest class for Next.js compatibility
- **UI Streaming with Suspense**: Added Suspense boundaries around VideoGrid component
  - Loading skeleton component (`VideoGridSkeleton`) for better perceived performance
  - Enables progressive rendering of search results
- **Server Component Optimization**: Isolated client providers into separate `Providers.jsx` component
  - Root layout (`app/layout.jsx`) is now a Server Component (no "use client" directive)
  - Enables Next.js performance optimizations (reduced JavaScript bundle size)

### Technical Improvements
- **Root Layout Optimization**: Removed "use client" from root layout, enabling Next.js Server Components benefits
- **Test Coverage**: Extended test coverage to include backend API routes
- **Performance**: Reduced initial JavaScript bundle by making root layout a Server Component
- **Developer Experience**: Better separation of client and server code

## [2.0.0] - 2025-01-XX

### Changed

#### Next.js Migration (Breaking Changes)
- **Framework Migration**: Migrated from Vite + React to Next.js
- **API Security**: YouTube API key moved server-side (no longer exposed to client)
- **API Routes**: All YouTube API calls now go through Next.js API routes (`/api/youtube/search`)
- **Environment Variables**: Changed from `VITE_YOUTUBE_API_KEY` to `YOUTUBE_API_KEY` (server-side only)

#### Removed
- **SettingsModal**: Removed API key management UI (no longer needed)
- **Client-Side API Key State**: Removed API key from `AppContext` and localStorage
- **API Key UI Elements**: Removed "Set API Key" button from header

### Added
- **Next.js App Router**: Added `app/` directory structure
- **API Route**: Created `app/api/youtube/search/route.js` for server-side YouTube search
- **Migration Guide**: Added `MIGRATION.md` with complete migration documentation
- **Environment Example**: Added `.env.example` for API key configuration

### Technical Improvements
- **Security**: API key never exposed to client-side code
- **Scalability**: Foundation for server-side features (authentication, database, rate limiting)
- **Performance**: Server-side rendering options available
- **Future-Ready**: Easy to add Supabase integration, authentication, etc.

### Migration Notes
- Update `.env` file: Change `VITE_YOUTUBE_API_KEY` to `YOUTUBE_API_KEY`
- Development: Use `npm run dev` (now runs Next.js instead of Vite)
- Build: Use `npm run build` (creates `.next/` folder instead of `dist/`)
- Production: Requires Node.js hosting (Vercel, Railway, etc.) instead of static hosting

## [1.4.0] - 2025-01-XX

### Added

#### Testing Infrastructure
- **Comprehensive AppContext Tests**: Full test coverage for core application logic
  - API key management (initialization, persistence, updates)
  - Search functionality (success, errors, pagination, validation)
  - Sort functionality (all 9 sort orders: date, title, views, channel, etc.)
  - Selection management (toggle, select all, deselect all, get selected)
  - Queue for transcription (success, errors, edge cases)
  - Modal state management
- **Transcription Queue Tests**: Complete test suite for queue utility
  - Queue operations (add, remove, clear, check)
  - Error handling (corrupted data, quota exceeded)
  - Edge cases (invalid IDs, duplicates, empty inputs)

#### Transcription Queue Feature
- **Transcription Queue System**: Implemented full queue functionality
  - `transcriptionQueue.js` utility module with localStorage persistence
  - Add videos to queue with duplicate prevention
  - Remove videos from queue
  - Clear entire queue
  - Check if video is in queue
  - Get queue size
  - Comprehensive error handling (quota exceeded, corrupted data)
  - Ready for backend integration (can easily swap localStorage for API calls)

### Changed
- **Queue for Transcription**: Now fully functional (previously just console.log)
  - Saves videos to persistent queue
  - Shows success/error messages
  - Handles edge cases (no selection, failures)
  - Clears selection after successful queue

### Technical Improvements
- Created `src/context/__tests__/AppContext.test.jsx` with 30+ test cases
- Created `src/utils/__tests__/transcriptionQueue.test.js` with comprehensive coverage
- Updated `AppContext` to use `transcriptionQueue` utility
- Added proper error handling and user feedback for queue operations

## [1.3.0] - 2025-01-XX

### Added

#### Favorites System
- **Favorites Sidebar**: Slide-in sidebar for managing favorite searches and channels
- **Save Favorites**: Save searches and channels as favorites for quick re-run
- **Favorite Management**: Delete favorites directly from sidebar
- **Channel Favorites**: Add channels to favorites from Top Channels section in SearchStats
- **Search Parameter Persistence**: Favorites now save and restore search parameters (dates, filters, etc.)

#### Channel Filtering & Suggestions
- **Channel Suggestions Component**: Dropdown with fuzzy matching suggestions when typing channel names
- **Fuzzy Matching Algorithm**: Levenshtein distance-based matching for flexible channel name search
- **Clickable Channels**: Channel names in Top Channels section are clickable to filter results
- **Channel Matcher Utility**: Dedicated utility module for channel name matching and filtering

#### Sort Functionality
- **SortBar Component**: Dedicated component for sorting search results
- **Client-Side Sorting**: Sort by date (newest/oldest), relevance, rating, title (A-Z/Z-A), views (most/least), channel (A-Z/Z-A)
- **Sort Persistence**: Sort order maintained across searches

#### Search Enhancements
- **Results Per Page Selector**: Choose 10, 20, 50, or 100 results per page with localStorage persistence
- **Optional Search Query**: Search query field is now optional when channel name is provided
- **Default Date Preset**: Defaults to "Last 7 Days" on initial load
- **Last 24 Hours Preset**: Added "One Day" quick preset option

### Changed
- **Search Query Validation**: Now allows empty query if channel name is provided
- **Channel Search**: Made less strict with improved fuzzy matching and suggestions
- **Date Preset Default**: Changed default preset to "Last 7 Days"
- **Star Icon Placement**: Moved star icon (add/remove favorite) to appear before channel name in Top Channels

### Fixed
- **Nested Button HTML Error**: Fixed React hydration error caused by nested `<button>` elements in FavoritesSidebar
- **Channel Favorites Not Working**: Fixed issue where selecting a channel favorite returned no results
  - Now saves current search parameters (dates, filters) when adding channel to favorites
  - Defaults to "Last 7 Days" date range if no dates were saved
  - Properly converts date formats (YYYY-MM-DD to RFC 3339) when loading favorites

### Technical Improvements
- Created `src/components/FavoritesSidebar.jsx` for favorites management UI
- Created `src/components/SortBar.jsx` for sort options
- Created `src/components/ChannelSuggestions.jsx` for channel name suggestions
- Created `src/utils/favorites.js` for favorites localStorage management
- Created `src/utils/channelMatcher.js` for fuzzy channel matching
- Enhanced `SearchStats` component to support adding channels to favorites
- Updated `App.jsx` to handle favorite selection with proper parameter restoration

## [1.2.0] - 2025-01-XX

### Changed

#### State Management Refactoring
- **React Context Implementation**: Refactored from centralized state in `App.jsx` to React Context (`AppContext`) for better scalability and maintainability
- **Eliminated Prop Drilling**: State and handlers are now accessible via `useAppContext()` hook throughout the component tree
- **Improved Code Organization**: Separated state management logic from UI components

#### Utility Functions Enhancement
- **Comprehensive Error Handling**: Added robust error handling to all utility functions:
  - localStorage availability checks
  - Quota exceeded error handling
  - Data validation and corruption detection
  - Better error messages and user feedback
- **Collections Utilities** (`src/utils/collections.js`):
  - Added validation for collection size limits
  - Improved error handling for localStorage operations
  - Added duplicate ID removal
  - Enhanced collection structure validation
- **Search History Utilities** (`src/utils/searchHistory.js`):
  - Added localStorage availability checks
  - Improved quota exceeded handling with automatic cleanup
  - Added entry validation to prevent corrupted data
  - Enhanced timestamp formatting with error handling
- **Export Utilities** (`src/utils/export.js`):
  - Added data validation before export
  - Improved CSV escaping for special characters
  - Added BOM for Excel compatibility
  - Enhanced error handling and user feedback
  - Added support for both Set and Array inputs

### Technical Improvements
- Created `src/context/AppContext.jsx` for centralized state management
- Updated `src/main.jsx` to wrap application with `AppProvider`
- Refactored `App.jsx` to use context instead of local state
- Fixed deprecated `substr` method usage (replaced with `slice`)
- Improved TypeScript-style JSDoc comments for better type safety

### Fixed
- Fixed potential localStorage quota exceeded errors
- Fixed JSON corruption handling in all utility functions
- Fixed CSV export escaping for special characters
- Fixed date input sizing inconsistency in search bar
- Added clear all fields button to search bar

## [1.1.0] - 2025-01-XX

### Added

#### Core UX Enhancements
- **Search History**: Save recent searches with timestamps, quick re-run functionality, localStorage persistence
- **Bulk Date Range Presets**: Quick filters for "Last 7 Days", "Last 30 Days", "This Month", "Last Year"
- **Advanced Search Filters**: 
  - Channel name filter (client-side filtering)
  - Duration filter (short/medium/long)
  - Sort by relevance, date, rating, title, view count
  - Language filter
- **Selection Management**:
  - Select All / Deselect All buttons
  - Selection counter in header
  - Save selections as collections/playlists
  - Export selected video IDs to JSON/CSV

#### Pagination & Data Loading
- **Pagination Support**: Load more results with "Load More" button
- **Infinite Scroll Ready**: Infrastructure for infinite scroll (button-based implementation)
- **Result Count Display**: Shows "X of Y results" with total count

#### Data Visualization & Analytics
- **Search Statistics Dashboard**: 
  - Total results count
  - Unique channels count
  - Average video duration
  - Date range visualization
  - Top channels breakdown
- **Video Metadata Display**:
  - View count with formatted numbers (K/M notation)
  - Like count
  - Comment count
  - Duration badges
  - Category tags (when available)

#### Collections & Export
- **Collections/Playlists**: Save selected videos as named collections with localStorage persistence
- **Export Functionality**:
  - Export to JSON (full video data)
  - Export to CSV (formatted for spreadsheets)
  - Export video IDs only (simple array)

### Changed
- Enhanced `useSelection` hook with `selectAll` and `deselectAll` methods
- Updated YouTube service to fetch additional video metadata (statistics, duration)
- Enhanced search API to support pagination, filters, and sorting
- Improved VideoCard component to display metadata (views, likes, comments, duration)
- Enhanced ActionBar with export menu and collection save functionality
- Updated VideoGrid with select all/deselect all controls and pagination support

### Technical Improvements
- Created utility modules for date presets, export, search history, and collections
- Enhanced YouTube API service with metadata fetching
- Added pagination support with page tokens
- Improved error handling and user feedback

### Testing
- Added Vitest testing framework
- Created test files for hooks and utilities
- Added test setup configuration

## [1.0.0] - 2025-01-XX

### Added
- Initial release of TubeTime
- YouTube video search with date range filtering
- Multi-select video cards with checkboxes
- Floating action bar for selected videos
- Settings modal for API key management
- Footer with copyright notice
- Dark mode design with red accents
- Responsive grid layout
- Loading and empty states
- Toast notifications

### Technical Stack
- React 19 with Vite 7
- Tailwind CSS v4.1.17
- Lucide React icons
- Sonner for notifications

