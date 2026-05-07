import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { openDatabase } from '../src/db/database';
import { createRepositories } from '../src/repos/repositorySet';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nazim-desktop-db-'));
const dbPath = path.join(tempDir, 'school.db');
const db = openDatabase({ dbPath });
const repos = createRepositories(db);

const organizationId = randomUUID();
const schoolId = randomUUID();
const classId = randomUUID();

db.prepare('INSERT INTO organizations (id, name) VALUES (?, ?)').run(organizationId, 'Smoke Test Org');
db.prepare('INSERT INTO schools (id, organization_id, name) VALUES (?, ?, ?)').run(schoolId, organizationId, 'Smoke Test School');
db.prepare(
  'INSERT INTO classes (id, organization_id, school_id, name, code) VALUES (?, ?, ?, ?, ?)',
).run(classId, organizationId, schoolId, 'Grade 1', 'G1');

const student = repos.students.upsert({
  organization_id: organizationId,
  school_id: schoolId,
  class_id: classId,
  first_name: 'Fake',
  last_name: 'Student',
  admission_number: 'SMOKE-001',
});

repos.outbox.enqueue({
  organization_id: organizationId,
  school_id: schoolId,
  entity_table: 'students',
  entity_id: student.id,
  operation: 'update',
  payload: { id: student.id, smoke: true },
});

const roster = repos.students.list({ organization_id: organizationId, school_id: schoolId });
const outbox = repos.outbox.list({ organization_id: organizationId, school_id: schoolId });

if (roster.length !== 1) {
  throw new Error(`Expected 1 student, received ${roster.length}`);
}

if (outbox.length !== 2) {
  throw new Error(`Expected 2 outbox rows, received ${outbox.length}`);
}

console.log(
  JSON.stringify(
    {
      dbPath,
      student: roster[0],
      outboxCount: outbox.length,
      firstOutbox: outbox[0],
    },
    null,
    2,
  ),
);

db.close();
