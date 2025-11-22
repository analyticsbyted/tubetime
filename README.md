# TubeTime

TubeTime is a historical YouTube search engine that allows users to search, curate, and analyze videos. It features an advanced search interface, data analysis, and a persistent backend for storing user data, collections, and future video transcripts.

## Features

#### Search & Discovery
-   **Advanced Search Interface:** Search by query, date range, channel, duration, and language.
-   **URL-Based State:** All search parameters are stored in the URL, making searches shareable and bookmarkable.
-   **Date Range Presets:** Quick filters for "Last 24 Hours", "Last 7 Days", etc.

#### Video Management & Analysis
-   **Multi-Select:** Select multiple videos for batch operations.
-   **Collections:** Save selected videos into named collections, persisted in the database.
-   **Export:** Export video data to JSON or CSV.
-   **Search Statistics:** Dashboard with total results, channel distribution, and other analytics.
-   **Transcription Queue:** Queue videos for transcription with status tracking (pending, processing, completed, failed).
-   **Transcript Viewing:** View video transcripts with search, highlighting, copy, and export functionality.

#### User & Data Persistence
-   **Authentication:** User accounts and session management powered by NextAuth.js.
-   **Database Backend:** User data, collections, search history, favorites, and transcription queue are stored in a PostgreSQL database (Neon) via Prisma.
-   **Migration Status:** All localStorage features migrated to database. Clean cutover completed (v4.7.0) - database-only operations. Phases 2-7 complete. See [MIGRATION_PLAN.md](./docs/MIGRATION_PLAN.md) for details.

## Tech Stack

-   **Framework:** Next.js (App Router)
-   **Language:** JavaScript (React)
-   **Database:** PostgreSQL (via [Neon](https://neon.tech/))
-   **ORM:** [Prisma](https://www.prisma.io/)
-   **Authentication:** [NextAuth.js](https://next-auth.js.org/)
-   **Styling:** Tailwind CSS
-   **Icons:** Lucide React

## Getting Started

## Documentation

All project documentation now lives under `docs/`. Key references:

- [CHANGELOG](./docs/CHANGELOG.md)
- [CONTEXT](./docs/CONTEXT.md)
- [MIGRATION_PLAN](./docs/MIGRATION_PLAN.md)
- [SECURITY](./docs/SECURITY.md) - Security considerations and best practices
- [TROUBLESHOOTING](./docs/TROUBLESHOOTING.md) - Common issues and solutions
- [Implementation Summaries & Testing Guides](./docs/)

Use these files for architecture history, migration steps, testing procedures, and security guidelines.

### Prerequisites

-   Node.js (v18 or later)
-   npm or yarn/pnpm

### 1. Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd tubetime
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```

### 2. Environment Setup

The project requires environment variables for database access, authentication, and the YouTube API.

1.  **Create environment files:**
    
    **Important:** Prisma CLI reads from `.env` (not `.env.local`), while Next.js prioritizes `.env.local` at runtime. For best compatibility:
    
    - Create `.env` for Prisma migrations and CLI tools
    - Create `.env.local` for Next.js runtime (recommended for local development)
    
    You can use the same values in both files, or keep Prisma-specific variables in `.env`:
    
    ```bash
    # Option 1: Use .env for everything (simpler)
    touch .env
    
    # Option 2: Use .env.local for Next.js, .env for Prisma (more secure)
    touch .env.local
    touch .env  # Copy DATABASE_URL here for Prisma CLI
    ```

2.  **Fill in your environment file(s):**
    *   `DATABASE_URL`: Get this from your Neon project dashboard. It's the PostgreSQL connection string.
    *   `YOUTUBE_API_KEY`: Your Google Cloud YouTube Data API v3 key.
    *   `NEXTAUTH_SECRET`: A secret key for signing tokens. Generate one by running `openssl rand -base64 32` in your terminal.
    *   `NEXTAUTH_URL`: The canonical URL of your application. For local development, this is `http://localhost:3000`.
    *   `GOOGLE_CLIENT_ID`: Your Google OAuth client ID (from Google Cloud Console).
    *   `GOOGLE_CLIENT_SECRET`: Your Google OAuth client secret.
    *   `GITHUB_ID`: Your GitHub OAuth app client ID (from GitHub Developer Settings).
    *   `GITHUB_SECRET`: Your GitHub OAuth app client secret.

    Your `.env` or `.env.local` file should look like this:
    ```env
    # Database
    DATABASE_URL="postgresql://user:REDACTED@host/tubetime?sslmode=require"

    # YouTube API
    YOUTUBE_API_KEY="your_youtube_api_key"

    # NextAuth.js
    NEXTAUTH_SECRET="your_generated_secret"
    NEXTAUTH_URL="http://localhost:3000"

    # OAuth Providers
    GOOGLE_CLIENT_ID="your_google_client_id"
    GOOGLE_CLIENT_SECRET="your_google_client_secret"
    GITHUB_ID="your_github_client_id"
    GITHUB_SECRET="your_github_client_secret"
    ```

    **Note:** For OAuth setup:
    - **Google**: Create credentials at [Google Cloud Console](https://console.cloud.google.com/apis/credentials). Add `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI.
    - **GitHub**: Create an OAuth app at [GitHub Developer Settings](https://github.com/settings/developers). Set the authorization callback URL to `http://localhost:3000/api/auth/callback/github`.

### 3. Database Migration

Once your `DATABASE_URL` is set, you need to apply the database schema to your Neon database.

-   Run the Prisma migrate command:
    ```bash
    npx prisma migrate dev
    ```
    This will create the necessary tables (`User`, `Collection`, etc.) in your database.

### 4. Running the Application

1.  **Start the development server:**
    ```bash
    npm run dev
    ```
2.  Open your browser and navigate to `http://localhost:3000`.

## Prisma Commands

Prisma is used to manage your database schema and client.

-   `npx prisma migrate dev`: Apply schema changes to the database during development.
-   `npx prisma generate`: Manually re-generate the Prisma Client (usually runs automatically).
-   `npx prisma studio`: Open a web-based GUI to view and edit your database data.

## Design System

TubeTime follows a "Data Heavy" dark mode aesthetic. For detailed design guidelines, component patterns, and UI/UX changes, see [UIUX.md](./docs/UIUX.md).

**Key Design Principles:**
- No pure white or pure black colors (uses off-white `zinc-100` and off-black `zinc-950`)
- Red accents for primary actions
- High information density
- Monospace fonts for dates and IDs

## Troubleshooting

### Authentication Issues

**Problem: Sign-in button does nothing / Redirect loop**

- **Cause**: NextAuth.js configuration issue or missing environment variables
- **Solution**: 
  - Verify all OAuth credentials are set in `.env.local`
  - Check that `NEXTAUTH_SECRET` and `NEXTAUTH_URL` are configured
  - Ensure OAuth redirect URIs match exactly in provider settings
  - Clear `.next` cache: `rm -rf .next` and restart server

**Problem: GitHub sign-in returns 404**

- **Cause**: Leading space in `GITHUB_ID` environment variable
- **Solution**: Remove leading/trailing spaces from `GITHUB_ID` in `.env.local` (code automatically trims, but best practice is to fix the source)

**Problem: Google sign-in shows server error**

- **Cause**: Incorrect OAuth credentials or redirect URI mismatch
- **Solution**: 
  - Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
  - Ensure redirect URI `http://localhost:3000/api/auth/callback/google` is added in Google Cloud Console

### API Key Issues

**Problem: "YouTube API key is not configured"**

- **Cause**: `YOUTUBE_API_KEY` missing from `.env.local`
- **Solution**: Add `YOUTUBE_API_KEY="your_key_here"` to `.env.local` and restart the server

**Problem: API key appears in browser / URLs**

- **Cause**: This should never happen - keys are server-side only
- **Verification**: 
  - Check browser DevTools → Network tab - keys should NOT appear in requests
  - Check browser URL - keys should NOT be in query parameters
  - Long URLs with `callbackUrl` are safe (they contain no keys)

### Database Issues

**Problem: Prisma can't find `DATABASE_URL`**

- **Cause**: Prisma CLI reads from `.env` (not `.env.local`)
- **Solution**: Ensure `DATABASE_URL` exists in `.env` file (can be same value as `.env.local`)

**Problem: Database connection fails**

- **Cause**: Missing `?sslmode=require` in connection string or incorrect credentials
- **Solution**: Verify `DATABASE_URL` includes `?sslmode=require` at the end (required for Neon)

### Build Issues

**Problem: `Module not found: Can't resolve '@/lib/prisma'`**

- **Cause**: Missing `jsconfig.json` or incorrect path alias configuration
- **Solution**: Ensure `jsconfig.json` exists in project root with `@/*` pointing to root directory

**Problem: PostCSS configuration errors**

- **Cause**: PostCSS plugins must be specified as strings in Next.js webpack mode
- **Solution**: Ensure `postcss.config.cjs` uses object syntax with string plugin names

### General Issues

**Problem: Long URLs with nested `callbackUrl` parameters**

- **Cause**: This is normal NextAuth.js behavior (redirect tracking)
- **Solution**: No action needed - these URLs are safe and contain no sensitive data

**Problem: CSS warnings in browser console**

- **Cause**: Tailwind CSS v4 generates some browser-specific CSS that triggers warnings
- **Solution**: These warnings are harmless and can be ignored

For more detailed troubleshooting, see [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md).

## Project Structure

The project follows Next.js App Router conventions.

```
tubetime/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/  # NextAuth.js dynamic route
│   │   ├── collections/         # API routes for Collections
│   │   ├── search-history/      # API routes for Search History
│   │   ├── favorites/           # API routes for Favorites
│   │   ├── transcription-queue/  # API routes for Transcription Queue
│   │   └── youtube/search/      # Server-side YouTube search
│   └── page.jsx                 # Main page component
├── docs/                        # Project documentation (CHANGELOG, CONTEXT, etc.)
├── prisma/
│   └── schema.prisma            # Prisma schema definition
├── public/
├── src/
│   ├── components/
│   ├── hooks/                   # Custom React hooks (useVideoSearch, etc.)
│   ├── services/                # Frontend API service clients
│   └── generated/
│       └── prisma/              # Generated Prisma client
├── tests/                       # Unit and integration tests
├── lib/
│   └── prisma.js                # Prisma client singleton
├── .env                         # Environment variables
├── next.config.js               # Next.js configuration
├── package.json
├── postcss.config.js            # PostCSS configuration (Tailwind CSS v4)
└── tailwind.config.js           # Tailwind CSS configuration
```
