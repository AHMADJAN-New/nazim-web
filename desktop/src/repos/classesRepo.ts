import type { ClassRecord, ScopedListPayload } from '../api/types';
import type { SqliteDatabase } from '../db/database';
import { listLimit, listOffset, nowIso, requireScope, uuid } from './repoUtils';
import { OutboxRepo } from './outboxRepo';

export class ClassesRepo {
  constructor(
    private readonly db: SqliteDatabase,
    private readonly outbox: OutboxRepo,
  ) {}

  list(payload: ScopedListPayload = {}): ClassRecord[] {
    const scope = requireScope(payload);
    return this.db
      .prepare(
        `SELECT * FROM classes
         WHERE organization_id = @organization_id
           AND school_id = @school_id
           AND deleted_at IS NULL
         ORDER BY name
         LIMIT @limit OFFSET @offset`,
      )
      .all({ ...scope, limit: listLimit(payload), offset: listOffset(payload) }) as ClassRecord[];
  }

  getById(id: string): ClassRecord | null {
    const row = this.db.prepare('SELECT * FROM classes WHERE id = ? AND deleted_at IS NULL').get(id) as ClassRecord | undefined;
    return row ?? null;
  }

  upsert(input: Partial<ClassRecord> & Pick<ClassRecord, 'organization_id' | 'school_id' | 'name'>): ClassRecord {
    const scope = requireScope(input);
    const record: ClassRecord = {
      id: input.id || uuid(),
      organization_id: scope.organization_id,
      school_id: scope.school_id,
      name: input.name,
      code: input.code ?? null,
      academic_year_id: input.academic_year_id ?? null,
      updated_at: nowIso(),
      deleted_at: input.deleted_at ?? null,
    };
    const existing = this.db.prepare('SELECT id FROM classes WHERE id = ?').get(record.id);

    this.db
      .prepare(
        `INSERT INTO classes (id, organization_id, school_id, name, code, academic_year_id, updated_at, deleted_at)
         VALUES (@id, @organization_id, @school_id, @name, @code, @academic_year_id, @updated_at, @deleted_at)
         ON CONFLICT(id) DO UPDATE SET
           organization_id = excluded.organization_id,
           school_id = excluded.school_id,
           name = excluded.name,
           code = excluded.code,
           academic_year_id = excluded.academic_year_id,
           updated_at = excluded.updated_at,
           deleted_at = excluded.deleted_at`,
      )
      .run(record);

    this.outbox.enqueue({
      organization_id: record.organization_id,
      school_id: record.school_id,
      entity_table: 'classes',
      entity_id: record.id,
      operation: existing ? 'update' : 'create',
      payload: record,
    });

    return record;
  }
}
