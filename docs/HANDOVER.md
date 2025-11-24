# TubeTime Project Handover Guide

**Last Updated:** 2025-11-24  
**Current Version:** v4.10.1  
**Phase:** Phase 8 Day 2 (React Query Infrastructure Complete)

> **For LLM Assistants:** See [`LLM_ONBOARDING_PROMPT.md`](./LLM_ONBOARDING_PROMPT.md) for a ready-to-use onboarding prompt.

---

## Quick Start

### Prerequisites
- Node.js 18+ (check with `node --version`)
- npm or yarn
- PostgreSQL database (Neon serverless recommended)
- Sentry account (optional, for error tracking)

### Initial Setup

1. **Clone and Install:**
   ```bash
   git clone <repository-url>
   cd tubetime
   npm install
   ```

2. **Environment Variables:**
   Copy `.env.example` to `.env.local` and configure:
   ```env
   # Database
   DATABASE_URL="postgresql://..."

   # NextAuth.js
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key"
   GOOGLE_CLIENT_ID="..."
   GOOGLE_CLIENT_SECRET="..."
   GITHUB_ID="..."
   GITHUB_SECRET="..."

   # Sentry (Optional)
   NEXT_PUBLIC_SENTRY_DSN="https://xxx@sentry.io/xxx"
   SENTRY_ORG="your-org"
   SENTRY_PROJECT="your-project"
   SENTRY_AUTH_TOKEN="your-auth-token"

   # YouTube API
   YOUTUBE_API_KEY="..."

   # Transcription Worker (Optional)
   TRANSCRIPTION_WORKER_URL="https://..."
   TRANSCRIPTION_WORKER_SECRET="..."
   ```

3. **Database Setup:**
   ```bash
   npx prisma generate
   npx prisma migrate deploy
   ```

4. **Run Development Server:**
   ```bash
   npm run dev
   ```

5. **Run Tests:**
   ```bash
   npm run test
   ```

---

## Project Status

### ✅ Completed Phases

- **Phase 1:** Historical YouTube search engine (v1.0.0)
- **Phase 2:** Database foundation & authentication (v4.0.0)
- **Phase 3:** Search History API & frontend (v4.4.0)
- **Phase 4:** Favorites API & frontend (v4.5.0)
- **Phase 5:** Transcription Queue API & frontend (v4.6.0)
- **Phase 6:** Transcription Worker MVP (v4.7.0)
- **Phase 7:** Display Transcripts UI/UX (v4.8.0)
- **Phase 8 Day 1:** Observability Foundation (v4.10.0)
- **Phase 8 Day 2:** React Query Infrastructure (v4.10.1)

### 🚧 In Progress

- **Phase 8 Day 2+:** Migrate remaining components to React Query
  - Favorites component (TDD next)
  - Collections component
  - Transcription Queue component

### 📋 Planned

- **Phase 8 Day 3+:** Optimistic updates for mutations
- **Phase 8 Day 4+:** API route monitoring integration
- **Phase 9:** Testing & Quality Assurance

---

## Architecture Overview

### Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS v4
- **Backend:** Next.js API Routes, Prisma v6.19.0, PostgreSQL (Neon)
- **Authentication:** NextAuth.js v5.0.0-beta.30
- **State Management:** React Query v5.90.10 (in progress), URL-based state
- **Error Tracking:** Sentry (@sentry/nextjs v10.26.0)
- **Testing:** Vitest v4.0.10

### Key Architectural Decisions

1. **Database-Only Operations:** All persistent data uses database (no localStorage fallback)
2. **URL-Based State:** Search parameters stored in URL for shareability
3. **Component-Level State:** Modal states use local `useState` (no global re-renders)
4. **Focused Hooks:** Specialized hooks replace monolithic context
5. **React Query:** Migrating to React Query for intelligent caching

### Project Structure

```
/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── layout.jsx         # Root layout
│   ├── page.jsx           # Main page
│   └── global-error.jsx   # Global error boundary
├── src/
│   ├── components/        # React components
│   ├── hooks/             # Custom React hooks
│   ├── services/          # API client services
│   ├── utils/             # Utility functions
│   └── lib/               # Shared libraries (Prisma, React Query)
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── migrations/        # Database migrations
├── tests/                 # Vitest test suites
├── docs/                  # Project documentation
└── instrumentation.js      # Next.js instrumentation (Sentry)
```

---

## Recent Changes & Bug Fixes

### v4.10.1 (Phase 8 Day 2)

**Bug Fixed: Duplicate Search History Entries**
- **Issue:** Single search appeared 3 times in history
- **Root Cause:** Race condition in duplicate detection
- **Fix:** Atomic transaction wrapper + client-side prevention
- **Files:** `app/api/search-history/route.js`, `src/hooks/useVideoSearch.js`

**Implementation:**
- Added `prisma.$transaction()` wrapper to ensure atomic operations
- Added `!isLoadMore` check to prevent duplicate saves during pagination
- All 93 tests passing

### v4.10.0 (Phase 8 Day 1)

**Bugs Fixed:**
1. **ES Module Compatibility:** Converted `next.config.js` to ES modules
2. **Images Configuration:** Updated to `images.remotePatterns`
3. **Prisma v6 Compatibility:** Migrated from `$use` to Client Extensions
4. **Sentry Configuration:** Fixed instrumentation hooks and router tracking

---

## Common Issues & Solutions

### Issue: Duplicate Search History Entries

**Symptoms:** Single search appears multiple times in history

**Solution:** Already fixed in v4.10.1. If issue persists:
1. Check `app/api/search-history/route.js` has transaction wrapper
2. Verify `src/hooks/useVideoSearch.js` has `!isLoadMore` check
3. Check database for actual duplicates (may be legacy data)

### Issue: Prisma Client Errors

**Symptoms:** `prismaClient.$use is not a function`

**Solution:** Prisma v6 uses Client Extensions. Check:
1. `src/lib/prisma.js` uses `$extends()` not `$use()`
2. `src/lib/prisma-monitoring.js` exports extension object
3. Prisma version is v6.19.0+ (`npm list @prisma/client`)

### Issue: Sentry Configuration Warnings

**Symptoms:** Multiple Sentry warnings in console

**Solution:** Verify:
1. `instrumentation.js` exists and exports `register()` function
2. `instrumentation-client.ts` exports `onRouterTransitionStart`
3. `instrumentation.js` exports `onRequestError`
4. `app/global-error.jsx` exists

### Issue: ES Module Errors

**Symptoms:** `require is not defined` or `module.exports is not defined`

**Solution:** Project uses ES modules (`"type": "module"`):
1. Use `import/export` syntax, not `require/module.exports`
2. Check `package.json` has `"type": "module"`
3. All config files must use ES module syntax

---

## Development Workflow

### TDD Pattern (React Query Hooks)

1. **Write Test First:**
   ```bash
   # Create test file
   tests/hooks/__tests__/useFavoritesQuery.test.js
   ```

2. **Run Test (Should Fail):**
   ```bash
   npm run test -- tests/hooks/__tests__/useFavoritesQuery.test.js
   ```

3. **Implement Hook:**
   ```bash
   # Create hook file
   src/hooks/useFavoritesQuery.js
   ```

4. **Verify Test Passes:**
   ```bash
   npm run test -- tests/hooks/__tests__/useFavoritesQuery.test.js
   ```

5. **Migrate Component:**
   ```bash
   # Update component to use new hook
   src/components/FavoritesSidebar.jsx
   ```

### Testing

```bash
# Run all tests
npm run test

# Run specific test file
npm run test -- tests/hooks/__tests__/useSearchHistoryQuery.test.js

# Run tests in watch mode
npm run test -- --watch

# Run tests with UI
npm run test:ui
```

### Database Migrations

```bash
# Create new migration
npx prisma migrate dev --name migration_name

# Apply migrations (production)
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate

# Open Prisma Studio
npx prisma studio
```

---

## Key Files Reference

### React Query
- `src/lib/react-query.js` - QueryClient configuration
- `src/hooks/useSearchHistoryQuery.js` - Search History hooks (reference implementation)
- `tests/setup-react-query.jsx` - Test utilities

### Observability
- `instrumentation.js` - Server/Edge initialization
- `instrumentation-client.ts` - Client initialization
- `src/lib/api-monitoring.js` - API route monitoring wrapper
- `src/lib/prisma-monitoring.js` - Database query monitoring

### Database
- `prisma/schema.prisma` - Database schema
- `src/lib/prisma.js` - Prisma Client singleton

### Authentication
- `app/api/auth/[...nextauth]/route.js` - NextAuth.js configuration
- `src/components/Providers.jsx` - SessionProvider wrapper

---

## Documentation Index

- **`docs/CONTEXT.md`** - Complete project history and context
- **`docs/CHANGELOG.md`** - Version history and changes
- **`docs/PHASE8_IMPLEMENTATION_PLAN.md`** - Phase 8 detailed plan
- **`docs/OBSERVABILITY_SETUP.md`** - Sentry configuration guide
- **`docs/HANDOVER.md`** - This file

---

## Next Steps for New Developer

1. **Read Documentation:**
   - Start with `docs/CONTEXT.md` for full project history
   - Review `docs/PHASE8_IMPLEMENTATION_PLAN.md` for current phase details

2. **Set Up Environment:**
   - Follow "Quick Start" section above
   - Configure all environment variables
   - Run database migrations

3. **Understand Current State:**
   - Review Phase 8 Day 2 completion status
   - Understand React Query migration pattern (SearchHistory is reference)
   - Review bug fixes in recent versions

4. **Continue Development:**
   - Follow TDD pattern for remaining React Query migrations
   - Use SearchHistory implementation as reference
   - Run tests frequently to catch regressions

5. **Monitor Progress:**
   - Check `docs/PHASE8_IMPLEMENTATION_PLAN.md` for remaining tasks
   - Update documentation as you complete tasks
   - Document any new bugs or issues encountered

---

## Support & Resources

- **Prisma Docs:** https://www.prisma.io/docs
- **React Query Docs:** https://tanstack.com/query/latest
- **Next.js Docs:** https://nextjs.org/docs
- **Sentry Docs:** https://docs.sentry.io/platforms/javascript/guides/nextjs/

---

**Last Updated:** 2025-11-24  
**Maintained By:** Development Team  
**Questions?** Check `docs/CONTEXT.md` for detailed history and context.

