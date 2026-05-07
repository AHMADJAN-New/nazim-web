export const CHANNELS = {
  // ---- Desktop shell / status (used by preload bridge) ----
  offlineModeGet: 'nazim:offline-mode:get',
  offlineModeSet: 'nazim:offline-mode:set',
  syncStatusGet: 'nazim:sync-status:get',
  syncStatusChanged: 'nazim:sync-status:changed',

  // ---- Frontend adapter-compatible channels (canonical) ----
  // Students
  studentsList: 'nazim.students.list',
  studentsGet: 'nazim.students.get',

  // Classes
  classesList: 'nazim.classes.list',
  classesGet: 'nazim.classes.get',

  // Attendance round names
  attendanceRoundNamesList: 'nazim.attendanceRoundNames.list',

  // Attendance sessions + records
  attendanceSessionsList: 'nazim.attendanceSessions.list',
  attendanceSessionsGet: 'nazim.attendanceSessions.get',
  attendanceSessionsCreate: 'nazim.attendanceSessions.create',
  attendanceSessionsUpdate: 'nazim.attendanceSessions.update',
  attendanceSessionsDelete: 'nazim.attendanceSessions.delete',
  attendanceSessionsRoster: 'nazim.attendanceSessions.roster',
  attendanceSessionsMarkRecords: 'nazim.attendanceSessions.markRecords',
  attendanceSessionsScan: 'nazim.attendanceSessions.scan',
  attendanceSessionsScanFeed: 'nazim.attendanceSessions.scanFeed',
  attendanceSessionsClose: 'nazim.attendanceSessions.close',

  // ---- Legacy generic channels (kept for internal tools / scripts) ----
  rosterRead: 'nazim:roster:read',
  studentUpsert: 'nazim:students:upsert',
  classesRead: 'nazim:classes:read',
  classUpsert: 'nazim:classes:upsert',
  sessionsRead: 'nazim:sessions:read',
  sessionUpsert: 'nazim:sessions:upsert',
  recordsRead: 'nazim:records:read',
  recordUpsert: 'nazim:records:upsert',
  outboxRead: 'nazim:outbox:read',
} as const;

export type DesktopChannel = (typeof CHANNELS)[keyof typeof CHANNELS];

export const INVOKABLE_CHANNELS = [
  CHANNELS.offlineModeGet,
  CHANNELS.offlineModeSet,
  CHANNELS.syncStatusGet,
  CHANNELS.studentsList,
  CHANNELS.studentsGet,
  CHANNELS.classesList,
  CHANNELS.classesGet,
  CHANNELS.attendanceRoundNamesList,
  CHANNELS.attendanceSessionsList,
  CHANNELS.attendanceSessionsGet,
  CHANNELS.attendanceSessionsCreate,
  CHANNELS.attendanceSessionsUpdate,
  CHANNELS.attendanceSessionsDelete,
  CHANNELS.attendanceSessionsRoster,
  CHANNELS.attendanceSessionsMarkRecords,
  CHANNELS.attendanceSessionsScan,
  CHANNELS.attendanceSessionsScanFeed,
  CHANNELS.attendanceSessionsClose,
  CHANNELS.rosterRead,
  CHANNELS.studentUpsert,
  CHANNELS.classesRead,
  CHANNELS.classUpsert,
  CHANNELS.sessionsRead,
  CHANNELS.sessionUpsert,
  CHANNELS.recordsRead,
  CHANNELS.recordUpsert,
  CHANNELS.outboxRead,
] as const satisfies readonly DesktopChannel[];

export const isInvokableChannel = (channel: string): channel is DesktopChannel =>
  (INVOKABLE_CHANNELS as readonly string[]).includes(channel);
