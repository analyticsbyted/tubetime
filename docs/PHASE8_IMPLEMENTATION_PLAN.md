# Phase 8: Performance & Optimization - Implementation Plan

**Status:** 📋 **PLANNING** - Awaiting team review and approval

**Version:** 2.0 (Refined Scope)  
**Date:** 2025-01-XX  
**Estimated Timeline:** 4-5 days

---

## Executive Summary

Phase 8 focuses on optimizing the TubeTime application for better performance, scalability, and user experience. This phase introduces React Query for intelligent caching and state management, implements optimistic updates for instant UI feedback, and adds observability for monitoring and debugging.

**Scope Refinement:** Based on team feedback, Phase 8 has been refined to focus on React Query integration and observability. WebSockets/SSE implementation has been moved to Phase 8.5 or Phase 9 to reduce infrastructure complexity and allow React Query's smart polling to prove sufficient first.

### Key Objectives

1. **Implement React Query** - Replace manual data fetching with intelligent caching and state management
2. **Optimistic Updates** - Make the app feel instant with optimistic UI updates
3. **Add Observability** - Enable monitoring and debugging in production (prerequisite for optimization)
4. **Improve Performance** - Reduce API calls and optimize data fetching

### Success Criteria

- ✅ All data fetching migrated to React Query (useQuery/useMutation)
- ✅ 50%+ reduction in API calls through caching and request deduplication
- ✅ Optimistic updates for favorites, queue, and collections
- ✅ Comprehensive error tracking and performance metrics
- ✅ Improved user experience with instant UI feedback
- ✅ React Query smart polling replaces manual polling (good enough for 90% of use cases)

---

## Current State Analysis

### Performance Issues

1. **Manual Data Fetching:**
   - Custom hooks with manual `useEffect` and `useState`
   - No request deduplication
   - Redundant API calls for unchanged data
   - No automatic background refetching

2. **No Caching:**
   - Every page load refetches all data
   - No deduplication of identical requests
   - Redundant API calls for unchanged data
   - No stale-while-revalidate pattern

3. **No Optimistic Updates:**
   - UI waits for server response before updating
   - Perceived slowness even for fast operations
   - No instant feedback for user actions

4. **Limited Observability:**
   - No error tracking in production
   - No performance monitoring
   - Limited logging for debugging
   - No metrics on API usage

### Technical Debt

- Manual state management for API data
- No request deduplication
- No automatic retry logic
- No optimistic updates
- Polling-based updates (will be improved with React Query smart polling)

---

## Proposed Solution

### Component 1: React Query Integration (Priority 1)

**Goal:** Replace manual API state management with React Query for intelligent caching, automatic refetching, and smart polling.

#### Features

1. **Query Caching:**
   - Cache API responses with configurable TTL
   - Automatic stale-while-revalidate pattern
   - Request deduplication (multiple components requesting same data)
   - Background refetching on window focus

2. **Mutations:**
   - Optimistic updates for better UX
   - Automatic cache invalidation
   - Error rollback on failure

3. **Query Invalidation:**
   - Smart cache invalidation after mutations
   - Selective cache updates
   - Dependent query invalidation

#### Implementation Details

**New Dependencies:**
```json
{
  "@tanstack/react-query": "^5.0.0"
}
```

**Files to Create/Modify:**

1. **`src/lib/react-query.js`** (NEW)
   - Query client configuration
   - Default query options
   - Error handling setup

2. **`app/providers.jsx`** (NEW)
   - QueryClientProvider wrapper
   - Global error boundary integration

3. **`app/layout.jsx`** (MODIFY)
   - Wrap app with QueryClientProvider

4. **Service Layer Updates:**
   - `src/services/transcriptionQueueService.js` → Convert to React Query hooks
   - `src/services/transcriptService.js` → Convert to React Query hooks
   - `src/services/collectionsService.js` → Convert to React Query hooks
   - `src/services/searchHistoryService.js` → Convert to React Query hooks
   - `src/services/favoritesService.js` → Convert to React Query hooks

5. **Hook Updates:**
   - `src/hooks/useTranscriptionQueue.js` → Refactor to use React Query
   - `src/hooks/useTranscriptStatus.js` → Refactor to use React Query
   - Create new hooks: `useCollections`, `useSearchHistory`, `useFavorites`

**Example Implementation:**

```javascript
// src/hooks/useTranscriptionQueue.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getQueue, addToQueue } from '@/services/transcriptionQueueService';

export function useTranscriptionQueue(options = {}) {
  const { status = null, enabled = true } = options;
  
  return useQuery({
    queryKey: ['transcription-queue', status],
    queryFn: () => getQueue(status ? { status } : {}),
    enabled,
    refetchInterval: (query) => {
      // Smart polling: only poll when there are active items
      const data = query.state.data;
      const hasActive = data?.items?.some(item => 
        item.status === 'pending' || item.status === 'processing'
      );
      return hasActive ? 5000 : false; // Poll every 5s if active, otherwise disable
    },
    staleTime: 1000, // 1 second
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
  });
}

export function useAddToQueue() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ videoIds, priority, videos }) => 
      addToQueue(videoIds, priority, videos),
    onSuccess: () => {
      // Invalidate queue queries
      queryClient.invalidateQueries({ queryKey: ['transcription-queue'] });
    },
    onError: (error) => {
      // Error handling
      console.error('Failed to add to queue:', error);
    },
  });
}
```

**Benefits:**
- Automatic request deduplication
- Background refetching
- Optimistic updates
- Reduced API calls (~50%+ reduction expected)

**Estimated Time:** 2-3 days

---

### Component 2: Optimistic Updates (Priority 2)

**Goal:** Make the app feel instant by updating UI optimistically before server confirmation.

#### Features

1. **Favorites:**
   - Star icon updates immediately when clicked
   - Rollback on error with user notification

2. **Transcription Queue:**
   - Videos appear in queue immediately
   - Status updates optimistically

3. **Collections:**
   - Videos added to collection immediately
   - Collection list updates instantly

#### Implementation Details

**Example: Optimistic Favorites**

```javascript
// src/hooks/useFavorites.js
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addFavorite, removeFavorite } from '@/services/favoritesService';

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ favoriteId, type, data, isFavorited }) => 
      isFavorited ? removeFavorite(favoriteId) : addFavorite({ type, data }),
    onMutate: async ({ favoriteId, type, data, isFavorited }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['favorites'] });
      
      // Snapshot previous value
      const previousFavorites = queryClient.getQueryData(['favorites']);
      
      // Optimistically update
      queryClient.setQueryData(['favorites'], (old) => {
        if (isFavorited) {
          return old.filter(f => f.id !== favoriteId);
        } else {
          return [...old, { id: favoriteId, type, data, createdAt: new Date() }];
        }
      });
      
      return { previousFavorites };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(['favorites'], context.previousFavorites);
      toast.error('Failed to update favorite. Please try again.');
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
}
```

**Example: Optimistic Queue Addition**

```javascript
// src/hooks/useTranscriptionQueue.js (with optimistic updates)
export function useAddToQueue() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ videoIds, priority, videos }) => 
      addToQueue(videoIds, priority, videos),
    onMutate: async ({ videoIds, videos }) => {
      await queryClient.cancelQueries({ queryKey: ['transcription-queue'] });
      
      const previousQueue = queryClient.getQueryData(['transcription-queue']);
      
      // Optimistically add to queue
      queryClient.setQueryData(['transcription-queue'], (old) => {
        const newItems = videoIds.map((videoId, idx) => ({
          id: `temp-${videoId}`,
          videoId,
          video: videos[idx],
          status: 'pending',
          priority: 0,
          createdAt: new Date(),
        }));
        return {
          items: [...(old?.items || []), ...newItems],
          total: (old?.total || 0) + newItems.length,
        };
      });
      
      return { previousQueue };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['transcription-queue'], context.previousQueue);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transcription-queue'] });
    },
  });
}
```

**Benefits:**
- Instant UI feedback
- Better perceived performance
- Smoother user experience
- Automatic rollback on errors

**Estimated Time:** 1 day

---

### Component 3: Observability & Monitoring

**Goal:** Add comprehensive error tracking, performance monitoring, and logging.

#### Tools & Services

**Recommended Stack:**

1. **Error Tracking:** Sentry (free tier available)
   - Automatic error capture
   - Source maps for debugging
   - User context
   - Performance monitoring

2. **Analytics (Optional):** PostHog or Plausible
   - Privacy-respecting
   - User behavior tracking
   - Feature flags (future)

3. **Logging:** Structured logging with levels
   - Console logging in development
   - Remote logging in production (via Sentry)

#### Implementation Details

**1. Error Tracking Setup:**

**`src/lib/sentry.js`** (NEW)
```javascript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% of transactions
  beforeSend(event, hint) {
    // Filter sensitive data
    if (event.request) {
      delete event.request.cookies;
    }
    return event;
  },
});
```

**`app/layout.jsx`** (MODIFY)
- Wrap with Sentry ErrorBoundary

**2. Performance Monitoring:**

**API Route Wrapper:**
```javascript
// src/lib/api-monitoring.js
export function withMonitoring(handler) {
  return async (request, context) => {
    const start = Date.now();
    try {
      const response = await handler(request, context);
      const duration = Date.now() - start;
      
      // Log slow requests
      if (duration > 1000) {
        console.warn(`Slow API request: ${request.url} took ${duration}ms`);
      }
      
      return response;
    } catch (error) {
      // Capture errors
      Sentry.captureException(error, {
        tags: { type: 'api-route' },
        extra: { url: request.url },
      });
      throw error;
    }
  };
}
```

**3. Client-Side Monitoring:**

**`src/lib/client-monitoring.js`** (NEW)
- Track React Query cache hits/misses
- Monitor API call frequency
- Track user actions (anonymized)

**4. Database Query Monitoring:**

**Prisma Middleware:**
```javascript
// src/lib/prisma-monitoring.js
prisma.$use(async (params, next) => {
  const start = Date.now();
  const result = await next(params);
  const duration = Date.now() - start;
  
  if (duration > 500) {
    console.warn(`Slow query: ${params.model}.${params.action} took ${duration}ms`);
  }
  
  return result;
});
```

**Benefits:**
- Proactive error detection
- Performance bottleneck identification
- Better debugging in production
- User experience insights

**Estimated Time:** 1 day

---

## Implementation Timeline

### Day 1: Observability Setup (Early - Priority)
- [ ] Set up Sentry account and project
- [ ] Configure error tracking
- [ ] Add performance monitoring
- [ ] Set up structured logging
- [ ] Test error reporting
- **Rationale:** Knowing what is slow is a prerequisite for optimizing it

### Day 2-3: React Query Integration
- [ ] Install and configure React Query
- [ ] Create QueryClientProvider
- [ ] Convert search service to React Query
- [ ] Convert transcription queue service to React Query
- [ ] Convert transcript service to React Query
- [ ] Convert collections service to React Query
- [ ] Convert favorites service to React Query
- [ ] Convert search history service to React Query
- [ ] Update components to use new hooks
- [ ] Test caching and invalidation
- [ ] Configure smart polling for transcription queue

### Day 4: Optimistic Updates
- [ ] Implement optimistic updates for favorites
- [ ] Implement optimistic updates for transcription queue
- [ ] Implement optimistic updates for collections
- [ ] Test rollback on errors
- [ ] Verify UI feels instant

### Day 5: Testing & Polish
- [ ] Integration testing
- [ ] Performance testing (measure API call reduction)
- [ ] Error scenario testing
- [ ] Documentation updates
- [ ] Code review

---

## Dependencies & Prerequisites

### External Services

1. **Sentry Account** (Free tier sufficient)
   - Sign up at sentry.io
   - Create Next.js project
   - Get DSN for environment variables

### Environment Variables

```env
# Sentry (optional, for observability)
NEXT_PUBLIC_SENTRY_DSN="https://xxx@sentry.io/xxx"
SENTRY_AUTH_TOKEN="xxx"
SENTRY_ORG="xxx"
SENTRY_PROJECT="xxx"
```

### Dependencies to Install

```bash
npm install @tanstack/react-query
npm install @sentry/nextjs  # Optional, for observability
```

---

## Testing Strategy

### Unit Tests

- React Query hooks
- Optimistic update rollback logic
- Error handling
- Cache invalidation logic

### Integration Tests

- React Query integration across all services
- Optimistic update flow
- Error tracking
- Performance monitoring

### Manual Testing

- Multiple browser tabs (cache consistency)
- Network interruption (retry logic)
- Slow network conditions
- Error scenarios (optimistic rollback)

### Performance Testing

- API call reduction measurement
- Cache hit rate
- Optimistic update performance
- Memory usage (cache size)

---

## Migration Strategy

### Backward Compatibility

- Keep existing API routes unchanged
- Gradual migration of components
- React Query can coexist with existing hooks during migration

### Rollout Plan

1. **Phase 1:** Observability setup (non-breaking, early)
2. **Phase 2:** React Query integration (non-breaking, gradual migration)
3. **Phase 3:** Optimistic updates (non-breaking, improves UX)
4. **Phase 4:** Remove manual polling (after React Query smart polling validated)

---

## Risks & Mitigation

### Risk 1: React Query Learning Curve
- **Risk:** Team unfamiliar with React Query
- **Mitigation:** Documentation, code examples, team training

### Risk 4: Sentry Cost
- **Risk:** Exceeding free tier limits
- **Mitigation:** Sampling rates, error filtering

---

## Success Metrics

### Performance Metrics

- **API Call Reduction:** Target 50%+ reduction through caching and deduplication
- **Cache Hit Rate:** Target 70%+ for repeated queries
- **Perceived Performance:** Instant UI updates with optimistic mutations
- **Page Load Time:** No regression (ideally improvement through caching)
- **Polling Efficiency:** Smart polling only when needed (active queues)

### User Experience Metrics

- **Perceived Performance:** Faster UI updates
- **Error Rate:** Reduced user-facing errors
- **Battery Usage:** Reduced on mobile devices

### Technical Metrics

- **Code Maintainability:** Improved (less manual state management)
- **Error Detection:** 100% of errors tracked
- **Performance Monitoring:** All slow queries identified

---

## Future Enhancements (Post-Phase 8)

### Phase 8.5 or Phase 9: Real-Time Updates (WebSocket/SSE)

**Deferred Decision:** WebSockets/SSE implementation has been moved to a future phase to:
- Reduce infrastructure complexity (serverful connections vs. serverless functions)
- Allow React Query's smart polling to prove sufficient first
- Focus on core optimizations that provide immediate value

**When to Revisit:**
- If React Query smart polling proves insufficient
- If real-time updates (< 1 second) become critical
- If infrastructure can support persistent connections

**Alternative Approaches:**
1. **Server-Sent Events (SSE):** Simpler than WebSocket, HTTP-based
2. **WebSocket:** If bidirectional communication needed
3. **Database LISTEN/NOTIFY:** PostgreSQL native notifications for instant updates

### Other Future Enhancements

1. **Advanced Caching:** Redis for shared cache across instances
2. **GraphQL:** If API complexity grows significantly
3. **Service Worker:** Offline support and background sync
4. **Request Batching:** Combine multiple API calls into single requests

---

## Team Review Section

### Questions for Review

1. **Technology Choice:**
   - ✅ React Query vs SWR - Preference? (React Query recommended for better DevTools)
   - ✅ Sentry vs other error tracking (LogRocket, etc.) - Any preferences?
   - ✅ Smart polling vs WebSocket - Is smart polling sufficient for now?

2. **Scope:**
   - ✅ All services will be migrated to React Query (comprehensive approach)
   - ✅ Observability is required (prerequisite for optimization)
   - ✅ Optimistic updates for all mutation operations

3. **Timeline:**
   - Is 4-5 days realistic?
   - Should we break into smaller milestones?
   - Should observability be Day 1 (as recommended)?

4. **Dependencies:**
   - Any concerns about adding React Query dependency?
   - Sentry account setup - who will handle?

5. **Deferred Items:**
   - ✅ WebSocket/SSE moved to Phase 8.5 or Phase 9 - Agreed?
   - When should we revisit real-time updates?

### Team Feedback

**Reviewer 1:**
- Name: _______________
- Date: _______________
- Comments:
  - 
  - 
  - 

**Reviewer 2:**
- Name: _______________
- Date: _______________
- Comments:
  - 
  - 
  - 

**Reviewer 3:**
- Name: _______________
- Date: _______________
- Comments:
  - 
  - 
  - 

### Approval

- [ ] Technical Lead Approval: _______________ Date: _______
- [ ] Product Owner Approval: _______________ Date: _______
- [ ] Ready to Proceed: [ ] Yes [ ] No

---

## References

- [React Query Documentation](https://tanstack.com/query/latest)
- [Server-Sent Events MDN](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [Sentry Next.js Integration](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [PostgreSQL LISTEN/NOTIFY](https://www.postgresql.org/docs/current/sql-notify.html)

---

## Appendix: Code Examples

### Complete React Query Setup

```javascript
// src/lib/react-query.js
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});
```


---

**Document Status:** Ready for Review  
**Last Updated:** 2025-01-XX  
**Next Review Date:** TBD

