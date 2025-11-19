# Migration Guide: Vite + React to Next.js

This document outlines the migration from Vite + React to Next.js for Phase 2 backend integration.

## Migration Status: ✅ Complete

### What Changed

#### 1. **Project Structure**
- Added `app/` directory (Next.js App Router)
- Added `app/layout.jsx` - Root layout component
- Added `app/page.jsx` - Main page (wraps existing App component)
- Added `app/api/youtube/search/route.js` - Server-side API route

#### 2. **API Security**
- ✅ **API Key moved server-side**: YouTube API key now stored in `.env` as `YOUTUBE_API_KEY`
- ✅ **Client-side API calls removed**: All YouTube API calls now go through Next.js API routes
- ✅ **SettingsModal removed**: No longer needed since API key is server-side

#### 3. **Client-Side Changes**
- Updated `src/services/youtubeService.js` to call `/api/youtube/search` instead of direct YouTube API
- Removed API key state management from `AppContext`
- Removed `SettingsModal` component from `App.jsx`
- Removed API key UI elements from header

#### 4. **Configuration**
- Added `next.config.js` for Next.js configuration
- Updated `package.json` scripts:
  - `dev`: Now runs `next dev` instead of `vite`
  - `build`: Now runs `next build` instead of `vite build`
  - `start`: Added for production server
  - Removed `preview` (Vite-specific)

### Environment Variables

**Before (Vite):**
```env
VITE_YOUTUBE_API_KEY=your_key_here
```

**After (Next.js):**
```env
YOUTUBE_API_KEY=your_key_here
```

**Important**: Next.js environment variables are server-side only by default. The `YOUTUBE_API_KEY` will not be exposed to the client.

### API Route Structure

The new API route is located at:
```
app/api/youtube/search/route.js
```

**Endpoint**: `POST /api/youtube/search`

**Request Body**:
```json
{
  "query": "search term",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-01-31T23:59:59Z",
  "channelName": "Channel Name",
  "duration": "short|medium|long",
  "order": "date|relevance|rating|title|viewCount",
  "language": "en",
  "pageToken": "next_page_token",
  "maxResults": 20
}
```

**Response**:
```json
{
  "items": [...],
  "nextPageToken": "next_page_token",
  "totalResults": 100
}
```

### Files Removed/Deprecated

These files are no longer needed but kept for reference:
- `vite.config.js` - Can be deleted
- `vitest.config.js` - Still needed for tests
- `index.html` - Next.js uses `app/layout.jsx` instead
- `src/main.jsx` - Next.js handles entry point

### Testing

Tests still use Vitest and should continue to work. The API route can be tested separately or mocked in component tests.

### Deployment

**Before (Vite)**:
```bash
npm run build  # Creates dist/ folder
# Deploy dist/ to static hosting
```

**After (Next.js)**:
```bash
npm run build  # Creates .next/ folder
npm start      # Runs production server
# Deploy to Node.js hosting (Vercel, Railway, etc.)
```

### Benefits of Migration

1. **Security**: API key never exposed to client
2. **Scalability**: Server-side rate limiting and caching possible
3. **Performance**: Server-side rendering options available
4. **Future-Ready**: Easy to add authentication, database, etc.

### Next Steps (Phase 2)

1. **Supabase Integration**: Add database for transcription queue
2. **Authentication**: Add user accounts (Next.js Auth.js)
3. **API Routes**: Add more endpoints for transcription management
4. **Real-time Updates**: WebSockets for transcription status

### Troubleshooting

**Issue**: API calls failing with 500 error
- **Solution**: Check that `YOUTUBE_API_KEY` is set in `.env` file

**Issue**: "Module not found" errors
- **Solution**: Ensure `app/` directory structure is correct

**Issue**: Styles not loading
- **Solution**: Verify `src/index.css` is imported in `app/layout.jsx`

### Rollback Plan

If needed, you can rollback by:
1. Revert `package.json` scripts to Vite
2. Restore `vite.config.js`
3. Restore `index.html` and `src/main.jsx`
4. Update `youtubeService.js` to use direct API calls
5. Restore API key management in `AppContext`

