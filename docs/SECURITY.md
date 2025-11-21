# Security Documentation

This document outlines security considerations, implementations, and best practices for the TubeTime application.

## Table of Contents

- [Authentication & User Data Isolation](#authentication--user-data-isolation)
- [localStorage Security](#localstorage-security)
- [API Security](#api-security)
- [Data Privacy](#data-privacy)

## Authentication & User Data Isolation

### Database-Backed User Scoping

All user data stored in the database is strictly scoped to the authenticated user:

- **Collections**: Filtered by `userId` in all queries
- **Search History**: Filtered by `userId` in all queries
- **Favorites**: Filtered by `userId` in all queries
- **Transcription Queue**: Filtered by `userId` in all queries

**Implementation:**
- All API routes verify authentication using `auth()` from NextAuth.js
- All database queries include `where: { userId }` clause
- Authorization checks prevent users from accessing other users' data

### Sign-Out Data Clearing

**Security Issue Addressed (v4.6.1):**
localStorage is browser-specific, not user-specific. On shared browsers, users could potentially see each other's localStorage data.

**Solution:**
When a user signs out, all localStorage data is automatically cleared:

```javascript
// In src/components/Header.jsx
onClick={async () => {
  // Clear all localStorage data on sign out for security
  localStorage.removeItem('tubetime_favorites');
  localStorage.removeItem('tubetime_search_history');
  localStorage.removeItem('tubetime_transcription_queue');
  await signOut();
}}
```

**Data Cleared:**
- `tubetime_favorites`
- `tubetime_search_history`
- `tubetime_transcription_queue`

## localStorage Security

### Unauthenticated Access Prevention

**Security Enhancement (v4.6.1):**
When users are not authenticated, localStorage data is not displayed, even if it exists.

**Implementation:**
- `getFavorites()`: Returns empty array when unauthenticated
- `getSearchHistory()`: Returns empty array when unauthenticated
- `getQueue()`: Returns empty array when unauthenticated

**Rationale:**
- Prevents data leakage between users on shared browsers
- Ensures user data is only accessible when authenticated
- localStorage is cleared on sign-out, but this provides additional protection

### Dual-Write Pattern Security

During the migration period, data is written to both database and localStorage:

**Write Behavior:**
- **Authenticated users**: Data written to both database and localStorage
- **Unauthenticated users**: Data written only to localStorage (with sign-in prompt)

**Read Behavior:**
- **Authenticated users**: Database data is prioritized, localStorage is fallback
- **Unauthenticated users**: No data displayed (empty arrays returned)

**Security Considerations:**
- localStorage data is cleared on sign-out
- localStorage data is not displayed when unauthenticated
- Database data is always user-scoped and secure

## API Security

### Authentication Requirements

All API routes require authentication:

- `/api/collections/*` - Requires authentication
- `/api/search-history/*` - Requires authentication
- `/api/favorites/*` - Requires authentication
- `/api/transcription-queue/*` - Requires authentication

**Implementation:**
```javascript
// All API routes use this pattern:
async function getUserId() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }
  return session.user.id;
}
```

### User Scoping

All database operations are scoped to the authenticated user:

```javascript
// Example from collections API
const collections = await prisma.collection.findMany({
  where: { userId }, // Always filtered by user ID
});
```

### Error Handling

- **401 Unauthorized**: Expected for unauthenticated users (not logged as errors)
- **403 Forbidden**: User doesn't own the resource
- **404 Not Found**: Resource doesn't exist
- **500 Internal Server Error**: Unexpected server errors (logged)

## Data Privacy

### User Data Isolation

- Each user's data is completely isolated in the database
- No cross-user data access is possible
- All queries are filtered by `userId`

### Session Management

- Sessions are managed by NextAuth.js with Prisma adapter
- Session data is stored in the database
- Sessions expire according to NextAuth.js configuration

### OAuth Security

- OAuth credentials are stored server-side only
- Redirect URIs are validated
- OAuth state parameter prevents CSRF attacks

## Best Practices

### For Developers

1. **Always scope queries by userId:**
   ```javascript
   // ✅ Good
   const items = await prisma.item.findMany({
     where: { userId },
   });
   
   // ❌ Bad - missing user scoping
   const items = await prisma.item.findMany();
   ```

2. **Verify authentication in all API routes:**
   ```javascript
   // ✅ Good
   const userId = await getUserId();
   
   // ❌ Bad - no authentication check
   const items = await prisma.item.findMany();
   ```

3. **Clear localStorage on sign-out:**
   ```javascript
   // ✅ Good
   localStorage.removeItem('tubetime_favorites');
   await signOut();
   ```

4. **Don't display localStorage data when unauthenticated:**
   ```javascript
   // ✅ Good
   if (error.message.includes('Unauthorized')) {
     return []; // Don't show localStorage data
   }
   
   // ❌ Bad - shows localStorage to unauthenticated users
   return getLocalStorageData();
   ```

### For Users

1. **Sign out on shared devices:**
   - Always sign out when using shared computers
   - localStorage is cleared on sign-out for security

2. **Use private browsing for sensitive searches:**
   - Private browsing prevents localStorage persistence
   - Data is not saved between sessions

3. **Be aware of browser storage:**
   - localStorage is browser-specific
   - Data is cleared on sign-out, but be cautious on shared devices

## Security Updates

### v4.6.1 - localStorage Security Fix

**Issue:** Users on shared browsers could see each other's localStorage data when signed out.

**Fix:**
- Clear all localStorage data on sign-out
- Don't display localStorage data when unauthenticated
- Only show database data when authenticated

**Files Modified:**
- `src/components/Header.jsx` - Clear localStorage on sign-out
- `src/utils/favorites.js` - Return empty array when unauthenticated
- `src/utils/searchHistory.js` - Return empty array when unauthenticated
- `src/utils/transcriptionQueue.js` - Return empty array when unauthenticated

## Reporting Security Issues

If you discover a security vulnerability, please report it responsibly:

1. **Do not** create a public GitHub issue
2. **Do** contact the project maintainers directly
3. **Do** provide detailed information about the vulnerability
4. **Do** allow time for the issue to be addressed before public disclosure

## References

- [NextAuth.js Security](https://next-auth.js.org/configuration/options#security)
- [Prisma Security Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

