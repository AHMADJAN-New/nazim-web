import type { ScopedListPayload, SessionRecord } from '../api/types';
import type { SqliteDatabase } from '../db/database';
import { listLimit, listOffset, nowIso, requireScope, uuid } from './repoUtils';
import { OutboxRepo } from './outboxRepo';

export class SessionsRepo {
  constructor(
    private readonly db: SqliteDatabase,
    private readonly outbox: OutboxRepo,
  ) {}

  list(payload: ScopedListPayload & { class_id?: string } = {}): SessionRecord[] {
    const scope = requireScope(payload);
    const classFilter = payload.class_id ? 'AND class_id = @class_id' : '';
    return this.db
      .prepare(
        `SELECT * FROM sessions
         WHERE organization_id = @organization_id
           AND school_id = @school_id
           AND deleted_at IS NULL
           ${classFilter}
         ORDER BY session_date DESC
         LIMIT @limit OFFSET @offset`,
      )
      .all({ ...scope, class_id: payload.class_id, limit: listLimit(payload), offset: listOffset(payload) }) as SessionRecord[];
  }

  getById(id: string): SessionRecord | null {
    const row = this.db.prepare('SELECT * FROM sessions WHERE id = ? AND deleted_at IS NULL').get(id) as SessionRecord | undefined;
    return row ?? null;
  }

  upsert(input: Partial<SessionRecord> & Pick<SessionRecord, 'organization_id' | 'school_id' | 'class_id' | 'session_date'>): SessionRecord {
    const scope = requireScope(input);
    const record: SessionRecord = {
      id: input.id || uuid(),
      organization_id: scope.organization_id,
      school_id: scope.school_id,
      class_id: input.class_id,
      session_date: input.session_date,
      starts_at: input.starts_at ?? null,
      ends_at: input.ends_at ?? null,
      status: input.status ?? 'open',
      updated_at: nowIso(),
      deleted_at: input.deleted_at ?? null,
    };
    const existing = this.db.prepare('SELECT id FROM sessions WHERE id = ?').get(record.id);

    this.db
      .prepare(
        `INSERT INTO sessions (
          id, organization_id, school_id, class_id, session_date, starts_at, ends_at, status, updated_at, deleted_at
        ) VALUES (
          @id, @organization_id, @school_id, @class_id, @session_date, @starts_at, @ends_at, @status, @updated_at, @deleted_at
        )
        ON CONFLICT(id) DO UPDATE SET
          organization_id = excluded.organization_id,
          school_id = excluded.school_id,
          class_id = excluded.class_id,
          session_date = excluded.session_date,
          starts_at = excluded.starts_at,
          ends_at = excluded.ends_at,
          status = excluded.status,
          updated_at = excluded.updated_at,
          deleted_at = excluded.deleted_at`,
      )
      .run(record);

    this.outbox.enqueue({
      organization_id: record.organization_id,
      school_id: record.school_id,
      entity_table: 'sessions',
      entity_id: record.id,
      operation: existing ? 'update' : 'create',
      payload: record,
    });

    return record;
  }
}
