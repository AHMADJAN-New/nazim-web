import { randomUUID } from 'node:crypto';
import type { ScopedListPayload, TenantScope } from '../api/types';

export const nowIso = (): string => new Date().toISOString();

export const uuid = (): string => randomUUID();

export const requireScope = (payload: Partial<TenantScope>): TenantScope => {
  if (!payload.organization_id || !payload.school_id) {
    throw new Error('organization_id and school_id are required');
  }
  return {
    organization_id: payload.organization_id,
    school_id: payload.school_id,
  };
};

export const listLimit = (payload: ScopedListPayload = {}): number => {
  const limit = Number(payload.limit ?? 100);
  return Number.isInteger(limit) && limit > 0 && limit <= 500 ? limit : 100;
};

export const listOffset = (payload: ScopedListPayload = {}): number => {
  const offset = Number(payload.offset ?? 0);
  return Number.isInteger(offset) && offset > 0 ? offset : 0;
};
