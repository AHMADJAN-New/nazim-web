import type { OfflineRecord, ScopedListPayload } from '../api/types';
import type { SqliteDatabase } from '../db/database';
import { listLimit, listOffset, nowIso, requireScope, uuid } from './repoUtils';
import { OutboxRepo } from './outboxRepo';

type RecordRow = Omit<OfflineRecord, 'metadata'> & { metadata_json: string };

const fromRow = (row: RecordRow): OfflineRecord => ({
  id: row.id,
  organization_id: row.organization_id,
  school_id: row.school_id,
  student_id: row.student_id,
  session_id: row.session_id,
  record_type: row.record_type,
  value: row.value,
  metadata: JSON.parse(row.metadata_json || '{}') as Record<string, unknown>,
  updated_at: row.updated_at,
  deleted_at: row.deleted_at,
});

export class RecordsRepo {
  constructor(
    private readonly db: SqliteDatabase,
    private readonly outbox: OutboxRepo,
  ) {}

  list(payload: ScopedListPayload & { student_id?: string; session_id?: string } = {}): OfflineRecord[] {
    const scope = requireScope(payload);
    const filters: string[] = [];
    if (payload.student_id) filters.push('student_id = @student_id');
    if (payload.session_id) filters.push('session_id = @session_id');
    const filterSql = filters.length ? `AND ${filters.join(' AND ')}` : '';

    const rows = this.db
      .prepare(
        `SELECT * FROM records
         WHERE organization_id = @organization_id
           AND school_id = @school_id
           AND deleted_at IS NULL
           ${filterSql}
         ORDER BY updated_at DESC
         LIMIT @limit OFFSET @offset`,
      )
      .all({
        ...scope,
        student_id: payload.student_id,
        session_id: payload.session_id,
        limit: listLimit(payload),
        offset: listOffset(payload),
      }) as RecordRow[];

    return rows.map(fromRow);
  }

  listBySessionId(sessionId: string): OfflineRecord[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM records
         WHERE session_id = ?
           AND deleted_at IS NULL
         ORDER BY updated_at DESC`,
      )
      .all(sessionId) as RecordRow[];
    return rows.map(fromRow);
  }

  upsert(input: Partial<OfflineRecord> & Pick<OfflineRecord, 'organization_id' | 'school_id' | 'student_id' | 'session_id' | 'record_type' | 'value'>): OfflineRecord {
    const scope = requireScope(input);
    const record: OfflineRecord = {
      id: input.id || uuid(),
      organization_id: scope.organization_id,
      school_id: scope.school_id,
      student_id: input.student_id,
      session_id: input.session_id,
      record_type: input.record_type,
      value: input.value,
      metadata: input.metadata ?? {},
      updated_at: nowIso(),
      deleted_at: input.deleted_at ?? null,
    };
    const row = {
      ...record,
      metadata_json: JSON.stringify(record.metadata ?? {}),
    };
    const existing = this.db.prepare('SELECT id FROM records WHERE id = ?').get(record.id);

    this.db
      .prepare(
        `INSERT INTO records (
          id, organization_id, school_id, student_id, session_id, record_type, value, metadata_json, updated_at, deleted_at
        ) VALUES (
          @id, @organization_id, @school_id, @student_id, @session_id, @record_type, @value, @metadata_json, @updated_at, @deleted_at
        )
        ON CONFLICT(id) DO UPDATE SET
          organization_id = excluded.organization_id,
          school_id = excluded.school_id,
          student_id = excluded.student_id,
          session_id = excluded.session_id,
          record_type = excluded.record_type,
          value = excluded.value,
          metadata_json = excluded.metadata_json,
          updated_at = excluded.updated_at,
          deleted_at = excluded.deleted_at`,
      )
      .run(row);

    this.outbox.enqueue({
      organization_id: record.organization_id,
      school_id: record.school_id,
      entity_table: 'records',
      entity_id: record.id,
      operation: existing ? 'update' : 'create',
      payload: record,
    });

    return record;
  }
}
