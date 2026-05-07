import type { AttendanceRoundNameRecord, ScopedListPayload } from '../api/types';
import type { SqliteDatabase } from '../db/database';
import { listLimit, listOffset, nowIso, requireScope, uuid } from './repoUtils';
import { OutboxRepo } from './outboxRepo';

type RoundNameRow = Omit<AttendanceRoundNameRecord, 'is_active'> & { is_active: number };

const fromRow = (row: RoundNameRow): AttendanceRoundNameRecord => ({
  id: row.id,
  organization_id: row.organization_id,
  school_id: row.school_id,
  name: row.name,
  order_index: row.order_index,
  is_active: row.is_active === 1,
  created_at: row.created_at,
  updated_at: row.updated_at,
  deleted_at: row.deleted_at,
});

export class RoundNamesRepo {
  constructor(
    private readonly db: SqliteDatabase,
    private readonly outbox: OutboxRepo,
  ) {}

  list(payload: ScopedListPayload = {}): AttendanceRoundNameRecord[] {
    const scope = requireScope(payload);
    const rows = this.db
      .prepare(
        `SELECT * FROM attendance_round_names
         WHERE organization_id = @organization_id
           AND school_id = @school_id
           AND deleted_at IS NULL
         ORDER BY order_index, name
         LIMIT @limit OFFSET @offset`,
      )
      .all({ ...scope, limit: listLimit(payload), offset: listOffset(payload) }) as RoundNameRow[];

    return rows.map(fromRow);
  }

  getById(id: string): AttendanceRoundNameRecord | null {
    const row = this.db
      .prepare('SELECT * FROM attendance_round_names WHERE id = ? AND deleted_at IS NULL')
      .get(id) as RoundNameRow | undefined;
    return row ? fromRow(row) : null;
  }

  upsert(
    input: Partial<AttendanceRoundNameRecord> &
      Pick<AttendanceRoundNameRecord, 'organization_id' | 'school_id' | 'name' | 'order_index'>,
  ): AttendanceRoundNameRecord {
    const scope = requireScope(input);
    const record: AttendanceRoundNameRecord = {
      id: input.id || uuid(),
      organization_id: scope.organization_id,
      school_id: scope.school_id,
      name: input.name,
      order_index: input.order_index,
      is_active: input.is_active ?? true,
      created_at: input.created_at ?? nowIso(),
      updated_at: nowIso(),
      deleted_at: input.deleted_at ?? null,
    };

    const existing = this.db.prepare('SELECT id FROM attendance_round_names WHERE id = ?').get(record.id);
    this.db
      .prepare(
        `INSERT INTO attendance_round_names (
          id, organization_id, school_id, name, order_index, is_active, created_at, updated_at, deleted_at
        ) VALUES (
          @id, @organization_id, @school_id, @name, @order_index, @is_active, @created_at, @updated_at, @deleted_at
        )
        ON CONFLICT(id) DO UPDATE SET
          organization_id = excluded.organization_id,
          school_id = excluded.school_id,
          name = excluded.name,
          order_index = excluded.order_index,
          is_active = excluded.is_active,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at,
          deleted_at = excluded.deleted_at`,
      )
      .run({ ...record, is_active: record.is_active ? 1 : 0 });

    this.outbox.enqueue({
      organization_id: record.organization_id,
      school_id: record.school_id,
      entity_table: 'attendance_round_names',
      entity_id: record.id,
      operation: existing ? 'update' : 'create',
      payload: record,
    });

    return record;
  }
}

