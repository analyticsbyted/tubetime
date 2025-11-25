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

## Phase 6-7: Transcription Worker Deployment Timeline (2025)

This section captures the production history of the Hugging Face Space worker and related fixes so a new team can understand what was tried, what worked, and where we are today.

### Architecture Snapshot

- **Worker stack:** FastAPI + Whisper (`distil-whisper/distil-medium.en`), `yt-dlp`, ffmpeg; deployed via `python:3.11` Docker image.
- **Hosting:** Hugging Face Spaces (Docker SDK) at `analyticsbyted/tubetime-transcription-worker`.
- **Secrets:** `TRANSCRIPTION_WORKER_SECRET` (auth), `YOUTUBE_COOKIES` (Base64 Netscape file), and optional `TRANSCRIPTION_WORKER_URL` override in `.env`.
- **Frontend orchestration:** `app/api/transcription-queue/process/route.js` ensures `Video` + `Transcript` rows exist before escalating UI updates.

### Timeline of Incidents & Fixes

| Date (2025) | Problem | Symptoms | Fix / Outcome |
|-------------|---------|----------|---------------|
| Nov 18 | DNS resolution failures (`[Errno -5]`) inside Space | yt-dlp could not reach `www.youtube.com` despite `force_ipv4` | Switched Docker base to `python:3.11`, removed non-root user, and added startup script that rewrites `/etc/resolv.conf` with Google + Cloudflare DNS at build and runtime. |
| Nov 19 | YouTube bot detection (“Sign in to confirm you’re not a bot”) | yt-dlp saw only image formats, Whisper received empty audio | Added cookie ingestion pipeline: filter active cookies (`filter_active_cookies.py`), Base64 encode to preserve tabs, store as `YOUTUBE_COOKIES` secret, decode at runtime into temp file, and prioritize `web` client with iOS UA fallback. |
| Nov 20 | Hugging Face build failures (exit code 255) after adding cookie secret | Build aborted before running tests | Cookie secret exceeded HF size/line limits. Filtering + Base64 encoding reduced to ~3 KB and restored successful builds. |
| Nov 21 | Gradio SDK experiments | Port 7860 conflicts, exit code 0 (no server running) | Wrapped FastAPI with Gradio `Blocks`, but reverted to Docker SDK for full control. Documented SDK-switch procedure for future reference. |
| Nov 22 | Transcripts saved without `Video` relation | Transcript modal showed debug state: has transcript, no video | Fixed queue processor to `upsert` the video before writing the transcript. Added fallbacks in `/api/transcripts/[videoId]` and `TranscriptModal` to avoid blank UI. |
| Nov 23 | Worker returning incomplete transcripts (~600 chars of 4-minute video) | UI shows partial text only | Added instrumentation inside `app.py` to log expected vs actual word count and flag incomplete runs. Cause is YouTube SABR streaming that strips audio URLs even with cookies. Future work documented under “Open Risks”. |

### Open Risks / Next Experiments

1. **SABR / E-Challenge solving:** yt-dlp warns “n challenge solving failed”. We currently ship `deno` runtime but no JS solver bundle. Evaluate bundling Node or the yt-dlp JS solver assets, or proxying via `youtubei.js`.
2. **Platform alternatives:** Factory rebuilds occasionally revert DNS; Railway/Render/Fly deployments should stay on the roadmap if HF policy changes.
3. **Cookie rotation:** Secrets expire every few days. Documented workflow for exporting fresh cookies, filtering, Base64 encoding, and updating the Space.
4. **Transcript completeness validation:** Worker now logs warnings when transcripts fall below 30% of expected words. Consider surfacing that flag in Prisma so the UI can tell the user a retry is recommended.

Refer to `docs/HUGGINGFACE_SPACE_SETUP.md` for deployment steps and `docs/TRANSCRIPTION_WORKER_TROUBLESHOOTING.md` for detailed logs of each incident, including commands and configuration diffs.

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

**Migration Status:** ✅ All localStorage features have been successfully migrated to database-backed API routes (Phases 2-5 complete). Clean cutover completed (v4.7.0) - all localStorage code removed. Phase 7 (Display Transcripts) complete (v4.8.0). The application is now database-only with authentication required for all persistent data operations.

The application is now in a stable, production-ready state with enhanced features:

✅ **Configuration:** PostCSS and Tailwind CSS v4 are properly configured  
✅ **Styling:** All Tailwind classes are being applied correctly  
✅ **Layout:** Responsive, mobile-first design with proper constraints  
✅ **Core Features:** All Phase 1 features are implemented and working  
✅ **Enhanced Features:** Search history, filters, pagination, collections, export, analytics  
✅ **Design:** Matches the reference design with red accents and dark theme  
✅ **API Integration:** YouTube API abstraction layer with metadata fetching  
✅ **State Management:** Multi-select functionality with select all/deselect all  
✅ **Data Persistence:** All user data (collections, search history, favorites, transcription queue) persisted in PostgreSQL database (database-only, no localStorage fallback)  
✅ **Testing:** Test infrastructure in place with sample tests  
✅ **Footer:** Copyright footer component implemented  
✅ **Search UX:** Optional end date allows searching recent content by default  
✅ **State Management:** Refactored to React Context for better scalability  
✅ **Error Handling:** Comprehensive error handling in all utility functions  
✅ **Favorites System:** Save and manage favorite searches and channels  
✅ **Channel Filtering:** Clickable channels in stats, fuzzy matching suggestions  
✅ **Sort Functionality:** Client-side sorting with dedicated SortBar component  
✅ **Transcription Queue:** Implemented queue system with database persistence (Phase 5 - COMPLETE)
✅ **Transcript Viewing:** Complete UI/UX for viewing transcripts with search, highlighting, and export (Phase 7 - COMPLETE)
✅ **Comprehensive Testing:** Test suite for utility functions (AppContext tests removed after refactoring)
✅ **Database Foundation:** Complete schema with User, Account, Session, Collection, Video, VideosInCollections, SearchHistory, Favorite, and TranscriptionQueue models. All migrations applied successfully.
✅ **Authentication Foundation:** NextAuth.js fully integrated with Prisma adapter, Google and GitHub OAuth providers, and UI components in Header.
✅ **API Routes:** Complete REST API for Collections (Phase 2), Search History (Phase 3), Favorites (Phase 4), Transcription Queue (Phase 5), and Transcripts (Phase 7). All routes authenticated and user-scoped.
✅ **Database-Only:** All features use database-only operations. Clean cutover completed (v4.7.0). Authentication required for all persistent data operations.
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

**Security Fix (v4.6.1) - ✅ COMPLETE:**

**Issue:** localStorage is browser-specific, not user-specific. Users on shared browsers could see each other's localStorage data when signed out.

**Fix:**
- Clear all localStorage data on sign-out (favorites, search history, transcription queue)
- Don't display localStorage data when unauthenticated (return empty arrays)
- Only show database data when authenticated (user-scoped and secure)

**Files Modified:**
- `src/components/Header.jsx` - Clear localStorage on sign-out
- `src/utils/favorites.js` - Return empty array when unauthenticated
- `src/utils/searchHistory.js` - Return empty array when unauthenticated
- `src/utils/transcriptionQueue.js` - Return empty array when unauthenticated

**Documentation:**
- Created `docs/SECURITY.md` with comprehensive security documentation
- Updated `docs/TROUBLESHOOTING.md` with security section

**Clean Cutover - localStorage Removal (v4.7.0) - ✅ COMPLETE:**

**Migration Complete:** All localStorage code has been removed. The application now uses database-only operations.

**Changes:**
- ✅ Removed all localStorage write operations from `favorites.js`
- ✅ Removed all localStorage write operations from `searchHistory.js`
- ✅ Removed all localStorage write operations from `transcriptionQueue.js`
- ✅ Removed all localStorage write operations from `CollectionModal.jsx`
- ✅ Deleted `src/utils/collections.js` (no longer needed, replaced by `collectionsService.js`)
- ✅ All operations now require authentication
- ✅ Simplified codebase - single source of truth (database)

**Benefits:**
- Simplified codebase (removed ~500+ lines of localStorage code)
- Single source of truth (database)
- Better security (all data user-scoped)
- No localStorage fallback complexity
- Cleaner error handling

**Breaking Changes:**
- Unauthenticated users can no longer save favorites, search history, or queue items
- All persistent data operations require authentication
- Sign-in prompt shown for unauthenticated users attempting to save data

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
   - ✅ Updated `src/utils/transcriptionQueue.js` to database-only (all functions now async)
   - ✅ Updated `app/page.jsx` to handle async queue operations

3. **Features:**
   - ✅ Status transition validation (pending → processing → completed/failed, failed → pending for retry)
   - ✅ Batch operations with Prisma transactions for atomicity
   - ✅ Efficient API responses (returns summary instead of all items for batch operations)
   - ✅ Priority support (higher number = higher priority)
   - ✅ Duplicate detection (prevents adding same video twice)
   - ✅ Database-only operations (clean cutover completed in v4.7.0)
   - ✅ Video upsert (creates video record if not exists)

4. **Documentation:**
   - ✅ Created `TRANSCRIPTION_QUEUE_IMPLEMENTATION_SUMMARY.md`
   - ✅ Created `TESTING_PHASE5.md` comprehensive testing guide

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

## Tooling & MCP Integrations

- **Browser MCP:** Enabled and shows `Ready (Chrome detected)`. The automation harness launches its own Chromium instance, so it works regardless of which browser a developer uses locally (e.g., Firefox).
- **AWS Documentation MCP:** Installed with the official search/read tools (`search_documentation`, `read_documentation`) for quick access to authoritative AWS references inside Cursor.
- **Accessing MCP settings:** macOS menu bar → `Cursor` → `Settings…` → `Model Context Protocol`. From there you can confirm/toggle Browser MCP or add additional servers.
- **Onboarding reminder:** Keep this note updated so future contributors (and LLM assistants) know which MCP servers are already configured and ready to use.

## Phase 7: Display Transcripts UI/UX (v4.8.0) - ✅ COMPLETE

**Implementation Summary:**
- ✅ Created backend API routes for transcript retrieval (`GET /api/transcripts/[videoId]`, `GET /api/transcripts`)
- ✅ Built comprehensive UI components (TranscriptBadge, TranscriptViewer, TranscriptModal)
- ✅ Implemented transcript viewing with segments and full text toggle
- ✅ Added in-modal search with highlighting and match navigation
- ✅ Created TranscriptsPage (`/transcripts`) with grid/list views and client-side search
- ✅ Integrated transcript badges into video cards
- ✅ Added navigation link in Header component
- ✅ Comprehensive accessibility improvements (ARIA labels, focus management, keyboard navigation)
- ✅ Performance optimized (15-minute videos render smoothly without virtualization)

**Key Features:**
- Transcript viewing with segments display and full text toggle
- In-modal search with real-time highlighting and match navigation (Enter/Shift+Enter)
- Copy to clipboard and export as text file
- Grid and list view modes on transcripts page
- Client-side search on transcripts page (by title, channel, or content)
- Responsive design (mobile, tablet, desktop)
- Full accessibility support (WCAG compliant)

**Technical Details:**
- Created `transcriptService.js` API client
- Created `useTranscriptStatus.js` hook for checking transcript availability
- Fixed build error: Moved `TranscriptionServiceError` to `src/utils/errors.js`
- Performance: Verified smooth rendering for 15-minute videos (~200-500 segments)
- Future: Documented virtualization as optional enhancement for >30min videos

**Documentation:**
- ✅ Created `PHASE7_IMPLEMENTATION_PLAN.md` and `PHASE7_PLAN_REVIEW.md`
- ✅ Updated `CHANGELOG.md` with v4.8.0 release notes
- ✅ Updated `MIGRATION_PLAN.md` with Phase 7 status

## Automated Transcription Workflow (v4.9.0) - ✅ COMPLETE

**Implementation Summary:**
- ✅ Auto-trigger transcription worker after queuing videos
- ✅ Real-time progress panel with status indicators and time estimates
- ✅ Auto-open transcript modal when transcription completes
- ✅ User-facing API route for authenticated processing
- ✅ Polling hook for real-time queue status updates
- ✅ Graceful fallback if worker is not configured

**Key Features:**
- **Automatic Processing:** Worker triggers automatically after queuing (no manual intervention)
- **Real-Time Progress:** Fixed top-right panel showing queue status with:
  - Pending items (with time estimates)
  - Processing items (with remaining time)
  - Completed items (with "View Transcript" button)
  - Failed items (with error messages)
- **Time Estimates:** Based on video duration (~1 min processing per min of video)
- **Auto-Open Transcripts:** Modal opens automatically when transcription completes
- **Status Updates:** Polls queue every 5 seconds for real-time updates

**Technical Details:**
- Created `TranscriptionProgress.jsx` component for visual progress display
- Created `useTranscriptionQueue.js` hook for polling queue status
- Created `transcriptionWorkerService.js` client-side service
- Created `/api/transcription-queue/process` user-facing API route
- Updated `app/page.jsx` with auto-trigger, progress panel, and auto-open logic
- Made `transcriptionService.js` environment checks lazy to fix build errors

**User Experience:**
1. User selects videos and clicks "Queue for Transcription"
2. System automatically triggers worker to start processing
3. Progress panel appears showing real-time status
4. When transcription completes, transcript modal opens automatically
5. User can immediately view, search, copy, or export transcript

**Fallback Behavior:**
- If worker is not configured, videos remain in queue
- Progress panel still shows status
- No errors shown to user (graceful degradation)
- Cron job or manual trigger can process later

**Documentation:**
- ✅ Created `AUTOMATED_TRANSCRIPTION_UX.md`: Comprehensive workflow guide
- ✅ Created `TRANSCRIPTION_WORKFLOW.md`: Manual workflow guide (for reference)

## Phase 8: Performance & Optimization (v4.10.0+) - IN PROGRESS

**Status:** Day 1 & Day 2 Complete - Observability Foundation & React Query Infrastructure

### Day 1: Observability Foundation (v4.10.0) - ✅ COMPLETE

**Implementation Summary:**
- ✅ Sentry error tracking and performance monitoring integrated
- ✅ Client-side error capture with session replay (`instrumentation-client.ts`)
- ✅ Server-side error tracking (`instrumentation.js` + `sentry.server.config.js`)
- ✅ Edge runtime monitoring (`sentry.edge.config.js`)
- ✅ Global error boundary (`app/global-error.jsx`)
- ✅ API route monitoring wrapper (`src/lib/api-monitoring.js`) - ready for integration
- ✅ Prisma query monitoring via Client Extensions (`src/lib/prisma-monitoring.js`)
- ✅ Source map support configured
- ✅ Environment-based sampling rates (10% production, 100% development)

**Configuration Files:**
- `instrumentation.js` - Next.js instrumentation hook (loads server/edge configs)
- `instrumentation-client.ts` - Client-side Sentry initialization with replay
- `sentry.server.config.js` - Server-side Sentry initialization
- `sentry.edge.config.js` - Edge runtime Sentry initialization
- `app/global-error.jsx` - Global error boundary with Sentry integration
- `next.config.js` - Wrapped with `withSentryConfig` for build-time integration

**Technical Details:**
- Prisma v6 Client Extensions used instead of deprecated `$use` middleware
- ES module syntax (`import/export`) used throughout (project uses `"type": "module"`)
- Next.js 16 instrumentation hooks properly configured
- Router transition tracking (`onRouterTransitionStart`) enabled
- Request error handling (`onRequestError`) enabled

**Bugs Fixed During Setup:**
1. **ES Module Compatibility:** Converted `next.config.js` from CommonJS to ES modules
2. **Images Configuration:** Updated deprecated `images.domains` to `images.remotePatterns`
3. **Prisma v6 Compatibility:** Replaced deprecated `$use` middleware with Client Extensions
4. **Sentry Configuration:** Fixed instrumentation hooks and router tracking

### Day 2: React Query Infrastructure (v4.10.1+) - ✅ IN PROGRESS

**Implementation Summary:**
- ✅ React Query installed (`@tanstack/react-query@^5.90.10`)
- ✅ QueryClient configured (`src/lib/react-query.js`)
- ✅ QueryClientProvider integrated (`src/components/Providers.jsx`)
- ✅ Test infrastructure created (`tests/setup-react-query.jsx`)
- ✅ TDD pattern established for hook development

**Completed Migrations:**
- ✅ Search History hooks implemented (`src/hooks/useSearchHistoryQuery.js`)
- ✅ Search History component migrated (`src/components/SearchHistory.jsx`) - 7 tests
- ✅ Favorites hooks implemented (`src/hooks/useFavoritesQuery.js`)
- ✅ Favorites component migrated (`src/components/FavoritesSidebar.jsx`) - 8 tests
- ✅ Collections hooks implemented (`src/hooks/useCollectionsQuery.js`)
- ✅ Collections component migrated (`src/components/CollectionModal.jsx`) - 12 tests
- ✅ Transcription Queue hooks implemented (`src/hooks/useTranscriptionQueueQuery.js`)
- ✅ Transcription Queue hook migrated (`src/hooks/useTranscriptionQueue.js`) - 12 tests

**Phase 8 Day 3: Optimistic Updates - ✅ IN PROGRESS**

**Completed:**
- ✅ Favorites optimistic updates (add, delete, clear)
- ✅ Error rollback on mutation failures
- ✅ TDD test coverage for optimistic updates (4 tests)

**In Progress:**
- 🚧 Queue optimistic updates (next)
- 🚧 Collections optimistic updates (planned)

**Next Steps:**
- 📋 Performance optimization and monitoring integration

**TDD Approach:**
- Tests written before implementation (Red-Green-Refactor cycle)
- 7 comprehensive tests for `useSearchHistoryQuery` and `useSearchHistoryMutation`
- All tests passing (93/93 total tests)

**Component Migration:**
- `SearchHistory.jsx` migrated from manual state management to React Query
- Removed `useState` and `useEffect` for data fetching
- Added automatic caching, loading states, and error handling
- Query only runs when modal is open (performance optimization)

**Bug Fixed: Duplicate Search History Entries**

**Issue:** Single search appeared 3 times in search history due to race condition.

**Root Cause:**
- Multiple simultaneous API requests (React Strict Mode double renders or rapid clicks)
- All requests checked for duplicates before any completed
- All passed duplicate check and created entries

**Fix Applied:**
1. **Server-Side (Atomic Transaction):**
   - Wrapped duplicate check and create/update in `prisma.$transaction()`
   - Ensures only one request can create entry at a time
   - Prevents race conditions at database level
   - File: `app/api/search-history/route.js`

2. **Client-Side (Prevent Duplicate Calls):**
   - Added `!isLoadMore` check before saving history
   - Prevents saving history when loading more results
   - File: `src/hooks/useVideoSearch.js`

**Verification:**
- All 93 tests passing
- Transaction ensures atomic operations
- No more duplicate entries observed

**Files Modified:**
- `app/api/search-history/route.js` - Added transaction wrapper
- `src/hooks/useVideoSearch.js` - Added `!isLoadMore` check

**Next Steps:**
- Migrate remaining components to React Query (Favorites, Collections, Transcription Queue)
- Integrate API route monitoring (`withMonitoring` wrapper)
- Implement optimistic updates for mutations

### Known Issues & Resolutions

**Issue: Duplicate Search History Entries**
- **Status:** ✅ RESOLVED
- **Date:** 2025-01-XX
- **Description:** Single search appeared multiple times in history
- **Root Cause:** Race condition in duplicate detection
- **Resolution:** Atomic transaction + client-side prevention
- **Files:** `app/api/search-history/route.js`, `src/hooks/useVideoSearch.js`

**Issue: Prisma v6 Compatibility**
- **Status:** ✅ RESOLVED
- **Date:** 2025-01-XX
- **Description:** `$use` middleware deprecated in Prisma v6
- **Root Cause:** Prisma v6 uses Client Extensions instead of middleware
- **Resolution:** Migrated to `prismaMonitoringExtension` using `$extends()`
- **Files:** `src/lib/prisma-monitoring.js`, `src/lib/prisma.js`

**Issue: ES Module Compatibility**
- **Status:** ✅ RESOLVED
- **Date:** 2025-01-XX
- **Description:** `next.config.js` using CommonJS in ES module project
- **Root Cause:** Project uses `"type": "module"` but config used `require()`
- **Resolution:** Converted to ES module syntax (`import/export`)
- **Files:** `next.config.js`

**Issue: Sentry Configuration Warnings**
- **Status:** ✅ RESOLVED
- **Date:** 2025-01-XX
- **Description:** Multiple Sentry configuration warnings
- **Root Cause:** Missing instrumentation hooks and deprecated config files
- **Resolution:** Created proper instrumentation files, removed deprecated `sentry.client.config.js`
- **Files:** `instrumentation.js`, `instrumentation-client.ts`, `app/global-error.jsx`

## Open Topics / Future Work
1. Phase 6 implementation (Transcription Worker MVP) - ✅ COMPLETE
2. Phase 7 planning (Display transcripts UI/UX) - ✅ COMPLETE
3. Automated Transcription Workflow - ✅ COMPLETE
4. Phase 8 Day 1: Observability Foundation - ✅ COMPLETE
5. Phase 8 Day 2: React Query Infrastructure - ✅ COMPLETE
6. Phase 8 Day 2+: Migrate remaining components to React Query (Favorites, Collections, Transcription Queue)
7. Phase 8 Day 3+: Implement optimistic updates for mutations
8. Phase 8 Day 4+: Integrate API route monitoring (`withMonitoring` wrapper)
9. Transcription feature manual testing checklist
10. Performance optimization based on observability metrics
