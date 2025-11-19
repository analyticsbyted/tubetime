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
-   **API Key Management:** Settings modal for entering YouTube API key (with localStorage persistence)
-   **Loading States:** Visual feedback during search operations
-   **Empty States:** Helpful messages when no results are found or before first search
-   **Favorites System:** Save favorite searches and channels for quick access
    - Sidebar interface for managing favorites
    - Add channels to favorites directly from search statistics
    - Re-run favorite searches with one click
-   **Channel Suggestions:** Fuzzy matching suggestions when typing channel names
-   **Sort Options:** Client-side sorting by date, relevance, rating, title, views, or channel

### Tech Stack

-   **Frontend:** React 19 (with Vite 7)
-   **Styling:** Tailwind CSS v4.1.17
-   **Icons:** Lucide React
-   **Notifications:** Sonner (toast notifications)
-   **Build Tool:** Vite with PostCSS

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

**Option 1: Environment Variable (Recommended)**
1.  Create a `.env` file in the root of the project.
2.  Add your API key to the `.env` file:
    ```
    VITE_YOUTUBE_API_KEY=your_api_key_here
    ```

**Option 2: Settings Modal**
- Run the application and click the "Set API Key" button in the header
- Enter your API key in the settings modal
- The key will be stored in localStorage and persist across sessions

**Getting a YouTube API Key:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the YouTube Data API v3
4. Create credentials (API Key)
5. Copy the key and add it to your `.env` file or settings modal

### Running the Application

1.  Start the development server:
    ```bash
    npm run dev
    ```
2.  Open your browser and navigate to `http://localhost:5174` (or the port specified in the terminal).

## Project Structure

```
tubetime/
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
│   │   ├── SettingsModal.jsx     # API key configuration modal
│   │   ├── SortBar.jsx           # Sort options for search results
│   │   ├── VideoCard.jsx         # Individual video card with metadata
│   │   └── VideoGrid.jsx         # Grid layout with selection controls
│   ├── context/
│   │   └── AppContext.jsx        # React Context for global state management
│   ├── hooks/
│   │   └── useSelection.js       # Custom hook for multi-select functionality
│   ├── services/
│   │   └── youtubeService.js     # YouTube API abstraction layer with metadata
│   ├── utils/
│   │   ├── channelMatcher.js    # Fuzzy matching utilities for channel names
│   │   ├── collections.js        # Collection/playlist management utilities
│   │   ├── datePresets.js        # Date range preset utilities
│   │   ├── export.js             # Export functionality (JSON/CSV)
│   │   ├── favorites.js          # Favorites management utilities
│   │   └── searchHistory.js      # Search history localStorage utilities
│   └── tests/
│       └── setup.js              # Test configuration
│   ├── App.jsx          # Main application component
│   ├── index.css        # Global styles and Tailwind CSS import
│   └── main.jsx         # Application entry point
├── .env                 # Environment variables (not in git)
├── .gitignore          # Git ignore rules
├── index.html          # HTML template
├── package.json        # Dependencies and scripts
├── postcss.config.js   # PostCSS configuration (Tailwind CSS v4)
├── tailwind.config.js  # Tailwind CSS configuration
└── vite.config.js      # Vite configuration
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

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run test` - Run tests with Vitest
- `npm run test:ui` - Run tests with UI interface

### Tailwind CSS v4 Setup

This project uses **Tailwind CSS v4**, which requires:

1. **PostCSS Configuration:** Uses `@tailwindcss/postcss` plugin
2. **CSS Import:** Uses `@import "tailwindcss"` syntax in `index.css`
3. **Content Paths:** Configured in `tailwind.config.js` to scan all JS/JSX/TS/TSX files

### Key Architectural Decisions

- **State Management:** React Context (`AppContext`) for global state, custom `useSelection` hook for multi-select
- **API Abstraction:** YouTube API logic isolated in `youtubeService.js` for easy backend integration
- **Component Structure:** Separation of concerns with dedicated components for each UI element
- **Responsive Design:** Mobile-first approach with Tailwind responsive utilities
- **Data Persistence:** localStorage for search history, collections, favorites, API key, and user preferences
- **Utility Modules:** Separate utility files for date presets, export, collections, search history, favorites, and channel matching
- **Client-Side Filtering:** Channel name filtering and sorting performed client-side for flexibility
- **Fuzzy Matching:** Levenshtein distance algorithm for channel name suggestions
- **Testing:** Vitest for unit testing hooks and utilities

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

- **403 Forbidden:** API key is invalid or quota exceeded
- **400 Bad Request:** Check date format (must be RFC 3339)
- **Network Error:** Check internet connection and API key validity

### Build Issues

If the build fails:

1. Check Node.js version (requires v18+)
2. Clear `node_modules` and reinstall dependencies
3. Verify all environment variables are set correctly
4. Check browser console for runtime errors