import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// We import the module fresh in each test so the module-scoped state
// (optimistic-id set, resolved-listeners) starts clean.
const importFresh = async () => {
  vi.resetModules();
  return import('@/lib/electron-offline');
};

type Bridge = {
  enqueue: ReturnType<typeof vi.fn>;
  cachePut: ReturnType<typeof vi.fn>;
  cacheGet: ReturnType<typeof vi.fn>;
  cacheEvict: ReturnType<typeof vi.fn>;
  onResolved: ReturnType<typeof vi.fn>;
};

function makeBridge(): { bridge: Bridge; emitResolved: (p: unknown) => void } {
  let resolvedHandler: ((p: unknown) => void) | null = null;
  const bridge: Bridge = {
    enqueue: vi.fn(async () => ({ inserted: true, client_uuid: 'uuid' })),
    cachePut: vi.fn(async () => ({ ok: true })),
    cacheGet: vi.fn(async () => null),
    cacheEvict: vi.fn(async () => ({ ok: true })),
    onResolved: vi.fn((handler: (p: unknown) => void) => {
      resolvedHandler = handler;
      return () => {
        resolvedHandler = null;
      };
    }),
  };
  return {
    bridge,
    emitResolved: (p) => {
      if (resolvedHandler) resolvedHandler(p);
    },
  };
}

function installBridge(b: Bridge | null): void {
  // window.electron is the contextBridge surface; install it onto the
  // jsdom window the tests run in.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).window = (globalThis as any).window ?? {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).window.electron = b ? { offline: b } : undefined;
}

describe('tryNetworkThenQueue', () => {
  beforeEach(() => {
    installBridge(null);
    // Wipe the sessionStorage shim so optimistic-ids state is clean.
    if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
  });

  afterEach(() => {
    installBridge(null);
  });

  it('returns the network response unchanged when fetch succeeds', async () => {
    const { bridge } = makeBridge();
    installBridge(bridge);
    const { tryNetworkThenQueue } = await importFresh();

    const result = await tryNetworkThenQueue<{ id: string }>({
      op: {
        client_uuid: 'op-1',
        kind: 'attendance.session.create',
        method: 'POST',
        endpoint: '/attendance-sessions',
        payload: {},
      },
      networkAttempt: async () => ({ id: 'server-1' }),
      optimisticResponse: () => ({ id: 'optimistic-1' }),
    });

    expect(result).toEqual({ id: 'server-1' });
    expect(bridge.enqueue).not.toHaveBeenCalled();
  });

  it('falls back to the queue and returns the optimistic response on a network error', async () => {
    const { bridge } = makeBridge();
    installBridge(bridge);
    const { tryNetworkThenQueue } = await importFresh();

    const result = await tryNetworkThenQueue<{ id: string }>({
      op: {
        client_uuid: 'op-2',
        kind: 'attendance.session.create',
        method: 'POST',
        endpoint: '/attendance-sessions',
        payload: { session_date: '2026-04-26' },
      },
      networkAttempt: async () => {
        // fetch() throws TypeError when offline — that's the canonical
        // signal the helper looks for.
        throw new TypeError('Failed to fetch');
      },
      optimisticResponse: () => ({ id: 'optimistic-2' }),
      trackOptimisticId: 'optimistic-2',
    });

    expect(result).toEqual({ id: 'optimistic-2' });
    expect(bridge.enqueue).toHaveBeenCalledTimes(1);
    expect(bridge.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        client_uuid: 'op-2',
        kind: 'attendance.session.create',
      }),
    );
  });

  it('falls through to the network when the bridge is absent (web app)', async () => {
    installBridge(null);
    const { tryNetworkThenQueue } = await importFresh();

    await expect(
      tryNetworkThenQueue<{ id: string }>({
        op: {
          client_uuid: 'op-3',
          kind: 'attendance.session.create',
          method: 'POST',
          endpoint: '/attendance-sessions',
          payload: {},
        },
        networkAttempt: async () => {
          throw new TypeError('Failed to fetch');
        },
        optimisticResponse: () => ({ id: 'optimistic-3' }),
      }),
    ).rejects.toThrow('Failed to fetch');
  });

  it('rethrows non-network errors instead of queuing them', async () => {
    const { bridge } = makeBridge();
    installBridge(bridge);
    const { tryNetworkThenQueue } = await importFresh();

    const validationError = Object.assign(new Error('invalid student_id'), { status: 422 });

    await expect(
      tryNetworkThenQueue<{ id: string }>({
        op: {
          client_uuid: 'op-4',
          kind: 'attendance.session.create',
          method: 'POST',
          endpoint: '/attendance-sessions',
          payload: {},
        },
        networkAttempt: async () => {
          throw validationError;
        },
        optimisticResponse: () => ({ id: 'optimistic-4' }),
      }),
    ).rejects.toThrow('invalid student_id');

    expect(bridge.enqueue).not.toHaveBeenCalled();
  });
});

describe('optimistic-id tracking', () => {
  beforeEach(() => {
    installBridge(null);
    if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
  });

  it('records and forgets ids on the optimistic set', async () => {
    const mod = await importFresh();
    expect(mod.isOptimisticId('id-a')).toBe(false);
    mod.markOptimisticId('id-a');
    expect(mod.isOptimisticId('id-a')).toBe(true);
    mod.forgetOptimisticId('id-a');
    expect(mod.isOptimisticId('id-a')).toBe(false);
  });

  it('drops the id from the optimistic set when the bridge resolves it', async () => {
    const { bridge, emitResolved } = makeBridge();
    installBridge(bridge);
    const { markOptimisticId, isOptimisticId, subscribeResolved } = await importFresh();

    markOptimisticId('client-1');
    expect(isOptimisticId('client-1')).toBe(true);

    const seen: unknown[] = [];
    subscribeResolved((p) => seen.push(p));

    emitResolved({
      client_uuid: 'client-1',
      kind: 'attendance.session.create',
      server_id: 'server-99',
      body: { id: 'server-99' },
    });

    expect(isOptimisticId('client-1')).toBe(false);
    expect(seen).toHaveLength(1);
  });
});

describe('evictOfflineCache', () => {
  beforeEach(() => {
    installBridge(null);
  });

  it('forwards each kind to the bridge', async () => {
    const { bridge } = makeBridge();
    installBridge(bridge);
    const { evictOfflineCache } = await importFresh();

    evictOfflineCache('students.list', 'leave.list');

    expect(bridge.cacheEvict).toHaveBeenCalledTimes(2);
    expect(bridge.cacheEvict).toHaveBeenNthCalledWith(1, 'students.list');
    expect(bridge.cacheEvict).toHaveBeenNthCalledWith(2, 'leave.list');
  });

  it('is a no-op in the web build (no bridge)', async () => {
    installBridge(null);
    const { evictOfflineCache } = await importFresh();
    expect(() => evictOfflineCache('students.list')).not.toThrow();
  });

  it('ignores empty kinds', async () => {
    const { bridge } = makeBridge();
    installBridge(bridge);
    const { evictOfflineCache } = await importFresh();
    evictOfflineCache('', 'students.list');
    expect(bridge.cacheEvict).toHaveBeenCalledTimes(1);
    expect(bridge.cacheEvict).toHaveBeenCalledWith('students.list');
  });
});
