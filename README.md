# TubeTime

TubeTime is a historical YouTube search engine that allows users to curate a list of videos for a future video transcription pipeline.

## Phase 1: Historical Search Engine

This initial phase focuses on providing a user interface for searching YouTube videos within a specific date range and selecting videos from the search results.

### Features

#### Search & Discovery
-   **Advanced Search Interface:** Search for YouTube videos by query, start date, and optional end date (RFC 3339 format)
-   **Search History:** Save and quickly re-run recent searches with timestamps
-   **Date Range Presets:** Quick filters for "Last 24 Hours", "Last 7 Days", "Last 30 Days", "This Month", "Last Year" (defaults to Last 7 Days)
-   **Advanced Filters:**
  - Channel name filtering with fuzzy matching and suggestions
  - Duration filter (short/medium/long)
  - Sort by relevance, date, rating, title, views, or channel (client-side)
  - Language filter
  - Results per page selector (10, 20, 50, 100)
-   **Pagination:** Load more results with "Load More" button (supports infinite scroll)

#### Video Management
-   **Multi-Select:** Select multiple videos from search results using checkboxes
-   **Selection Controls:** Select All / Deselect All buttons with selection counter in header
-   **Collections/Playlists:** Save selected videos as named collections with localStorage persistence
-   **Export Functionality:**
  - Export to JSON (full video data)
  - Export to CSV (formatted for spreadsheets)
  - Export video IDs only

#### Analytics & Insights
-   **Search Statistics Dashboard:** 
  - Total results count
  - Unique channels count
  - Average video duration
  - Date range visualization
  - Top channels breakdown
-   **Video Metadata Display:**
  - View count, like count, comment count
  - Duration badges
  - Category tags

#### User Experience
-   **Action Bar:** Floating action bar appears when videos are selected
-   **Loading States:** Visual feedback during search operations
-   **Empty States:** Helpful messages when no results are found or before first search
-   **Favorites System:** Save favorite searches and channels for quick access
    - Sidebar interface for managing favorites
    - Add channels to favorites directly from search statistics
    - Re-run favorite searches with one click
-   **Channel Suggestions:** Fuzzy matching suggestions when typing channel names
-   **Sort Options:** Client-side sorting by date, relevance, rating, title, views, or channel
-   **Transcription Queue:** Queue selected videos for transcription
    - Persistent queue stored in localStorage
    - Duplicate prevention
    - Ready for backend integration in Phase 2

### Tech Stack

-   **Framework:** Next.js 16 (App Router)
-   **Frontend:** React 19
-   **Styling:** Tailwind CSS v4.1.17
-   **Icons:** Lucide React
-   **Notifications:** Sonner (toast notifications)
-   **Build Tool:** Next.js with PostCSS

## Getting Started

### Prerequisites

-   Node.js (v18 or later)
-   npm

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    ```
2.  Navigate to the project directory:
    ```bash
    cd tubetime
    ```
3.  Install the dependencies:
    ```bash
    npm install
    ```

### Configuration

To use the YouTube search functionality, you need a YouTube Data API v3 key.

**Environment Variable (Required)**
1.  Create a `.env.local` file in the root of the project (or use `.env`).
2.  Add your API key to the `.env.local` file:
    ```
    YOUTUBE_API_KEY=your_api_key_here
    ```

**Note:** The API key is stored server-side only and never exposed to the client for security.

**Getting a YouTube API Key:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the YouTube Data API v3
4. Create credentials (API Key)
5. Copy the key and add it to your `.env.local` file

### Running the Application

1.  Start the development server:
    ```bash
    npm run dev
    ```
2.  Open your browser and navigate to `http://localhost:3000` (Next.js default port).

## Project Structure

```
tubetime/
├── app/                 # Next.js App Router directory
│   ├── api/            # API routes
│   │   └── youtube/
│   │       └── search/
│   │           └── route.js  # Server-side YouTube search endpoint
│   ├── layout.jsx      # Root layout component
│   └── page.jsx        # Main page component
├── public/              # Static assets
├── src/
│   ├── components/      # React components
│   │   ├── ActionBar.jsx         # Floating action bar with export and collection save
│   │   ├── ChannelSuggestions.jsx # Channel name suggestions with fuzzy matching
│   │   ├── CollectionModal.jsx   # Modal for saving video collections
│   │   ├── EnhancedSearchBar.jsx # Advanced search with filters and presets
│   │   ├── FavoritesSidebar.jsx  # Sidebar for managing favorite searches and channels
│   │   ├── Footer.jsx            # Footer component with copyright notice
│   │   ├── SearchHistory.jsx     # Search history modal component
│   │   ├── SearchStats.jsx       # Search statistics dashboard with clickable channels
│   │   ├── SortBar.jsx           # Sort options for search results
│   │   ├── VideoCard.jsx         # Individual video card with metadata
│   │   └── VideoGrid.jsx         # Grid layout with selection controls
│   ├── context/
│   │   └── AppContext.jsx        # React Context for global state management
│   ├── hooks/
│   │   └── useSelection.js       # Custom hook for multi-select functionality
│   ├── services/
│   │   └── youtubeService.js     # Client-side YouTube API service (calls Next.js API routes)
│   ├── utils/
│   │   ├── channelMatcher.js    # Fuzzy matching utilities for channel names
│   │   ├── collections.js        # Collection/playlist management utilities
│   │   ├── datePresets.js        # Date range preset utilities
│   │   ├── export.js             # Export functionality (JSON/CSV)
│   │   ├── favorites.js          # Favorites management utilities
│   │   ├── searchHistory.js      # Search history localStorage utilities
│   │   └── transcriptionQueue.js # Transcription queue management utilities
│   └── tests/
│       └── setup.js              # Test configuration
│   ├── App.jsx          # Main application component
│   └── index.css        # Global styles and Tailwind CSS import
├── .env.local           # Environment variables (not in git) - use .env.local or .env
├── .gitignore          # Git ignore rules
├── next.config.js      # Next.js configuration
├── package.json        # Dependencies and scripts
├── postcss.config.js   # PostCSS configuration (Tailwind CSS v4)
└── tailwind.config.js  # Tailwind CSS configuration
```

## Design System

The application uses a **data-heavy aesthetic** inspired by Bloomberg terminals and Linear.app:

- **Color Scheme:** Dark mode with zinc-950 background and red accent colors
- **Typography:** System fonts for UI, monospace fonts for dates and IDs
- **Layout:** Constrained to `max-w-7xl` (1280px) for optimal readability
- **Spacing:** High information density with compact, efficient layouts
- **Interactions:** Smooth transitions, hover effects, and visual feedback

## Development

### Available Scripts

- `npm run dev` - Start Next.js development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint (Next.js)
- `npm run test` - Run tests with Vitest
- `npm run test:ui` - Run tests with UI interface

### Testing

The project includes comprehensive test coverage:

- **AppContext Tests**: Core application logic (search, sorting, selection, queue management)
- **Utility Tests**: Date presets, search history, transcription queue
- **API Route Tests**: Backend API endpoint tests (validation, error handling, success cases)
- **Hook Tests**: useSelection hook functionality

Run tests with:
```bash
npm run test        # Run tests once
npm run test:ui     # Run tests with interactive UI
```

### Tailwind CSS v4 Setup

This project uses **Tailwind CSS v4** with Next.js, which requires:

1. **PostCSS Configuration:** Uses `@tailwindcss/postcss` plugin (works with Next.js)
2. **CSS Import:** Uses `@import "tailwindcss"` syntax in `src/index.css`
3. **Content Paths:** Configured in `tailwind.config.js` to scan all JS/JSX/TS/TSX files in `app/` and `src/` directories

### Key Architectural Decisions

- **Framework:** Next.js App Router for server-side rendering and API routes
- **State Management:** React Context (`AppContext`) for global state, custom `useSelection` hook for multi-select
- **API Security:** YouTube API key stored server-side, never exposed to client
- **API Abstraction:** Client-side `youtubeService.js` calls Next.js API routes (`/api/youtube/search`)
- **Component Structure:** Separation of concerns with dedicated components for each UI element
- **Responsive Design:** Mobile-first approach with Tailwind responsive utilities
- **Data Persistence:** localStorage for search history, collections, favorites, and user preferences
- **Utility Modules:** Separate utility files for date presets, export, collections, search history, favorites, and channel matching
- **Client-Side Filtering:** Channel name filtering and sorting performed client-side for flexibility
- **Fuzzy Matching:** Levenshtein distance algorithm for channel name suggestions
- **Testing:** Vitest for unit testing hooks, utilities, and API routes
- **Server Components:** Root layout is a Server Component for optimal performance
- **UI Streaming:** React Suspense boundaries for progressive rendering

## Troubleshooting

### Tailwind CSS Not Applying Styles

If Tailwind CSS classes aren't being applied:

1. **Verify Tailwind CSS v4 Setup:**
   - Check that `src/index.css` uses `@import "tailwindcss";` (not the old `@tailwind` directives)
   - Ensure `postcss.config.js` uses `@tailwindcss/postcss` plugin
   - Verify `tailwind.config.js` has correct content paths

2. **Restart Dev Server:**
   ```bash
   # Stop the server (Ctrl+C) and restart
   npm run dev
   ```

3. **Clear Cache:**
   ```bash
   # Delete node_modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

### YouTube API Errors

- **500 Server Error:** Check that `YOUTUBE_API_KEY` is set in `.env.local`
- **403 Forbidden:** API key is invalid or quota exceeded
- **400 Bad Request:** Check date format (must be RFC 3339)
- **Network Error:** Check internet connection and API key validity

### Build Issues

If the build fails:

1. Check Node.js version (requires v18+)
2. Clear `node_modules` and reinstall dependencies
3. Verify all environment variables are set correctly
4. Check browser console for runtime errors

### Native Module Compatibility

This project uses **webpack** instead of Turbopack (Next.js 16 default) due to native module compatibility requirements:
- `lightningcss` (Tailwind CSS v4 dependency) requires native bindings
- Webpack handles dynamic requires for native modules better than Turbopack
- PostCSS config uses `.cjs` format for webpack compatibility
- All build scripts include `--webpack` flag by default