export const DESKTOP_IPC_CHANNELS = {
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
} as const;

export type DesktopIpcChannel = (typeof DESKTOP_IPC_CHANNELS)[keyof typeof DESKTOP_IPC_CHANNELS];

