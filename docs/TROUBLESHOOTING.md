# Troubleshooting Guide

This guide covers common issues encountered during TubeTime development and deployment, along with their solutions.

## Table of Contents

- [Authentication Issues](#authentication-issues)
  - [Sign-In Button Does Nothing](#sign-in-button-does-nothing)
  - [Redirect Loop](#redirect-loop)
  - [GitHub Sign-In Returns 404](#github-sign-in-returns-404)
  - [Google Sign-In Shows Server Error](#google-sign-in-shows-server-error)
  - [Google Sign-In Button Doesn't Update After Successful Authentication](#google-sign-in-button-doesnt-update-after-successful-authentication)
  - [CLIENT_FETCH_ERROR / TypeError During Sign-In](#client_fetch_error--typeerror-during-sign-in)
- [API Key & Security](#api-key--security)
- [Security & Privacy](#security--privacy)
  - [localStorage Data Visible After Sign-Out](#localstorage-data-visible-after-sign-out)
  - [User Data Isolation](#user-data-isolation)
- [Database Connection](#database-connection)
- [Build & Configuration](#build--configuration)
- [Runtime Errors](#runtime-errors)
  - [NextAuth.js v5 Beta API Compatibility Issues](#nextauthjs-v5-beta-api-compatibility-issues)
- [General Issues](#general-issues)

## Authentication Issues

### Sign-In Button Does Nothing

**Symptoms:**
- Clicking "Sign In" button has no effect
- No redirect occurs
- Browser console shows no errors

**Possible Causes:**
1. Missing `NEXTAUTH_SECRET` environment variable
2. Missing `NEXTAUTH_URL` environment variable
3. OAuth provider credentials not configured
4. NextAuth.js route handler export issue

**Solutions:**

1. **Check Environment Variables:**
   ```bash
   # Verify .env.local contains:
   NEXTAUTH_SECRET="your_secret_here"
   NEXTAUTH_URL="http://localhost:3000"
   ```

2. **Verify OAuth Credentials:**
   - Ensure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` are set
   - Ensure `GITHUB_ID`, `GITHUB_SECRET` are set

3. **Clear Next.js Cache:**
   ```bash
   rm -rf .next
   npm run dev
   ```

4. **Check Route Handler:**
   - Verify `app/api/auth/[...nextauth]/route.js` exports `GET` and `POST` handlers
   - Check server logs for NextAuth.js errors

### Redirect Loop

**Symptoms:**
- Page continuously redirects
- Server logs show repeated GET requests to `/`
- URL contains nested `callbackUrl` parameters

**Cause:**
- `pages: { signIn: '/' }` configuration in NextAuth.js causing redirect loop
- OAuth callback URL mismatch

**Solutions:**

1. **Remove Pages Configuration:**
   - Ensure `app/api/auth/[...nextauth]/route.js` does NOT include `pages: { signIn: '/' }`
   - Use direct provider sign-in buttons instead

2. **Verify OAuth Redirect URIs:**
   - Google: `http://localhost:3000/api/auth/callback/google`
   - GitHub: `http://localhost:3000/api/auth/callback/github`
   - Must match exactly in provider settings

3. **Clear Browser Cache:**
   - Clear cookies and local storage
   - Try incognito/private browsing mode

### GitHub Sign-In Returns 404

**Symptoms:**
- Clicking "Sign In with GitHub" redirects to 404 page
- GitHub OAuth callback fails

**Cause:**
- Leading space in `GITHUB_ID` environment variable
- Incorrect redirect URI in GitHub OAuth app settings

**Solutions:**

1. **Fix GitHub ID:**
   ```bash
   # Check .env.local for leading/trailing spaces
   GITHUB_ID="your_github_client_id"  # No spaces before/after
   ```

2. **Verify GitHub OAuth App Settings:**
   - Go to GitHub Developer Settings
   - Check Authorization callback URL matches exactly: `http://localhost:3000/api/auth/callback/github`
   - Verify Client ID and Client Secret are correct

3. **Restart Server:**
   ```bash
   # Stop server, then:
   npm run dev
   ```

### Google Sign-In Shows Server Error

**Symptoms:**
- Google OAuth page loads successfully
- After selecting account, server error occurs
- Error mentions "server configuration"

**Cause:**
- Incorrect `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET`
- Redirect URI not configured in Google Cloud Console
- Missing `NEXTAUTH_SECRET`

**Solutions:**

1. **Verify Google OAuth Credentials:**
   - Check `.env.local` has correct `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
   - Ensure no extra spaces or quotes

2. **Configure Redirect URI in Google Cloud Console:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Edit your OAuth 2.0 Client ID
   - Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
   - Save changes

3. **Check Server Logs:**
   - Look for specific error messages
   - Verify `NEXTAUTH_SECRET` is set

### Google Sign-In Button Doesn't Update After Successful Authentication

**Symptoms:**
- Clicking "Sign In with Google" redirects to Google OAuth page
- After selecting account and authorizing, redirects back to app
- Sign-in button still shows "Sign In" instead of user info
- No errors in console
- GitHub sign-in works correctly
- Google sign-in works after signing out and signing back in

**Cause:**
- Session state not refreshing after OAuth callback completes
- `SessionProvider` not configured to refetch on window focus
- Missing `callbackUrl` parameter in sign-in calls
- Session update not triggered after OAuth redirect returns

**Solutions:**

1. **Update `SessionProvider` Configuration:**
   ```javascript
   // src/components/Providers.jsx
   <SessionProvider
     refetchInterval={0} // Disable automatic polling
     refetchOnWindowFocus={true} // Refresh when window regains focus
   >
     {children}
   </SessionProvider>
   ```
   - `refetchOnWindowFocus={true}` ensures session refreshes when returning from OAuth redirect

2. **Add `callbackUrl` to Sign-In Calls:**
   ```javascript
   // src/components/Header.jsx
   signIn('google', { callbackUrl: window.location.href });
   signIn('github', { callbackUrl: window.location.href });
   ```
   - Ensures OAuth redirect returns to current page
   - Helps maintain application state after authentication

3. **Add OAuth Callback Detection:**
   ```javascript
   // In Header component, detect OAuth callback and refresh session
   useEffect(() => {
     if (typeof window !== 'undefined') {
       const urlParams = new URLSearchParams(window.location.search);
       if (urlParams.has('callbackUrl') || window.location.pathname.includes('callback')) {
         const timer = setTimeout(() => {
           window.dispatchEvent(new Event('focus'));
         }, 500);
         return () => clearTimeout(timer);
       }
     }
   }, []);
   ```
   - Detects when returning from OAuth callback
   - Triggers session refresh check

4. **Verify Google OAuth Configuration:**
   - Check Google Cloud Console redirect URI: `http://localhost:3000/api/auth/callback/google`
   - Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env.local`
   - Ensure redirect URI matches exactly (no trailing slashes)

5. **Clear Browser Cache:**
   ```bash
   # Clear cookies and cache for localhost:3000
   # Or use incognito/private browsing mode to test
   ```

**Files Updated:**
- `src/components/Providers.jsx` - Added `refetchOnWindowFocus` configuration
- `src/components/Header.jsx` - Added `callbackUrl` and OAuth callback detection

**Current Status:** ✅ **RESOLVED** - Session now refreshes properly after Google OAuth callback

**Note:** If issue persists, check browser console for any errors and verify Google OAuth app settings in Google Cloud Console match your environment variables.

### CLIENT_FETCH_ERROR / TypeError During Sign-In

**Symptoms:**
- Console error: `[next-auth][error][CLIENT_FETCH_ERROR]`
- Error: `TypeError: Function.prototype.apply was called on #<Object>`
- Sign-in fails silently

**Cause:**
- NextAuth.js v5 beta route handler export pattern mismatch
- Provider import syntax incorrect

**Solutions:**

1. **Verify Route Handler Export:**
   ```javascript
   // app/api/auth/[...nextauth]/route.js should export:
   export { GET, POST }
   ```

2. **Check Provider Imports:**
   ```javascript
   // Should use default exports:
   import Google from "next-auth/providers/google"
   import GitHub from "next-auth/providers/github"
   
   // NOT named exports:
   // import GoogleProvider from "next-auth/providers/google" ❌
   ```

3. **Clear Cache and Rebuild:**
   ```bash
   rm -rf .next
   npm run dev
   ```

## API Key & Security

### YouTube API Key Not Configured

**Symptoms:**
- Error message: "YouTube API key is not configured on the server"
- Search queries fail
- 500 error from `/api/youtube/search`

**Cause:**
- `YOUTUBE_API_KEY` missing from `.env.local`
- Server not restarted after adding key

**Solutions:**

1. **Add API Key to `.env.local`:**
   ```env
   YOUTUBE_API_KEY="your_youtube_api_key_here"
   ```

2. **Restart Development Server:**
   ```bash
   # Stop server (Ctrl+C), then:
   npm run dev
   ```

3. **Verify Key is Loaded:**
   - Check server logs for any environment variable warnings
   - Ensure `.env.local` is in project root (not in `app/` or `src/`)

### API Keys Appearing in Browser / URLs

**Symptoms:**
- Concern about keys being exposed
- Long URLs visible in browser
- Keys potentially visible in DevTools

**Verification:**

1. **Check Browser URL:**
   - Keys should NEVER appear in URL query parameters
   - Long URLs with `callbackUrl` are safe (they contain no keys)

2. **Check Network Tab:**
   - Open DevTools → Network tab
   - Check requests to `/api/youtube/search`
   - Keys should NOT appear in headers or request body

3. **Check Console:**
   - No `console.log` statements should output keys
   - Error messages should not include keys

**Security Verification:**

✅ **Keys are secure if:**
- Stored in `.env.local` (not committed to git)
- Only used server-side via `process.env`
- Never sent to client
- Never appear in URLs
- Never logged to console

**About Long URLs:**
- URLs with `callbackUrl` parameter are normal NextAuth.js behavior
- These contain redirect information, not sensitive data
- Example: `/?callbackUrl=http%3A%2F%2Flocalhost%3A3000%2F...`
- This is URL-encoded and safe

## Security & Privacy

### localStorage Data Visible After Sign-Out

**Symptoms:**
- Favorites, search history, or transcription queue visible after signing out
- Data persists in browser after sign-out
- Concern about data privacy on shared devices

**Security Issue:**
localStorage is browser-specific, not user-specific. On shared browsers, users could potentially see each other's localStorage data.

**Solution (v4.6.1):**
The application now automatically clears all localStorage data on sign-out and prevents displaying localStorage data when unauthenticated.

**Implementation:**
1. **Automatic Clearing on Sign-Out:**
   - All localStorage keys are cleared when user signs out:
     - `tubetime_favorites`
     - `tubetime_search_history`
     - `tubetime_transcription_queue`

2. **Unauthenticated Access Prevention:**
   - When not authenticated, utilities return empty arrays instead of localStorage data
   - This prevents data leakage even if localStorage wasn't cleared

**Files Modified:**
- `src/components/Header.jsx` - Clears localStorage on sign-out
- `src/utils/favorites.js` - Returns empty array when unauthenticated
- `src/utils/searchHistory.js` - Returns empty array when unauthenticated
- `src/utils/transcriptionQueue.js` - Returns empty array when unauthenticated

**Verification:**
1. Sign in and create some favorites/search history
2. Sign out
3. Check browser DevTools → Application → Local Storage
4. Verify all `tubetime_*` keys are removed
5. Verify favorites sidebar shows empty (no localStorage data displayed)

**Best Practices:**
- Always sign out on shared devices
- Use private browsing for sensitive searches
- Be aware that localStorage is browser-specific

**Note:** For comprehensive security documentation, see [SECURITY.md](./SECURITY.md).

### User Data Isolation

**Question:**
Can users see each other's data?

**Answer:**
No. All user data is strictly isolated in the database:

1. **Database Scoping:**
   - All queries are filtered by `userId`
   - Users can only access their own data
   - No cross-user data access is possible

2. **API Authentication:**
   - All API routes require authentication
   - User ID is extracted from session
   - All database operations use user-scoped queries

3. **localStorage Security:**
   - localStorage is cleared on sign-out
   - localStorage data is not displayed when unauthenticated
   - Only database data is shown when authenticated

**Example Query Pattern:**
```javascript
// All database queries follow this pattern:
const items = await prisma.item.findMany({
  where: { userId }, // Always filtered by user ID
});
```

**Verification:**
- Sign in as User A, create favorites
- Sign out
- Sign in as User B
- User B should only see their own favorites (from database)
- User A's favorites should not be visible

**Note:** For detailed security implementation, see [SECURITY.md](./SECURITY.md).

## Database Connection

### Prisma Can't Find DATABASE_URL

**Symptoms:**
- Error: `Environment variable not found: DATABASE_URL`
- `npx prisma migrate dev` fails
- Prisma Studio can't connect

**Cause:**
- Prisma CLI reads from `.env` (not `.env.local`)
- `DATABASE_URL` missing from `.env` file

**Solutions:**

1. **Add DATABASE_URL to `.env`:**
   ```bash
   # Create or update .env file:
   DATABASE_URL="postgresql://user:password@host.neon.tech/dbname?sslmode=require"
   ```

2. **Use Same Value in Both Files:**
   - `.env` - For Prisma CLI
   - `.env.local` - For Next.js runtime
   - Can contain same values

3. **Verify Connection String Format:**
   - Must include `?sslmode=require` for Neon
   - Format: `postgresql://user:password@host/dbname?sslmode=require`

### Database Connection Fails

**Symptoms:**
- Error: `Can't reach database server`
- Prisma connection timeout
- Migration fails

**Cause:**
- Missing `?sslmode=require` in connection string
- Incorrect credentials
- Database paused (Neon free tier)

**Solutions:**

1. **Verify Connection String:**
   ```env
   # Correct format for Neon:
   DATABASE_URL="postgresql://user:password@host.neon.tech/dbname?sslmode=require"
   ```

2. **Check Neon Dashboard:**
   - Verify database is active (not paused)
   - Copy connection string directly from Neon dashboard
   - Ensure credentials are correct

3. **Test Connection:**
   ```bash
   # Test with Prisma Studio:
   npx prisma studio
   ```

### Module Not Found: @/lib/prisma

**Symptoms:**
- Build error: `Can't resolve '@/lib/prisma'`
- Import fails in `app/api/auth/[...nextauth]/route.js`

**Cause:**
- Missing `jsconfig.json` file
- Incorrect path alias configuration

**Solutions:**

1. **Create `jsconfig.json` in project root:**
   ```json
   {
     "compilerOptions": {
       "baseUrl": ".",
       "paths": {
        "@/*": ["./src/*"]
       }
     },
     "exclude": ["node_modules"]
   }
   ```

2. **Verify File Structure:**
   ```
   tubetime/
   ├── jsconfig.json  ← Should be here
   ├── src/
   │   └── lib/
   │   └── prisma.js
   └── app/
       └── api/
           └── auth/
               └── [...nextauth]/
                   └── route.js
   ```

3. **Restart Development Server:**
   ```bash
   rm -rf .next
   npm run dev
   ```

## Build & Configuration

### PostCSS Configuration Errors

**Symptoms:**
- Error: `A PostCSS Plugin was passed as a function using require()`
- Error: `Malformed PostCSS Configuration`
- Build fails

**Cause:**
- PostCSS plugins must be strings in Next.js webpack mode
- Incorrect `postcss.config.cjs` syntax

**Solutions:**

1. **Verify `postcss.config.cjs` Format:**
   ```javascript
   // Correct format:
   module.exports = {
     plugins: {
       '@tailwindcss/postcss': {},
       'autoprefixer': {},
     },
   };
   ```

2. **Ensure File Extension:**
   - File must be `postcss.config.cjs` (not `.js`)
   - Required for CommonJS in ES module project

3. **Clear Cache:**
   ```bash
   rm -rf .next
   npm run build
   ```

### LightningCSS Native Module Error

**Symptoms:**
- Error: `Can't resolve '../lightningcss.' <dynamic> '.node'`
- Build fails with webpack error

**Cause:**
- Turbopack doesn't handle native modules well
- `lightningcss` requires native bindings

**Solutions:**

1. **Use Webpack Instead of Turbopack:**
   ```bash
   # Update package.json scripts:
   "dev": "next dev --webpack",
   "build": "next build --webpack"
   ```

2. **Verify `next.config.js`:**
   ```javascript
   // Should include webpack config for native modules:
   webpack: (config, { isServer }) => {
     if (!isServer) {
       config.resolve.fallback = {
         ...config.resolve.fallback,
         fs: false,
         path: false,
         os: false,
       };
     }
     return config;
   },
   ```

### Experimental ESM Externals Warning

**Symptoms:**
- Warning: `The "experimental.esmExternals" option has been modified`
- Warning: `experimental.esmExternals is not recommended`

**Cause:**
- Deprecated option in `next.config.js`

**Solutions:**

1. **Remove from `next.config.js`:**
   ```javascript
   // Remove this:
   experimental: {
     esmExternals: 'loose',  // ❌ Remove this
   },
   ```

2. **Keep Only Required Config:**
   ```javascript
   export default {
     reactStrictMode: true,
     webpack: (config, { isServer }) => {
       // ... webpack config
     },
   };
   ```

## Runtime Errors

### CSS Warnings in Browser Console

**Symptoms:**
- Console warnings about `-webkit-text-size-adjust`
- Warnings about `:host` selector
- Warnings about `-moz-focus-inner`

**Cause:**
- Tailwind CSS v4 generates browser-specific CSS
- Some CSS triggers harmless browser warnings

**Solutions:**

1. **These warnings are harmless** - can be safely ignored
2. **No action required** - they don't affect functionality
3. **If desired, suppress in production:**
   - Warnings only appear in development
   - Production builds are optimized

### Hydration Errors

**Symptoms:**
- Error: `<button> cannot be a descendant of <button>`
- React hydration mismatch warnings

**Cause:**
- Nested button elements in component structure
- Server/client HTML mismatch

**Solutions:**

1. **Check Component Structure:**
   - Ensure buttons are not nested inside other buttons
   - Use `<div>` or other elements for containers

2. **Example Fix:**
   ```jsx
   // ❌ Bad:
   <button>
     <button>Delete</button>
   </button>
   
   // ✅ Good:
   <div>
     <button>Action</button>
     <button>Delete</button>
   </div>
   ```

### NextAuth.js v5 Beta API Compatibility Issues

**Status:** ⚠️ **PARTIALLY RESOLVED** - Some issues persist

**Overview:**
TubeTime uses NextAuth.js v5 beta, which has an evolving API. During migration from localStorage to database-backed features, several compatibility issues were encountered related to session retrieval in API routes.

#### Issue 1: `getServerSession` Not Found

**Symptoms:**
- Build error: `Attempted import error: 'getServerSession' is not exported from 'next-auth/next'`
- Build error: `Attempted import error: 'getServerSession' is not exported from 'next-auth'`
- API routes fail to compile
- 500 errors on all authenticated API endpoints

**Root Cause:**
- NextAuth.js v5 beta changed the API for retrieving sessions in API routes
- `getServerSession` from `next-auth/next` or `next-auth` is no longer available
- The new API uses an `auth()` function exported from the auth configuration

**Attempted Fixes:**

1. **First Attempt - Import from `next-auth`:**
   ```javascript
   // ❌ Failed
   import { getServerSession } from "next-auth";
   import { authOptions } from "@/app/api/auth/[...nextauth]/route";
   const session = await getServerSession(authOptions);
   ```

2. **Second Attempt - Use `auth()` from `next-auth`:**
   ```javascript
   // ❌ Failed - 'auth' is not exported from 'next-auth'
   import { auth } from "next-auth";
   const session = await auth();
   ```

3. **Current Implementation - Use `auth()` from `@/auth`:**
   ```javascript
   // ✅ Works (but see Issue 2)
   import { auth } from "@/auth";
   const session = await auth();
   ```

**Files Updated:**
- `app/api/favorites/route.js`
- `app/api/favorites/[id]/route.js`
- `app/api/favorites/check/route.js`
- `app/api/search-history/route.js`
- `app/api/search-history/[id]/route.js`
- `app/api/collections/route.js`
- `app/api/collections/[id]/route.js`
- `app/api/collections/[id]/videos/route.js`

**Current Status:** ✅ **RESOLVED** - All API routes now use `auth()` from `@/auth`

#### Issue 2: Build Errors After Import Fix

**Symptoms:**
- After fixing imports, build errors persist:
  - `Attempted import error: 'auth' is not exported from 'next-auth' (imported as 'auth')`
  - Errors appear even though imports are from `@/auth`
  - Server logs show compilation errors for API routes

**Root Cause:**
- Next.js webpack compilation may be caching old imports
- The `@/auth` path alias may not be resolving correctly in all contexts
- NextAuth.js v5 beta API is still evolving

**Attempted Fixes:**

1. **Cleared Next.js cache:**
   ```bash
   rm -rf .next
   npm run dev
   ```
   - **Result:** Partial - errors reduced but persisted

2. **Verified `src/auth.js` exports:**
   ```javascript
   // src/auth.js correctly exports:
   const { handlers, auth, signIn, signOut } = NextAuth(authOptions);
   export { auth, signIn, signOut };
   ```
   - **Result:** Exports are correct

3. **Verified `jsconfig.json` path alias:**
   ```json
   {
     "compilerOptions": {
       "baseUrl": ".",
       "paths": {
         "@/*": ["./src/*", "./*"]
       }
     }
   }
   ```
   - **Result:** Path alias configuration is correct

**Current Status:** ⚠️ **PARTIALLY RESOLVED** - Build errors may still appear intermittently, but functionality works when server is running

#### Issue 3: Console Errors for Unauthenticated Users

**Symptoms:**
- When logged out, browser console fills with errors:
  - `Error checking favorite: Error: Unauthorized: Please sign in to check favorites.`
  - Multiple errors for each channel being checked
  - Server logs show repeated 401 errors being logged as errors
  - Console warnings in `SearchStats.jsx` component

**Root Cause:**
- API routes log all errors, including expected 401 responses for unauthenticated users
- Frontend components log warnings for expected authentication failures
- The dual-write pattern should gracefully handle unauthenticated users without logging errors

**Fixes Applied:**

1. **Updated API Routes to Not Log Expected 401s:**
   ```javascript
   // Before:
   catch (error) {
     console.error('Error checking favorite:', error);
     if (error.message === 'Unauthorized') {
       return NextResponse.json({ error: error.message }, { status: 401 });
     }
   }
   
   // After:
   catch (error) {
     if (error.message === 'Unauthorized') {
       // Expected for unauthenticated users - don't log as error
       return NextResponse.json({ error: error.message }, { status: 401 });
     }
     console.error('Error checking favorite:', error);
   }
   ```

2. **Updated Frontend Components:**
   ```javascript
   // SearchStats.jsx - Suppress warnings for expected unauthorized errors
   catch (error) {
     if (!error.message?.includes('Unauthorized') && !error.message?.includes('sign in')) {
       console.warn(`Failed to check favorite status for ${channel}:`, error);
     }
   }
   ```

**Files Updated:**
- All API routes (favorites, search-history, collections)
- `src/components/SearchStats.jsx`

**Current Status:** ✅ **RESOLVED** - Expected 401 errors are no longer logged

#### Issue 4: Prisma Client Initialization

**Symptoms:**
- Runtime error: `@prisma/client did not initialize yet. Please run "prisma generate" and try to import it again.`
- Error occurs even after running `npx prisma generate`
- Error appears in `src/lib/prisma.js` when creating PrismaClient instance

**Root Cause:**
- Custom `output` path in `prisma/schema.prisma` was causing Prisma client to be generated in wrong location
- Next.js couldn't find the generated client

**Fix Applied:**

1. **Removed custom output path from `prisma/schema.prisma`:**
   ```prisma
   // Before:
   generator client {
     provider = "prisma-client-js"
     output   = "../src/generated/prisma"  // ❌ Custom path
   }
   
   // After:
   generator client {
     provider = "prisma-client-js"
     // output removed - use default location
   }
   ```

2. **Regenerated Prisma client:**
   ```bash
   npx prisma generate
   ```

**Current Status:** ✅ **RESOLVED** - Prisma client initializes correctly

#### Issue 5: Module Resolution for `@/lib/prisma`

**Symptoms:**
- Build error: `Module not found: Can't resolve '@/lib/prisma'`
- Error in `app/api/auth/[...nextauth]/route.js`
- Error persists after moving `lib/prisma.js` to `src/lib/prisma.js`

**Root Cause:**
- `jsconfig.json` path alias only resolved `@/*` to `./src/*`
- Imports like `@/lib/prisma` need to resolve to `src/lib/prisma.js`
- Some imports also need to resolve to root-level files

**Fix Applied:**

1. **Updated `jsconfig.json` to support both paths:**
   ```json
   {
     "compilerOptions": {
       "baseUrl": ".",
       "paths": {
         "@/*": ["./src/*", "./*"]  // Resolves to both src/ and root
       }
     }
   }
   ```

**Current Status:** ✅ **RESOLVED** - Path aliases work correctly

### Summary of Current Status

**✅ Resolved Issues:**
1. Prisma client initialization
2. Module resolution for `@/lib/prisma`
3. Console errors for unauthenticated users (expected 401s)
4. API route imports using `auth()` from `@/auth`

**⚠️ Partially Resolved:**
1. Build errors may still appear intermittently, but functionality works
2. NextAuth.js v5 beta API is still evolving - may need updates as library stabilizes

**📝 Notes:**
- The application **functions correctly** when the dev server is running
- Build errors may appear during compilation but don't prevent runtime functionality
- All API routes correctly handle authentication and return appropriate responses
- Unauthenticated users can use the app with localStorage fallback (as designed)

**🔍 Monitoring:**
- Watch for NextAuth.js v5 beta updates that may change the API
- Monitor build logs for any new import errors
- Verify session retrieval works correctly in all API routes

**📚 References:**
- NextAuth.js v5 Beta Documentation: [https://authjs.dev/](https://authjs.dev/)
- Project Auth Configuration: `src/auth.js`
- API Route Examples: `app/api/favorites/route.js`

## General Issues

### Long URLs with Nested callbackUrl

**Symptoms:**
- Very long URLs with repeated `callbackUrl` parameters
- URL looks suspicious or contains encoded data

**Explanation:**

This is **normal and safe** NextAuth.js behavior:

- `callbackUrl` parameter tracks redirect destination
- URL-encoded for safety (e.g., `%3A` = `:`)
- Contains no sensitive data (no API keys, secrets, or tokens)
- Used for redirect flow after authentication

**Example Safe URL:**
```
/?callbackUrl=http%3A%2F%2Flocalhost%3A3000%2F%3FcallbackUrl%3D...
```

**No Action Required:**
- This is expected behavior
- URLs are safe and contain no sensitive information
- If redirect loop occurs, see [Redirect Loop](#redirect-loop) section

### Environment Variables Not Loading

**Symptoms:**
- Environment variables not accessible
- `process.env.VARIABLE` returns `undefined`
- Server needs restart after adding variables

**Solutions:**

1. **File Location:**
   - `.env.local` must be in project root (not in `app/` or `src/`)
   - Next.js automatically loads `.env.local`

2. **Restart Server:**
   ```bash
   # Always restart after adding/changing .env.local:
   npm run dev
   ```

3. **Verify Variable Names:**
   - Must start with `NEXT_PUBLIC_` for client-side access
   - Server-side variables don't need prefix
   - No spaces around `=` sign

4. **Check File Format:**
   ```env
   # ✅ Correct:
   VARIABLE_NAME="value"
   
   # ❌ Wrong:
   VARIABLE_NAME = "value"  # Spaces around =
   VARIABLE_NAME=value without quotes  # May cause issues
   ```

### Port Already in Use

**Symptoms:**
- Error: `Port 3000 is already in use`
- Server won't start

**Solutions:**

1. **Find and Kill Process:**
   ```bash
   # Find process using port 3000:
   lsof -ti:3000
   
   # Kill it:
   kill -9 $(lsof -ti:3000)
   ```

2. **Use Different Port:**
   ```bash
   # Start on different port:
   PORT=3001 npm run dev
   ```

3. **Update NEXTAUTH_URL:**
   - If using different port, update `.env.local`:
   ```env
   NEXTAUTH_URL="http://localhost:3001"
   ```

## Getting Help

If you encounter an issue not covered here:

1. **Check Server Logs:**
   - Look for specific error messages
   - Check terminal output for stack traces

2. **Check Browser Console:**
   - Open DevTools (F12)
   - Look for JavaScript errors
   - Check Network tab for failed requests

3. **Verify Environment:**
   - Ensure all environment variables are set
   - Verify file locations and formats
   - Check Node.js version (v18+ required)

4. **Review Documentation:**
   - [README.md](../README.md) - Setup and configuration
   - [CONTEXT.md](./CONTEXT.md) - Project history and decisions
   - [CHANGELOG.md](./CHANGELOG.md) - Recent changes

5. **Clear Caches:**
   ```bash
   # Clear Next.js cache:
   rm -rf .next
   
   # Clear node_modules (if needed):
   rm -rf node_modules
   npm install
   ```

## Prevention Tips

1. **Always restart server after changing `.env.local`**
2. **Keep `.env.local` in `.gitignore`** (never commit secrets)
3. **Use exact redirect URIs** in OAuth provider settings
4. **Clear `.next` cache** when encountering build issues
5. **Check server logs** for detailed error messages
6. **Verify environment variables** before reporting issues

