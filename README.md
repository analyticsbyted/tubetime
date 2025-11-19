# TubeTime

TubeTime is a historical YouTube search engine that allows users to curate a list of videos for a future video transcription pipeline.

## Phase 1: Historical Search Engine

This initial phase focuses on providing a user interface for searching YouTube videos within a specific date range and selecting videos from the search results.

### Features

-   **Search Interface:** Search for YouTube videos by query, start date, and end date (RFC 3339 format)
-   **Video Grid:** Display search results in a responsive grid with hover effects
-   **Multi-Select:** Select multiple videos from search results using checkboxes
-   **Action Bar:** Floating action bar appears when videos are selected, showing count and "Queue for Transcription" button
-   **API Key Management:** Settings modal for entering YouTube API key (with localStorage persistence)
-   **Loading States:** Visual feedback during search operations
-   **Empty States:** Helpful messages when no results are found or before first search

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
│   │   ├── ActionBar.jsx      # Floating action bar for selected videos
│   │   ├── SearchBar.jsx      # Search form with query and date inputs
│   │   ├── SettingsModal.jsx  # API key configuration modal
│   │   ├── VideoCard.jsx      # Individual video card component
│   │   └── VideoGrid.jsx      # Grid layout for video results
│   ├── hooks/
│   │   └── useSelection.js    # Custom hook for multi-select functionality
│   ├── services/
│   │   └── youtubeService.js  # YouTube API abstraction layer
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

### Tailwind CSS v4 Setup

This project uses **Tailwind CSS v4**, which requires:

1. **PostCSS Configuration:** Uses `@tailwindcss/postcss` plugin
2. **CSS Import:** Uses `@import "tailwindcss"` syntax in `index.css`
3. **Content Paths:** Configured in `tailwind.config.js` to scan all JS/JSX/TS/TSX files

### Key Architectural Decisions

- **State Management:** Custom `useSelection` hook for multi-select (no Redux/Zustand needed)
- **API Abstraction:** YouTube API logic isolated in `youtubeService.js` for easy backend integration
- **Component Structure:** Separation of concerns with dedicated components for each UI element
- **Responsive Design:** Mobile-first approach with Tailwind responsive utilities

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