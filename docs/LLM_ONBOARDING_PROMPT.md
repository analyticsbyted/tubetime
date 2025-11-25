# LLM Onboarding Prompt for TubeTime Project

**Copy and paste this prompt when starting a new session with an LLM assistant:**

---

## Project Context

You are working on **TubeTime**, a historical YouTube search engine built with Next.js 16 (App Router), React 19, and PostgreSQL. The project is currently in **Phase 8 Day 3** (React Query Migrations Complete, Optimistic Updates In Progress).

**Current Version:** v4.10.5  
**Last Updated:** 2025-11-24

## Your First Steps

1. **Read the Handover Guide:** Start with `docs/HANDOVER.md` - this contains quick start instructions, project status, and common issues.

2. **Understand Current Status:** Review `docs/CONTEXT.md` section "Phase 8: Performance & Optimization" to understand what's been completed and what's next.

3. **Check Recent Changes:** Read `docs/CHANGELOG.md` entries for v4.10.0 and v4.10.1 to understand recent work.

4. **Review Phase 8 Plan:** Check `docs/PHASE8_IMPLEMENTATION_PLAN.md` for detailed implementation plan and current status.

## Current Project Status

### ✅ Completed (Phase 8 Day 1, Day 2, Day 3)

- **Observability Foundation (Day 1):** Sentry error tracking and performance monitoring fully configured
- **React Query Infrastructure (Day 2):** QueryClient configured, Provider integrated, test infrastructure created
- **Component Migrations (Day 2):** All major components migrated to React Query:
  - Search History (7 tests)
  - Favorites (8 tests)
  - Collections (12 tests)
  - Transcription Queue (12 tests with smart polling)
- **Optimistic Updates (Day 3):** Favorites optimistic updates implemented (4 tests)
- **Bug Fixes:** Duplicate search history entries fixed (race condition resolved)

### 🚧 In Progress (Next Steps)

- **Optimistic Updates:** Queue and Collections optimistic updates (Favorites complete)
- **Performance Optimization:** API route monitoring integration

## Important Technical Context

### Tech Stack
- **Framework:** Next.js 16 (App Router) with ES modules (`"type": "module"`)
- **Database:** PostgreSQL (Neon) with Prisma v6.19.0
- **State Management:** React Query v5.90.10 (migrating from manual state)
- **Error Tracking:** Sentry (@sentry/nextjs v10.26.0)
- **Testing:** Vitest v4.0.10 with TDD approach

### Key Architectural Patterns

1. **TDD Approach:** Write tests first, then implement hooks (see `tests/hooks/__tests__/useSearchHistoryQuery.test.js` as reference)
2. **React Query Pattern:** Use `useQuery` for fetching, `useMutation` for mutations (see `src/hooks/useSearchHistoryQuery.js` as reference)
3. **Component Migration:** Remove manual `useState`/`useEffect`, use React Query hooks (see `src/components/SearchHistory.jsx` as reference)

### Recent Bug Fixes

**Duplicate Search History Entries (v4.10.1):**
- **Issue:** Single search appeared 3 times in history
- **Root Cause:** Race condition in duplicate detection
- **Fix:** Atomic transaction wrapper (`prisma.$transaction()`) + client-side prevention
- **Files:** `app/api/search-history/route.js`, `src/hooks/useVideoSearch.js`

### Known Issues & Solutions

1. **Prisma v6 Compatibility:** Uses Client Extensions (`$extends()`) not deprecated `$use()` middleware
2. **ES Module Syntax:** All files use `import/export`, not `require/module.exports`
3. **Sentry Configuration:** Uses Next.js 16 instrumentation hooks (`instrumentation.js`, `instrumentation-client.ts`)

## Development Workflow

### TDD Pattern (React Query Hooks)

1. **Create Test File:** `tests/hooks/__tests__/useFavoritesQuery.test.js`
2. **Write Tests:** Define expected behavior (should fail initially - Red state)
3. **Run Tests:** `npm run test -- tests/hooks/__tests__/useFavoritesQuery.test.js`
4. **Create Hook:** `src/hooks/useFavoritesQuery.js`
5. **Verify Tests Pass:** Green state
6. **Migrate Component:** Update component to use new hook
7. **Run All Tests:** `npm run test` (should pass all 93+ tests)

### Reference Implementation

**Search History Migration (Complete):**
- Test: `tests/hooks/__tests__/useSearchHistoryQuery.test.js`
- Hook: `src/hooks/useSearchHistoryQuery.js`
- Component: `src/components/SearchHistory.jsx`
- Test Setup: `tests/setup-react-query.jsx`

## Key Files to Review

### React Query
- `src/lib/react-query.js` - QueryClient configuration
- `src/hooks/useSearchHistoryQuery.js` - Reference implementation
- `tests/setup-react-query.jsx` - Test utilities
- `src/components/SearchHistory.jsx` - Migrated component example

### Observability
- `instrumentation.js` - Server/Edge initialization
- `instrumentation-client.ts` - Client initialization
- `src/lib/api-monitoring.js` - API route monitoring wrapper
- `src/lib/prisma-monitoring.js` - Database query monitoring

### Database
- `prisma/schema.prisma` - Database schema
- `src/lib/prisma.js` - Prisma Client singleton (uses Client Extensions)

## Immediate Next Task

**Implement Optimistic Updates for Queue and Collections:**

1. **Add Optimistic Updates to Queue:**
   - Update `src/hooks/useTranscriptionQueueQuery.js`
   - Add `onMutate`, `onError`, `onSuccess` to mutations
   - Use `useFavoritesQuery.js` as reference

2. **Add Optimistic Updates to Collections:**
   - Update `src/hooks/useCollectionsQuery.js`
   - Add optimistic updates to create, update, delete, add videos
   - Use `useFavoritesQuery.js` as reference

3. **Add Tests:**
   - Test optimistic updates for each mutation
   - Test error rollback behavior
   - Use `useFavoritesQuery.test.js` as reference

4. **Verify:**
   ```bash
   npm run test  # Should pass all tests (currently 129)
   ```

## Important Notes

- **All tests must pass:** Current test suite has 129 tests, all passing
- **Follow TDD pattern:** Write tests before implementation
- **Use reference implementations:** SearchHistory is the completed example
- **Document changes:** Update relevant docs after completing tasks
- **Check for regressions:** Run full test suite frequently

## Documentation Priority

1. **`docs/HANDOVER.md`** - Start here for quick overview
2. **`docs/CONTEXT.md`** - Complete project history
3. **`docs/CHANGELOG.md`** - Recent changes
4. **`docs/PHASE8_IMPLEMENTATION_PLAN.md`** - Detailed plan

## Questions to Ask Yourself

Before starting work, ensure you understand:
- ✅ What is the current phase and status?
- ✅ What pattern should I follow for React Query migration?
- ✅ What tests exist and what should I test?
- ✅ What is the reference implementation I should follow?
- ✅ What bugs were recently fixed and how?

## Getting Help

- Check `docs/HANDOVER.md` for common issues and solutions
- Review `docs/CONTEXT.md` for detailed history
- Check `docs/TROUBLESHOOTING.md` for known issues
- Review test files for expected behavior patterns

---

**Remember:** This project uses TDD, so always write tests first. Use SearchHistory migration as your reference implementation for migrations, and use Favorites optimistic updates as reference for optimistic updates. All 129 tests must continue passing.

