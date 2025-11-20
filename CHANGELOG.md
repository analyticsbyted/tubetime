# Changelog

All notable changes to TubeTime will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
  - Prisma client singleton created at `lib/prisma.js` for database access

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
- **Prisma Client**: Generated to `src/generated/prisma` (custom output path)
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

