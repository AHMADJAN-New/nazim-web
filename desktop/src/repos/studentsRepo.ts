import type { StudentRecord, ScopedListPayload } from '../api/types';
import type { SqliteDatabase } from '../db/database';
import { listLimit, listOffset, nowIso, requireScope, uuid } from './repoUtils';
import { OutboxRepo } from './outboxRepo';

export class StudentsRepo {
  constructor(
    private readonly db: SqliteDatabase,
    private readonly outbox: OutboxRepo,
  ) {}

  list(payload: ScopedListPayload = {}): StudentRecord[] {
    const scope = requireScope(payload);
    return this.db
      .prepare(
        `SELECT * FROM students
         WHERE organization_id = @organization_id
           AND school_id = @school_id
           AND deleted_at IS NULL
         ORDER BY last_name, first_name
         LIMIT @limit OFFSET @offset`,
      )
      .all({ ...scope, limit: listLimit(payload), offset: listOffset(payload) }) as StudentRecord[];
  }

  getById(id: string): StudentRecord | null {
    const row = this.db.prepare('SELECT * FROM students WHERE id = ? AND deleted_at IS NULL').get(id) as StudentRecord | undefined;
    return row ?? null;
  }

  upsert(input: Partial<StudentRecord> & Pick<StudentRecord, 'organization_id' | 'school_id' | 'first_name' | 'last_name'>): StudentRecord {
    const scope = requireScope(input);
    const record: StudentRecord = {
      id: input.id || uuid(),
      organization_id: scope.organization_id,
      school_id: scope.school_id,
      first_name: input.first_name,
      last_name: input.last_name,
      admission_number: input.admission_number ?? null,
      class_id: input.class_id ?? null,
      status: input.status ?? 'active',
      updated_at: nowIso(),
      deleted_at: input.deleted_at ?? null,
    };

    const existing = this.db.prepare('SELECT id FROM students WHERE id = ?').get(record.id);
    this.db
      .prepare(
        `INSERT INTO students (
          id, organization_id, school_id, first_name, last_name, admission_number,
          class_id, status, updated_at, deleted_at
        ) VALUES (
          @id, @organization_id, @school_id, @first_name, @last_name, @admission_number,
          @class_id, @status, @updated_at, @deleted_at
        )
        ON CONFLICT(id) DO UPDATE SET
          organization_id = excluded.organization_id,
          school_id = excluded.school_id,
          first_name = excluded.first_name,
          last_name = excluded.last_name,
          admission_number = excluded.admission_number,
          class_id = excluded.class_id,
          status = excluded.status,
          updated_at = excluded.updated_at,
          deleted_at = excluded.deleted_at`,
      )
      .run(record);

    this.outbox.enqueue({
      organization_id: record.organization_id,
      school_id: record.school_id,
      entity_table: 'students',
      entity_id: record.id,
      operation: existing ? 'update' : 'create',
      payload: record,
    });

    return record;
  }
}
