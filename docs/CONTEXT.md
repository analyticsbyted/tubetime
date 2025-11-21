# Project Context: TubeTime

This document provides a detailed history of the TubeTime project, including the initial vision, architectural decisions, development challenges, and their resolutions. It is intended to provide a smooth handover to any future developer or LLM model.

## Initial Vision

The project began with a clear vision from the user: a React application called 'TubeTime' to serve as the frontend for a future video transcription pipeline.

**Phase 1 (Current):** A historical YouTube search engine.
-   **Functionality:** Allows users to search for YouTube videos by query and date range, then curate a list of videos from the results.
-   **Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS, Lucide React.

**Phase 2 (In Progress):** Backend integration with persistent database and user authentication.
-   **Functionality:** User accounts, persistent collections, search history, and future video transcriptions.
-   **Backend Stack:** Neon (Serverless PostgreSQL), Prisma v6.19.0, NextAuth.js v4.24.13.
-   **Key Features:**
    -   Search bar with query, start date, and end date.
    -   A responsive grid of video cards, each with a selection checkbox.
    -   A floating "Action Bar" that appears when videos are selected.
    -   A "Queue for Transcription" button that simulates the future action by logging video IDs to the console and showing a toast notification.
    -   Robust API key management with support for `.env` files and a fallback settings modal.
-   **Aesthetic:** A "data-heavy" dark mode theme, similar to a Bloomberg terminal or Linear.app. Uses off-white (`zinc-100`) and off-black (`zinc-950`) colors instead of pure white/black for softer contrast. See [UIUX.md](./UIUX.md) for detailed design guidelines.

## Architectural Decisions

-   **State Management (v3.0.0):** 
    - URL-based state for search parameters (shareable, bookmarkable)
    - Component-level state for local UI concerns (modals, etc.)
    - Focused custom hooks for shared logic (`useVideoSearch`, `useVideoSort`, `useSearchParams`)
    - Custom `useSelection` hook for multi-select functionality
    - This approach eliminates global re-renders and follows Next.js best practices
-   **API Abstraction:** The YouTube API logic was isolated into a `youtubeService.js` file. This separation of concerns makes the code cleaner and will make it easier to integrate with a backend (like Supabase) in the future.
-   **Next.js App Router:** Uses `app/page.jsx` as the main entry point, following App Router patterns
-   **Styling:** Tailwind CSS was chosen for its utility-first approach, which is well-suited for rapid UI development and creating custom designs.
-   **Mobile-First Design:** A key requirement was that the application should be designed with a mobile-first orientation. This was implemented by using responsive prefixes (`sm:`, `md:`, etc.) in the Tailwind CSS classes.

-   **Backend & Database Stack:** For Phase 2, a composable stack was chosen over an all-in-one platform. The chosen stack consists of:
    -   **Database:** Neon (Serverless PostgreSQL) for its generous free tier and scalability.
    -   **ORM:** Prisma for its type-safety and excellent integration with the Next.js ecosystem.
    -   **Authentication:** NextAuth.js for its flexibility and seamless integration as a free, open-source library.

## Development History & Challenges

**Note:** The project was initially built with Vite + React, but migrated to Next.js in v2.0.0 for Phase 2 backend integration. The following sections document the original Vite setup for historical context.

### The PostCSS Configuration Saga (Historical - Vite Era)

1.  **Initial Setup:** The project was initially scaffolded with Vite and the necessary dependencies (`tailwindcss`, `postcss`, `autoprefixer`) were installed.
2.  **First Error:** The initial attempt to run the application resulted in an error: `[plugin:vite:css] [postcss] It looks like you're trying to use tailwindcss directly as a PostCSS plugin. The PostCSS plugin has moved to a separate package...`. This indicated an incompatibility between the version of Tailwind CSS (v4) and the PostCSS configuration.
3.  **First Attempted Fix:** The `postcss.config.js` was updated to use the new `@tailwindcss/postcss` package, and the Vite config was updated to explicitly point to the PostCSS config file. This led to a new error: `postcssConfig?.plugins.slice is not a function`. This error suggested that Vite was expecting the `plugins` property in the PostCSS config to be an array, but it was an object.
4.  **Second Attempted Fix:** The `postcss.config.js` was changed to export an array of plugins, in the more traditional PostCSS format. This, however, led back to the original error, as `tailwindcss` was being used directly as a plugin.
5.  **Resolution:** The final and correct solution was to use the array format for the `plugins` in `postcss.config.js`, but to import and use the `@tailwindcss/postcss` package as the plugin, not `tailwindcss`.

    **Correct `postcss.config.js` (still used with Next.js):**
    ```javascript
    import tailwindcss from '@tailwindcss/postcss';
    import autoprefixer from 'autoprefixer';

    export default {
      plugins: [
        tailwindcss,
        autoprefixer,
      ],
    };
    ```

### Styling and Layout Issues

-   **Dark Mode:** The initial dark mode styles were not being applied correctly, resulting in a white background. This was resolved by applying the dark background color to the `html`, `body`, and `#root` elements in `src/index.css`.
-   **Form Elements:** The date input fields and the search button had white backgrounds due to default browser styling. This was fixed by adding `appearance-none` and explicit color classes to these elements in the `SearchBar.jsx` component.
-   **Layout Width:** The main content area was spanning the full width of the viewport. This was addressed by adding `max-w-7xl` and `mx-auto` to the `main` element (now in `app/page.jsx`).

### Tailwind CSS v4 Migration

6.  **Tailwind CSS v4 Setup:** The project was upgraded to Tailwind CSS v4.1.17, which introduced a new CSS import syntax:
    - **Old Syntax:** `@tailwind base; @tailwind components; @tailwind utilities;`
    - **New Syntax:** `@import "tailwindcss";`
    - The PostCSS configuration uses `@tailwindcss/postcss` plugin
    - This change resolved styling issues where Tailwind classes weren't being applied

### Design System Implementation

-   **Visual Redesign:** The application was redesigned to match a reference design with:
    - Red accent colors (`red-500`, `red-600`) instead of blue
    - Darker background (`zinc-950` instead of `zinc-900`)
    - Refined typography with monospace fonts for data elements
    - Improved spacing and layout constraints (`max-w-7xl`)
    - Enhanced hover effects and transitions
    - YouTube icon overlays on video cards
    - Calendar icons for date display

-   **Component Improvements:**
    - Search bar redesigned with labeled inputs and grid layout
    - End date field is optional (no default) - allows searching recent content without specifying end date
    - Video cards with improved hover states and selection indicators
    - Action bar with better positioning and styling
    - Footer component added with copyright notice (© 2025 Ted Dickey II)
    - Settings modal with improved UX and keyboard shortcuts
    - Loading states with spinner animations
    - Empty states with helpful messaging

### Feature Enhancements (v1.1.0)

-   **Search Enhancements:**
    - Search history with localStorage persistence and quick re-run
    - Bulk date range presets (Last 7/30 days, This Month, Last Year)
    - Advanced filters: channel name, duration, sort order, language
    - Pagination support with "Load More" functionality
    
-   **Selection Management:**
    - Select All / Deselect All functionality
    - Selection counter displayed in header
    - Enhanced useSelection hook with additional methods
    
-   **Collections & Export:**
    - Save selected videos as collections/playlists
    - Export to JSON, CSV, or video IDs only
    - Collections stored in localStorage
    
-   **Analytics & Metadata:**
    - Search statistics dashboard with comprehensive metrics
    - Video metadata display (views, likes, comments, duration)
    - Channel distribution and top channels analysis
    - Average duration calculations
    
-   **Testing Infrastructure:**
    - Vitest testing framework configured
    - Test files for hooks and utilities
    - Test setup and configuration

## Current Status

**Migration Status:** ✅ All localStorage features have been successfully migrated to database-backed API routes (Phases 2-5 complete as of v4.6.0). The application is now in a stable, production-ready state with full database persistence.

The application is now in a stable, production-ready state with enhanced features:

✅ **Configuration:** PostCSS and Tailwind CSS v4 are properly configured  
✅ **Styling:** All Tailwind classes are being applied correctly  
✅ **Layout:** Responsive, mobile-first design with proper constraints  
✅ **Core Features:** All Phase 1 features are implemented and working  
✅ **Enhanced Features:** Search history, filters, pagination, collections, export, analytics  
✅ **Design:** Matches the reference design with red accents and dark theme  
✅ **API Integration:** YouTube API abstraction layer with metadata fetching  
✅ **State Management:** Multi-select functionality with select all/deselect all  
✅ **Data Persistence:** All user data (collections, search history, favorites, transcription queue) persisted in PostgreSQL database with localStorage fallback during migration period  
✅ **Testing:** Test infrastructure in place with sample tests  
✅ **Footer:** Copyright footer component implemented  
✅ **Search UX:** Optional end date allows searching recent content by default  
✅ **State Management:** Refactored to React Context for better scalability  
✅ **Error Handling:** Comprehensive error handling in all utility functions  
✅ **Favorites System:** Save and manage favorite searches and channels  
✅ **Channel Filtering:** Clickable channels in stats, fuzzy matching suggestions  
✅ **Sort Functionality:** Client-side sorting with dedicated SortBar component  
✅ **Transcription Queue:** Implemented queue system with database persistence (Phase 5 - COMPLETE)
✅ **Comprehensive Testing:** Test suite for utility functions (AppContext tests removed after refactoring)
✅ **Database Foundation:** Complete schema with User, Account, Session, Collection, Video, VideosInCollections, SearchHistory, Favorite, and TranscriptionQueue models. All migrations applied successfully.
✅ **Authentication Foundation:** NextAuth.js fully integrated with Prisma adapter, Google and GitHub OAuth providers, and UI components in Header.
✅ **API Routes:** Complete REST API for Collections (Phase 2), Search History (Phase 3), Favorites (Phase 4), and Transcription Queue (Phase 5). All routes authenticated and user-scoped.
✅ **Dual-Write Pattern:** All features implement dual-write pattern (database + localStorage) for smooth migration and backward compatibility.
### Architectural Refactoring (v3.0.0) - Next.js Best Practices

**Major Refactoring Completed**: The application underwent a comprehensive architectural refactoring to align with Next.js best practices and eliminate the "god object" pattern.

**Previous Architecture (v1.2.0 - v2.1.1):**
- Monolithic `src/App.jsx` component containing entire application
- Global `AppContext` managing all state (search, selection, modals, API key)
- Prop-drilling issues resolved but created new problems:
  - Entire app re-rendered on any state change (e.g., opening a modal)
  - Difficult to test and maintain
  - Not aligned with Next.js App Router patterns

**New Architecture (v3.0.0):**
- **Decomposed Monolithic Component**: 
  - `app/page.jsx` is now the main entry point (replaces `src/App.jsx`)
  - Header extracted as `src/components/Header.jsx`
  - Layout structure directly in page component
  - Footer remains a Server Component

- **Granular State Management**:
  - **URL-Based State**: Search parameters stored in URL query string using `useSearchParams`
    - Makes searches shareable and bookmarkable
    - Follows Next.js App Router best practices
    - State persists across page refreshes
  - **Component-Level State**: Modal states use local `useState` hooks
    - No global re-renders when opening/closing modals
    - Better performance and isolation
  - **Focused Custom Hooks**: Replaced AppContext with specialized hooks:
    - `useSearchParams` - Manages URL state and updates
    - `useVideoSearch` - Handles video search operations and state
    - `useVideoSort` - Client-side sorting logic
    - `useSelection` - Multi-select functionality (existing, unchanged)

**Benefits:**
- **Performance**: Eliminated global context re-renders - only affected components update
- **Maintainability**: Smaller, focused hooks are easier to understand and test
- **Next.js Alignment**: Follows App Router patterns and best practices
- **User Experience**: URL-based state enables bookmarking and sharing
- **Scalability**: Better foundation for Phase 2 database integration
- **Testability**: Focused hooks can be tested independently

**Files Removed:**
- `src/App.jsx` - Replaced by `app/page.jsx`
- `src/context/AppContext.jsx` - Replaced by focused hooks
- `src/context/__tests__/AppContext.test.jsx` - No longer needed

**Files Created:**
- `app/page.jsx` - Main page component
- `src/components/Header.jsx` - Extracted header component
- `src/hooks/useSearchParams.js` - URL state management
- `src/hooks/useVideoSearch.js` - Video search logic
- `src/hooks/useVideoSort.js` - Sorting logic

**Utility Functions Enhancement:**
All utility functions (`collections.js`, `searchHistory.js`, `export.js`) were enhanced with:
- localStorage availability checks (handles private browsing, disabled storage)
- Quota exceeded error handling (automatic cleanup strategies)
- Data validation and corruption detection (prevents app crashes)
- Better error messages (user-friendly feedback)
- Type validation (JSDoc comments for better type safety)

### Recent Bug Fixes & Enhancements (v1.3.0)

**Favorites System Implementation:**
- Created `FavoritesSidebar` component for managing favorite searches and channels
- Implemented `favorites.js` utility for localStorage persistence
- Added ability to save channels from Top Channels section in SearchStats
- Fixed nested button HTML validation error in FavoritesSidebar (restructured to use div containers)
- Fixed channel favorites not returning results when selected (now saves and loads search parameters including date ranges)

**Channel Filtering Enhancements:**
- Created `ChannelSuggestions` component with fuzzy matching using Levenshtein distance
- Implemented `channelMatcher.js` utility for flexible channel name matching
- Made channel names clickable in SearchStats to filter results
- Added star icon to add/remove channels from favorites directly from stats

**Sort Functionality:**
- Created `SortBar` component for client-side sorting
- Supports sorting by date (newest/oldest), relevance, rating, title (A-Z/Z-A), views (most/least), channel (A-Z/Z-A)
- Sort order persists across searches

**Date Presets:**
- Added "Last 24 Hours" preset option
- Default preset changed to "Last 7 Days" on initial load

**Search Enhancements:**
- Made search query optional when channel name is provided
- Added results per page selector (10, 20, 50, 100) with persistence
- Improved channel search to be less strict with fuzzy matching

**Testing & Quality Assurance:**
- Created comprehensive test suite for `AppContext` covering:
  - API key management
  - Search functionality (success, errors, pagination, validation)
  - Sort functionality (all sort orders)
  - Selection management (toggle, select all, deselect all)
  - Queue for transcription
  - Modal state management
- Created test suite for `transcriptionQueue` utility covering:
  - Queue operations (add, remove, clear)
  - Error handling (corrupted data, quota exceeded)
  - Edge cases (invalid IDs, duplicates)

**Transcription Queue Implementation:**
- Created `transcriptionQueue.js` utility for managing queued videos
- Implements localStorage persistence with error handling
- Handles quota exceeded scenarios with automatic cleanup
- Validates input and prevents duplicates
- Ready for backend integration in Phase 2 (can easily swap localStorage for API calls)
- Integrated into `AppContext.handleQueue` function

### Scalability Considerations & Future Recommendations

The current implementation uses localStorage and client-side processing, which is perfectly suitable for Phase 1. However, as the application scales, the following considerations should be kept in mind:

**Current Limitations:**
- **localStorage Size Limits:** Typically 5-10MB per domain. With video metadata, this could become a constraint with thousands of videos.
- **Client-Side Sorting:** Works well for hundreds of videos, but may become slow with thousands.
- **Rendering Performance:** Large lists of video cards may impact rendering performance.

**Recommended Future Enhancements:**

1. **List Virtualization** (When handling 1000+ videos):
   - Use libraries like `react-window` or `@tanstack/react-virtual`
   - Only render visible items in the viewport
   - Significantly improves performance for long lists
   - Example: `npm install react-window`

2. **Web Workers** (For heavy data processing):
   - Offload sorting and filtering operations to Web Workers
   - Prevents UI freezing during large dataset processing
   - Useful when client-side operations become a bottleneck
   - Example: Move `sortVideos` function to a Web Worker

3. **Advanced Storage** (When localStorage limits are reached):
   - Migrate to IndexedDB for larger storage capacity (hundreds of MB)
   - Better query capabilities for complex filtering
   - Libraries: `idb` or `Dexie.js` for easier IndexedDB management
   - Example: `npm install idb`

4. **Backend Integration** (Phase 2):
   - Move transcription queue to Supabase database
   - Server-side pagination and filtering
   - Real-time updates for transcription status
   - Better scalability for production use

**When to Consider These:**
- **Virtualization:** When rendering 500+ video cards causes noticeable lag
- **Web Workers:** When sorting 1000+ videos takes >100ms
- **IndexedDB:** When localStorage quota warnings appear or data exceeds 5MB
- **Backend:** When moving to Phase 2 (production deployment)

These are **future considerations** and not immediate requirements. The current implementation is well-optimized for typical use cases.

### Next.js Migration (v2.0.0)

**Migration Completed**: Successfully migrated from Vite + React to Next.js for Phase 2 backend integration.

**Key Changes:**
- **API Security**: YouTube API key moved server-side (stored in `.env` as `YOUTUBE_API_KEY`)
- **API Routes**: Created `/api/youtube/search` endpoint for server-side YouTube API calls
- **Client-Side Updates**: `youtubeService.js` now calls Next.js API routes instead of direct YouTube API
- **Removed Client-Side API Key Management**: SettingsModal and API key UI elements removed
- **Project Structure**: Added `app/` directory with Next.js App Router structure
- **Configuration**: Added `next.config.js`, updated `package.json` scripts

**Benefits:**
- API key never exposed to client (security improvement)
- Ready for server-side features (authentication, database, rate limiting)
- Better scalability and performance options
- Foundation for Phase 2 backend integration

**Migration Details**: See `MIGRATION.md` for complete migration guide and rollback instructions.

### API Route Improvements (v3.0.0)

**Enhanced Channel Search:**
- API route now performs channelId lookup before searching for videos
- Searches YouTube API for channel by name first
- Uses `channelId` parameter for accurate video searches directly from YouTube
- Falls back to name-based client-side filtering only if channel lookup fails
- Significantly improves accuracy of channel-specific searches

**Implementation Details:**
- Two-step process: First search for channel, then use channelId in video search
- Graceful error handling - continues with name filtering if lookup fails
- More efficient - fewer API calls and more accurate results

### Known Issues

None currently. The application is ready for Phase 2 development (backend integration with Supabase + Whisper).

### Phase 2: Backend Integration (Foundation Complete)

**Status:** ✅ Database schema and authentication backend foundation completed.

The project has entered Phase 2, which involves building out the backend infrastructure to support user accounts, persistent data, and video transcriptions.

**Chosen Tech Stack:**
-   **Database:** Neon (Serverless PostgreSQL) - Selected for serverless architecture and generous free tier
-   **ORM:** Prisma v6.19.0 - Standardized on stable v6 for reliability (v7 had initial connection issues)
-   **Authentication:** NextAuth.js v4.24.13 - Chosen for seamless Next.js integration and Prisma ecosystem compatibility

**Development Process & Challenges:**

During implementation, several technical decisions were made:

1. **Prisma Version Selection**: Initially encountered connection issues with Prisma v7's new configuration requirements. Standardized on Prisma v6.19.0 for stability and reliability, ensuring consistent behavior across development and production environments.

2. **Environment Variable Configuration**: Discovered that Prisma CLI requires environment variables to be in `.env` (not `.env.local`) to properly read `DATABASE_URL` during migrations. Next.js automatically prioritizes `.env.local` at runtime, but Prisma's CLI tools read from `.env` directly. This was resolved by ensuring both files exist or using `.env` for Prisma-specific variables.

3. **OAuth Provider Setup**: Configured Google and GitHub OAuth providers with proper redirect URIs:
   - Google: `http://localhost:3000/api/auth/callback/google`
   - GitHub: `http://localhost:3000/api/auth/callback/github`
   Both providers require credentials to be created in their respective developer consoles.

**Completed Foundation (v4.0.0):**

1. **Database Schema:**
   - ✅ **User Model**: Core user table with NextAuth.js required fields (`id`, `email`, `name`, `emailVerified`, `image`)
   - ✅ **Authentication Models**: `Account`, `Session`, `VerificationToken` tables for NextAuth.js
   - ✅ **Application Models**: 
     - `Collection` - User-created video collections/playlists
     - `Video` - YouTube video metadata (id, title, channelTitle, publishedAt, thumbnailUrl)
     - `VideosInCollections` - Many-to-many join table linking videos to collections
     - `SearchHistory` - User search query history (expanded with full search parameters)
     - `Favorite` - User favorites for searches and channels
     - `TranscriptionQueue` - Video transcription queue with status tracking
   - ✅ **Relations**: All models properly linked with foreign keys and cascade deletes
   - ✅ **Database Migrations**: Three migrations applied successfully:
     - Initial migration (`20251119223544_init`) - Created User table
     - App and Auth models (`20251119230535_add_app_and_auth_models`) - Added all authentication and application tables
     - Schema expansion (`20251120023547_add_favorites_and_transcription_queue_expand_search_history`) - Added Favorite and TranscriptionQueue models, expanded SearchHistory

2. **Authentication Backend:**
   - ✅ **NextAuth.js Installation**: Installed `next-auth@4.24.13` and `@next-auth/prisma-adapter@1.0.7`
   - ✅ **API Route**: Created `/app/api/auth/[...nextauth]/route.js` with Prisma adapter
   - ✅ **OAuth Providers**: Configured Google and GitHub providers (requires `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_ID`, `GITHUB_SECRET` environment variables)
   - ✅ **Session Management**: Integrated with Prisma for persistent sessions
   - ✅ **Prisma Client Setup**: Created `src/lib/prisma.js` singleton for database access
   - ✅ **Prisma Version**: Standardized on Prisma v6.19.0 for stability and reliability

3. **Authentication UI:**
   - ✅ **SessionProvider**: Added to `src/components/Providers.jsx` to wrap application
   - ✅ **Header Integration**: Updated `src/components/Header.jsx` with `AuthButton` component
   - ✅ **User Display**: Shows user avatar, name, and "Sign Out" button when authenticated
   - ✅ **Sign In Dropdown**: Single "Sign In" button opens dropdown menu with provider options (Google, GitHub)
   - ✅ **Provider Selection**: Dropdown menu displays provider icons and names for better UX
   - ✅ **Menu Behavior**: Dropdown closes automatically on selection or outside click
   - ✅ **Loading State**: Shows loading skeleton while session is being fetched

**Authentication Troubleshooting & Fixes (v4.1.0):**

During initial authentication setup, several issues were encountered and resolved:

1. **NextAuth.js v5 Beta Compatibility:**
   - **Issue**: NextAuth.js v5 beta (`5.0.0-beta.30`) uses a different route handler export pattern than v4
   - **Error**: `CLIENT_FETCH_ERROR` and `TypeError: Function.prototype.apply was called on #<Object>`
   - **Solution**: Implemented dynamic handler extraction in `app/api/auth/[...nextauth]/route.js` to support both v4 function pattern and v5 beta object pattern
   - **Code Pattern**: Checks if handler is a function (v4) or object with `handlers.GET/POST` or direct `GET/POST` properties (v5 beta)

2. **OAuth Provider Import Syntax:**
   - **Issue**: Provider imports were using named exports instead of default exports
   - **Error**: Provider configuration failures
   - **Solution**: Changed from `import GoogleProvider from "next-auth/providers/google"` to `import Google from "next-auth/providers/google"` (default export)

3. **Redirect Loop:**
   - **Issue**: `pages: { signIn: '/' }` configuration caused infinite redirect loop
   - **Error**: Server logs showed repeated redirects to `/` with nested `callbackUrl` parameters
   - **Solution**: Removed `pages` configuration and implemented single "Sign In" button with dropdown menu in Header component

4. **GitHub OAuth ID Leading Space:**
   - **Issue**: `GITHUB_ID` environment variable had a leading space, causing authentication failures
   - **Error**: GitHub sign-in returned 404
   - **Solution**: Added trimming logic: `const githubId = process.env.GITHUB_ID?.trim() || process.env.GITHUB_ID`

5. **Security Verification:**
   - **Concern**: User reported seeing long URLs and questioned if API keys were exposed
   - **Verification**: Confirmed all keys are server-side only (`process.env`), never sent to client, never in URLs
   - **Long URLs**: Explained that `callbackUrl` parameter is safe and normal (contains no sensitive data)
   - **Documentation**: Added security verification section to documentation

6. **Next.js Configuration Cleanup:**
   - **Issue**: `experimental.esmExternals` option was causing warnings
   - **Solution**: Removed deprecated option from `next.config.js`

**Phase 1: Schema Updates (v4.2.0) - ✅ COMPLETE:**

1. **SearchHistory Model Expansion:**
   - Expanded from single `query` field to individual fields for all search parameters
   - Made `query` optional to support channel-only searches
   - Added fields: `channelName`, `startDate`, `endDate`, `duration`, `language`, `order`, `maxResults`
   - Added indexes: `[userId, createdAt]` and `[userId, query]` for performance

2. **Favorite Model Creation:**
   - Created new `Favorite` model for user favorites
   - Stores both search and channel favorites with JSON data field
   - Type field distinguishes between 'search' and 'channel' favorites
   - Indexed by `[userId, type]` and `[userId, createdAt]` for efficient queries

3. **TranscriptionQueue Model Creation:**
   - Created new `TranscriptionQueue` model for video transcription management
   - Status tracking: 'pending', 'processing', 'completed', 'failed'
   - Priority system for queue ordering
   - Error message storage for failed transcriptions
   - Unique constraint on `[userId, videoId]` prevents duplicate entries
   - Indexed by `[userId, status]` and `[userId, createdAt]` for efficient queue queries

4. **Model Relations Updated:**
   - `User` model: Added `favorites` and `transcriptionQueue` relations
   - `Video` model: Added `transcriptionQueue` relation

**Migration Applied:** `20251120023547_add_favorites_and_transcription_queue_expand_search_history`

**Phase 2: Collections API Routes (v4.2.1) - ✅ BACKEND COMPLETE:**

1. **API Routes Implemented:**
   - ✅ `GET /api/collections` - List user's collections
   - ✅ `POST /api/collections` - Create new collection
   - ✅ `GET /api/collections/[id]` - Get specific collection with videos
   - ✅ `PUT /api/collections/[id]` - Update collection (rename)
   - ✅ `DELETE /api/collections/[id]` - Delete collection
   - ✅ `POST /api/collections/[id]/videos` - Add video to collection

2. **Implementation Quality:**
   - ✅ Proper authentication with `getServerSession`
   - ✅ User scoping (all queries filtered by userId)
   - ✅ Authorization checks (authorizeCollection helper)
   - ✅ Video upsert logic (always updates metadata)
   - ✅ Comprehensive error handling (401, 403, 404, 500)
   - ✅ Proper Prisma error code handling (P2002, P2025)
   - ✅ Input validation

3. **Code Quality:**
   - ✅ Clean helper functions
   - ✅ Consistent error handling pattern
   - ✅ Good code organization
   - ✅ Proper comments

**Phase 2: Collections Frontend Integration (v4.3.0) - ✅ COMPLETE:**

1. **Frontend Integration:**
   - ✅ Created `collectionsService.js` API client with all CRUD operations
   - ✅ Updated `CollectionModal.jsx` to use API routes
   - ✅ Implemented dual-write pattern (database + localStorage)
   - ✅ Added authentication integration with NextAuth.js
   - ✅ Comprehensive error handling and user feedback
   - ✅ Loading states and disabled states during operations

2. **Testing:**
   - ✅ All test scenarios passed successfully
   - ✅ Authenticated flow verified
   - ✅ Unauthenticated flow verified
   - ✅ Dual-write behavior verified
   - ✅ Error handling verified
   - ✅ Edge cases verified

3. **Documentation:**
   - ✅ Created `TESTING_COLLECTIONS.md` testing guide
   - ✅ Created `COLLECTIONS_IMPLEMENTATION_SUMMARY.md` summary

**Phase 3: Search History API Routes & Frontend Integration (v4.4.0) - ✅ COMPLETE:**

1. **API Routes:**
   - ✅ `GET /api/search-history` - List user's search history
   - ✅ `POST /api/search-history` - Save new search
   - ✅ `DELETE /api/search-history` - Clear all history
   - ✅ `DELETE /api/search-history/[id]` - Delete specific entry

2. **Frontend Integration:**
   - ✅ Created `searchHistoryService.js` API client
   - ✅ Updated `searchHistory.js` utility with dual-write pattern
   - ✅ Updated `SearchHistory.jsx` component with async API
   - ✅ Updated `useVideoSearch.js` to save all search parameters
   - ✅ Updated `page.jsx` to restore all search parameters

3. **Features:**
   - ✅ Full parameter support (query, channelName, dates, filters, etc.)
   - ✅ Duplicate detection (prevents saving same search within 1 minute)
   - ✅ Automatic cleanup (keeps only last 50 entries per user)
   - ✅ Dual-write pattern (database + localStorage)
   - ✅ Backward compatibility maintained

4. **Documentation:**
   - ✅ Created `SEARCH_HISTORY_IMPLEMENTATION_SUMMARY.md`
   - ✅ Created `TESTING_PHASE3_PHASE4.md` comprehensive testing guide

5. **Bug Fixes (v4.5.1):**
   - ✅ Fixed empty array handling in `getSearchHistory()`
   - ✅ Fixed race conditions in `SearchHistory.jsx`

**Remaining Phase 2 Tasks:**
-   ✅ **Frontend Integration (High Priority):** COMPLETE

**Phase 4: Favorites API Routes & Frontend Integration (v4.5.0) - ✅ COMPLETE:**

1. **API Routes:**
   - ✅ `GET /api/favorites` - List user's favorites (with optional type filter)
   - ✅ `POST /api/favorites` - Create new favorite (with duplicate detection)
   - ✅ `DELETE /api/favorites` - Clear all favorites
   - ✅ `GET /api/favorites/[id]` - Get specific favorite
   - ✅ `PUT /api/favorites/[id]` - Update favorite
   - ✅ `DELETE /api/favorites/[id]` - Delete specific favorite
   - ✅ `GET /api/favorites/check` - Check if favorite exists by name and type

2. **Frontend Integration:**
   - ✅ Created `src/services/favoritesService.js` API client
   - ✅ Updated `src/utils/favorites.js` with dual-write pattern
   - ✅ Updated `FavoritesSidebar.jsx` with async API integration
   - ✅ Updated `EnhancedSearchBar.jsx` to use async favorites API
   - ✅ Updated `SearchStats.jsx` to use async favorites API

3. **Features:**
   - ✅ Duplicate detection (prevents duplicate favorites by name+type)
   - ✅ Update existing favorites if name+type match
   - ✅ Dual-write pattern (database + localStorage)
   - ✅ Handles both database IDs (cuid) and localStorage IDs

4. **Documentation:**
   - ✅ Created `FAVORITES_IMPLEMENTATION_SUMMARY.md`
   - ✅ Created `TESTING_PHASE3_PHASE4.md` comprehensive testing guide

5. **Bug Fixes (v4.5.1):**
   - ✅ Fixed race conditions in `FavoritesSidebar.jsx`

**Phase 5: Transcription Queue API Routes & Frontend Integration (v4.6.0) - ✅ COMPLETE:**

1. **API Routes:**
   - ✅ `GET /api/transcription-queue` - List user's queue items (with optional status filter)
   - ✅ `POST /api/transcription-queue` - Add videos to queue (batch operation with transaction)
   - ✅ `DELETE /api/transcription-queue` - Clear queue (with optional status filter)
   - ✅ `GET /api/transcription-queue/[id]` - Get specific queue item
   - ✅ `PUT /api/transcription-queue/[id]` - Update queue item (status, priority, errorMessage)
   - ✅ `DELETE /api/transcription-queue/[id]` - Remove specific queue item

2. **Frontend Integration:**
   - ✅ Created `src/services/transcriptionQueueService.js` API client
   - ✅ Updated `src/utils/transcriptionQueue.js` with dual-write pattern (all functions now async)
   - ✅ Updated `app/page.jsx` to handle async queue operations

3. **Features:**
   - ✅ Status transition validation (pending → processing → completed/failed, failed → pending for retry)
   - ✅ Batch operations with Prisma transactions for atomicity
   - ✅ Efficient API responses (returns summary instead of all items for batch operations)
   - ✅ Priority support (higher number = higher priority)
   - ✅ Duplicate detection (prevents adding same video twice)
   - ✅ Dual-write pattern (database + localStorage)
   - ✅ Video upsert (creates video record if not exists)

4. **Documentation:**
   - ✅ Created `TRANSCRIPTION_QUEUE_IMPLEMENTATION_SUMMARY.md`
   - ⏳ Testing guide - PENDING

-   **Other localStorage Migrations:**
    - ✅ `searchHistory.js` → API routes for SearchHistory operations (Phase 3 - COMPLETE)
    - ✅ `favorites.js` → API routes for favorites management (Phase 4 - COMPLETE)
    - ✅ `transcriptionQueue.js` → API routes for transcription queue management (Phase 5 - COMPLETE)

-   **Future Enhancements:**
    - Bulk video addition endpoint (optimization)
    - Collection creation with videos in one request (UX improvement)
    - Integrate transcription service (e.g., Whisper API)
    - Add rate limiting to API routes (post-core functionality)

## Project Structure (as of v4.5.2)

The repository now organizes shared documentation and test suites in dedicated top-level folders:

```
/
├── app/                     # Next.js App Router entry points and layouts
├── docs/                    # All project documentation (context, changelog, migration plan, testing guides, summaries)
├── prisma/                  # Prisma schema and migrations
├── public/                  # Static assets
├── src/                     # Frontend components, hooks, services, utilities
├── tests/                   # Vitest suites (mirrors src structure where applicable)
├── lib/                     # Server-side helpers (e.g., Prisma client singleton)
├── package.json, etc.       # Tooling configuration
└── README.md                # Getting started guide with pointers into docs/
```

Key notes:

- `docs/` centralizes every Markdown reference to keep the repo root focused on code. Link to files as `./docs/<file>.md`.
- `tests/` houses all Vitest specs, separating test code from runtime bundles. Update Vitest globs as new suites are added.
- Prisma client artifacts are generated via `npx prisma generate` (default output in `node_modules/@prisma/client`).

This structure should be updated whenever a new top-level concern is introduced (e.g., e2e tests folder or additional documentation sets).
