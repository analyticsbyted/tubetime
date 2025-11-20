# Troubleshooting Guide

This guide covers common issues encountered during TubeTime development and deployment, along with their solutions.

## Table of Contents

- [Authentication Issues](#authentication-issues)
- [API Key & Security](#api-key--security)
- [Database Connection](#database-connection)
- [Build & Configuration](#build--configuration)
- [Runtime Errors](#runtime-errors)
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
         "@/*": ["./*"]
       }
     },
     "exclude": ["node_modules"]
   }
   ```

2. **Verify File Structure:**
   ```
   tubetime/
   ├── jsconfig.json  ← Should be here
   ├── lib/
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

