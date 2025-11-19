'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback, useMemo } from 'react';

/**
 * Custom hook for managing search parameters in URL
 * Replaces AppContext's search state management
 */
export function useSearchParamsState() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Parse current search params
  const currentParams = useMemo(() => {
    return {
      query: searchParams.get('q') || '',
      channelName: searchParams.get('channel') || '',
      startDate: searchParams.get('start') || '',
      endDate: searchParams.get('end') || '',
      duration: searchParams.get('duration') || '',
      language: searchParams.get('lang') || '',
      order: searchParams.get('order') || 'date',
      maxResults: parseInt(searchParams.get('max') || '20', 10),
    };
  }, [searchParams]);

  // Update search params
  const updateSearchParams = useCallback((newParams) => {
    const params = new URLSearchParams(searchParams.toString());
    
    // Update params
    if (newParams.query !== undefined) {
      if (newParams.query) params.set('q', newParams.query);
      else params.delete('q');
    }
    if (newParams.channelName !== undefined) {
      if (newParams.channelName) params.set('channel', newParams.channelName);
      else params.delete('channel');
    }
    if (newParams.startDate !== undefined) {
      if (newParams.startDate) params.set('start', newParams.startDate);
      else params.delete('start');
    }
    if (newParams.endDate !== undefined) {
      if (newParams.endDate) params.set('end', newParams.endDate);
      else params.delete('end');
    }
    if (newParams.duration !== undefined) {
      if (newParams.duration) params.set('duration', newParams.duration);
      else params.delete('duration');
    }
    if (newParams.language !== undefined) {
      if (newParams.language) params.set('lang', newParams.language);
      else params.delete('lang');
    }
    if (newParams.order !== undefined) {
      params.set('order', newParams.order);
    }
    if (newParams.maxResults !== undefined) {
      params.set('max', String(newParams.maxResults));
    }

    router.push(`${pathname}?${params.toString()}`);
  }, [searchParams, router, pathname]);

  // Clear all search params
  const clearSearchParams = useCallback(() => {
    router.push(pathname);
  }, [router, pathname]);

  return {
    searchParams: currentParams,
    updateSearchParams,
    clearSearchParams,
  };
}

