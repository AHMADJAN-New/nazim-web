---
type: community
members: 6
---

# Attendance 2

**Members:** 6 nodes

## Members
- [[attendanceMapper.ts]] - code - frontend\src\mappers\attendanceMapper.ts
- [[mapAttendanceRecordApiToDomain()]] - code - frontend\src\mappers\attendanceMapper.ts
- [[mapAttendanceRecordDomainToInsert()]] - code - frontend\src\mappers\attendanceMapper.ts
- [[mapAttendanceSessionApiToDomain()]] - code - frontend\src\mappers\attendanceMapper.ts
- [[mapAttendanceSessionDomainToInsert()]] - code - frontend\src\mappers\attendanceMapper.ts
- [[mapAttendanceSessionDomainToUpdate()]] - code - frontend\src\mappers\attendanceMapper.ts

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Attendance_2
SORT file.name ASC
```
