import type { SqliteDatabase } from '../db/database';
import { ClassesRepo } from './classesRepo';
import { OutboxRepo } from './outboxRepo';
import { RecordsRepo } from './recordsRepo';
import { RoundNamesRepo } from './roundNamesRepo';
import { SessionsRepo } from './sessionsRepo';
import { StudentsRepo } from './studentsRepo';

export interface RepositorySet {
  outbox: OutboxRepo;
  students: StudentsRepo;
  classes: ClassesRepo;
  roundNames: RoundNamesRepo;
  sessions: SessionsRepo;
  records: RecordsRepo;
}

export const createRepositories = (db: SqliteDatabase): RepositorySet => {
  const outbox = new OutboxRepo(db);
  return {
    outbox,
    students: new StudentsRepo(db, outbox),
    classes: new ClassesRepo(db, outbox),
    roundNames: new RoundNamesRepo(db, outbox),
    sessions: new SessionsRepo(db, outbox),
    records: new RecordsRepo(db, outbox),
  };
};
