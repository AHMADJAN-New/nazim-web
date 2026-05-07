import type { SqliteDatabase } from '../db/database';
import type { SyncOutboxItem, OutboxOperation, TenantScope } from '../api/types';
import { listLimit, listOffset, nowIso, requireScope, uuid } from './repoUtils';

export interface EnqueueOutboxInput extends TenantScope {
  entity_table: string;
  entity_id: string;
  operation: OutboxOperation;
  payload: unknown;
}

export class OutboxRepo {
  constructor(private readonly db: SqliteDatabase) {}

  enqueue(input: EnqueueOutboxInput): SyncOutboxItem {
    const scope = requireScope(input);
    const item: SyncOutboxItem = {
      id: uuid(),
      organization_id: scope.organization_id,
      school_id: scope.school_id,
      entity_table: input.entity_table,
      entity_id: input.entity_id,
      operation: input.operation,
      payload_json: JSON.stringify(input.payload),
      status: 'pending',
      attempt_count: 0,
      last_error: null,
      created_at: nowIso(),
      updated_at: nowIso(),
      synced_at: null,
    };

    this.db
      .prepare(
        `INSERT INTO sync_outbox (
          id, organization_id, school_id, entity_table, entity_id, operation,
          payload_json, status, attempt_count, last_error, created_at, updated_at, synced_at
        ) VALUES (
          @id, @organization_id, @school_id, @entity_table, @entity_id, @operation,
          @payload_json, @status, @attempt_count, @last_error, @created_at, @updated_at, @synced_at
        )`,
      )
      .run(item);

    return item;
  }

  list(payload: Partial<TenantScope> & { status?: string; limit?: number; offset?: number } = {}): SyncOutboxItem[] {
    const where: string[] = [];
    const params: Record<string, unknown> = {
      limit: listLimit(payload),
      offset: listOffset(payload),
    };

    if (payload.organization_id) {
      where.push('organization_id = @organization_id');
      params.organization_id = payload.organization_id;
    }
    if (payload.school_id) {
      where.push('school_id = @school_id');
      params.school_id = payload.school_id;
    }
    if (payload.status) {
      where.push('status = @status');
      params.status = payload.status;
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    return this.db
      .prepare(`SELECT * FROM sync_outbox ${whereSql} ORDER BY created_at ASC LIMIT @limit OFFSET @offset`)
      .all(params) as SyncOutboxItem[];
  }

  counts(): { pending: number; failed: number } {
    const rows = this.db
      .prepare("SELECT status, COUNT(*) as count FROM sync_outbox WHERE status IN ('pending', 'failed') GROUP BY status")
      .all() as Array<{ status: string; count: number }>;

    return {
      pending: rows.find((row) => row.status === 'pending')?.count ?? 0,
      failed: rows.find((row) => row.status === 'failed')?.count ?? 0,
    };
  }
}
