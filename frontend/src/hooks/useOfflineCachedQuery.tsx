import {
  useQuery,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { getOfflineBridge } from '@/lib/electron-offline';

// Tier B read-only cache wrapper: same ergonomics as useQuery, but
// successful responses are mirrored into the desktop SQLite cache and
// — when the network call fails offline — the cached body is loaded
// back so the renderer keeps showing data instead of an error.
//
// In a regular browser tab (no Electron bridge) this falls through to
// vanilla useQuery; the cache layer is a desktop-only feature.

type Options<TData, TError> = UseQueryOptions<TData, TError> & {
  // Stable string the cache row is keyed on. Two queries with the same
  // logical inputs MUST produce the same cacheKey or the user will see
  // stale data after filter changes. Conventional choice: JSON-stringify
  // the TanStack queryKey.
  cacheKey: string;
  // Coarse module label so we can `cacheEvict('students.list')` on logout
  // or when a write invalidates a whole module.
  cacheKind: string;
};

export function useOfflineCachedQuery<
  TData = unknown,
  TError = Error,
>(options: Options<TData, TError>): UseQueryResult<TData, TError> & {
  isFromCache: boolean;
  cachedAt: string | null;
} {
  const { cacheKey, cacheKind, queryFn, ...rest } = options;

  // Wrapper queryFn: tries the user-supplied queryFn, persists on
  // success, falls back to the offline cache on failure.
  const wrappedQueryFn: typeof queryFn = async (ctx) => {
    if (typeof queryFn !== 'function') {
      throw new Error('useOfflineCachedQuery requires a queryFn');
    }
    const bridge = getOfflineBridge();

    try {
      const data = await queryFn(ctx);
      if (bridge && data !== undefined) {
        // Fire-and-forget; if the cache write fails we still want the
        // user to see their data.
        bridge.cachePut(cacheKey, cacheKind, data).catch(() => {});
      }
      return data;
    } catch (err) {
      if (!bridge) throw err;
      const cached = await bridge.cacheGet(cacheKey).catch(() => null);
      if (cached && cached.body !== undefined) {
        // Stash the cached_at on the query for the UI to read via the
        // hook return value below.
        cachedMetaRef.current = { key: cacheKey, cached_at: cached.cached_at };
        return cached.body as TData;
      }
      throw err;
    }
  };

  // We carry the cached_at out-of-band because TanStack Query's data is
  // strongly typed and we don't want to pollute it. Keyed on cacheKey so
  // we don't leak across hooks.
  const cachedMetaRef = useRef<{ key: string; cached_at: string } | null>(null);
  const [, forceRender] = useState(0);

  const result = useQuery<TData, TError>({
    ...rest,
    queryFn: wrappedQueryFn,
  });

  useEffect(() => {
    // When the query succeeds via the network path, clear the
    // "from cache" marker so the indicator turns off.
    if (result.isSuccess && !result.isFetching) {
      const meta = cachedMetaRef.current;
      if (meta && meta.key === cacheKey && !result.isError) {
        // The wrappedQueryFn writes a fresh cache entry on success, so
        // any previous "from cache" state is now stale.
        cachedMetaRef.current = null;
        forceRender((n) => n + 1);
      }
    }
  }, [result.isSuccess, result.isFetching, result.isError, cacheKey]);

  const isFromCache =
    cachedMetaRef.current?.key === cacheKey && !result.isFetching;
  const cachedAt = isFromCache ? (cachedMetaRef.current?.cached_at ?? null) : null;

  return Object.assign(result, { isFromCache, cachedAt });
}
