# Project Context: TubeTime

This document provides a detailed history of the TubeTime project, including the initial vision, architectural decisions, development challenges, and their resolutions. It is intended to provide a smooth handover to any future developer or LLM model.

## Initial Vision

The project began with a clear vision from the user: a React application called 'TubeTime' to serve as the frontend for a future video transcription pipeline.

**Phase 1 (Current):** A historical YouTube search engine.
-   **Functionality:** Allows users to search for YouTube videos by query and date range, then curate a list of videos from the results.
-   **Tech Stack:** React (Vite), Tailwind CSS, Lucide React.
-   **Key Features:**
    -   Search bar with query, start date, and end date.
    -   A responsive grid of video cards, each with a selection checkbox.
    -   A floating "Action Bar" that appears when videos are selected.
    -   A "Queue for Transcription" button that simulates the future action by logging video IDs to the console and showing a toast notification.
    -   Robust API key management with support for `.env` files and a fallback settings modal.
-   **Aesthetic:** A "data-heavy" dark mode theme, similar to a Bloomberg terminal or Linear.app.

## Architectural Decisions

-   **State Management:** A custom `useSelection` hook was implemented to manage the set of selected video IDs. This provides a simple and contained way to handle selection state without a heavier state management library.
-   **API Abstraction:** The YouTube API logic was isolated into a `youtubeService.js` file. This separation of concerns makes the code cleaner and will make it easier to integrate with a backend (like Supabase) in the future.
-   **Styling:** Tailwind CSS was chosen for its utility-first approach, which is well-suited for rapid UI development and creating custom designs.
-   **Mobile-First Design:** A key requirement was that the application should be designed with a mobile-first orientation. This was implemented by using responsive prefixes (`sm:`, `md:`, etc.) in the Tailwind CSS classes.

## Development History & Challenges

The development process was not without its challenges. The most significant and persistent issue was related to the PostCSS and Tailwind CSS configuration within the Vite environment.

### The PostCSS Configuration Saga

1.  **Initial Setup:** The project was scaffolded with Vite and the necessary dependencies (`tailwindcss`, `postcss`, `autoprefixer`) were installed.
2.  **First Error:** The initial attempt to run the application resulted in an error: `[plugin:vite:css] [postcss] It looks like you're trying to use tailwindcss directly as a PostCSS plugin. The PostCSS plugin has moved to a separate package...`. This indicated an incompatibility between the version of Tailwind CSS (v4) and the PostCSS configuration.
3.  **First Attempted Fix:** The `postcss.config.js` was updated to use the new `@tailwindcss/postcss` package, and the Vite config was updated to explicitly point to the PostCSS config file. This led to a new error: `postcssConfig?.plugins.slice is not a function`. This error suggested that Vite was expecting the `plugins` property in the PostCSS config to be an array, but it was an object.
4.  **Second Attempted Fix:** The `postcss.config.js` was changed to export an array of plugins, in the more traditional PostCSS format. This, however, led back to the original error, as `tailwindcss` was being used directly as a plugin.
5.  **Resolution:** The final and correct solution was to use the array format for the `plugins` in `postcss.config.js`, but to import and use the `@tailwindcss/postcss` package as the plugin, not `tailwindcss`.

    **Correct `postcss.config.js`:**
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
    The `vite.config.js` was also simplified to let Vite auto-detect the `postcss.config.js` file.

### Styling and Layout Issues

-   **Dark Mode:** The initial dark mode styles were not being applied correctly, resulting in a white background. This was resolved by applying the dark background color to the `html`, `body`, and `#root` elements in `src/index.css`.
-   **Form Elements:** The date input fields and the search button had white backgrounds due to default browser styling. This was fixed by adding `appearance-none` and explicit color classes to these elements in the `SearchBar.jsx` component.
-   **Layout Width:** The main content area was spanning the full width of the viewport. This was addressed by adding `max-w-7xl` and `mx-auto` to the `main` element in `App.jsx`.

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

### State Management Refactoring (v1.2.0)

As the application grew, the centralized state in `App.jsx` became unwieldy and led to prop-drilling issues. A comprehensive refactoring was performed:

**React Context Implementation:**
- Created `src/context/AppContext.jsx` to centralize all application state
- Moved search state, selection state, API key management, and modal states to context
- Implemented `useAppContext()` hook for easy access throughout component tree
- Wrapped application with `AppProvider` in `main.jsx`

**Benefits:**
- Eliminated prop-drilling - components can access state directly via hook
- Better separation of concerns - state logic separated from UI components
- Improved maintainability - easier to add new features without modifying multiple components
- Better scalability - ready for future features like user authentication, collections management, etc.

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

### Known Issues

None currently. The application is ready for Phase 2 development (backend integration with Supabase + Whisper).

### Future Enhancements (Phase 2)

- Backend integration with Supabase for video storage
- Whisper API integration for transcription
- Database schema for queued videos
- User authentication (if needed)
- Transcription status tracking
- Download/export functionality for transcripts
