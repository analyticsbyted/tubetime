# Project Context: TubeTime

This document provides a detailed history of the TubeTime project, including the initial vision, architectural decisions, development challenges, and their resolutions. It is intended to provide a smooth handover to any future developer or LLM model.

## Initial Vision

The project began with a clear vision from the user: a React application called 'TubeTime' to serve as the frontend for a future video transcription pipeline.

**Phase 1 (Current):** A historical YouTube search engine.
-   **Functionality:** Allows users to search for YouTube videos by query and date range, then curate a list of videos from the results.
-   **Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS, Lucide React.
-   **Key Features:**
    -   Search bar with query, start date, and end date.
    -   A responsive grid of video cards, each with a selection checkbox.
    -   A floating "Action Bar" that appears when videos are selected.
    -   A "Queue for Transcription" button that simulates the future action by logging video IDs to the console and showing a toast notification.
    -   Robust API key management with support for `.env` files and a fallback settings modal.
-   **Aesthetic:** A "data-heavy" dark mode theme, similar to a Bloomberg terminal or Linear.app.

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

The application is now in a stable, production-ready state with enhanced features:

✅ **Configuration:** PostCSS and Tailwind CSS v4 are properly configured  
✅ **Styling:** All Tailwind classes are being applied correctly  
✅ **Layout:** Responsive, mobile-first design with proper constraints  
✅ **Core Features:** All Phase 1 features are implemented and working  
✅ **Enhanced Features:** Search history, filters, pagination, collections, export, analytics  
✅ **Design:** Matches the reference design with red accents and dark theme  
✅ **API Integration:** YouTube API abstraction layer with metadata fetching  
✅ **State Management:** Multi-select functionality with select all/deselect all  
✅ **Data Persistence:** localStorage for history, collections, and API key  
✅ **Testing:** Test infrastructure in place with sample tests  
✅ **Footer:** Copyright footer component implemented  
✅ **Search UX:** Optional end date allows searching recent content by default  
✅ **State Management:** Refactored to React Context for better scalability  
✅ **Error Handling:** Comprehensive error handling in all utility functions  
✅ **Favorites System:** Save and manage favorite searches and channels  
✅ **Channel Filtering:** Clickable channels in stats, fuzzy matching suggestions  
✅ **Sort Functionality:** Client-side sorting with dedicated SortBar component  
✅ **Transcription Queue:** Implemented queue system with localStorage persistence  
✅ **Comprehensive Testing:** Test suite for utility functions (AppContext tests removed after refactoring)

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

### Future Enhancements (Phase 2)

- Backend integration with Supabase for video storage
- Whisper API integration for transcription
- Database schema for queued videos
- User authentication (if needed)
- Transcription status tracking
- Download/export functionality for transcripts
