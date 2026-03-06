# Permissions Reference

## Common Permission Names

| Resource | Read | Create | Update | Delete | Other |
|----------|------|--------|--------|--------|-------|
| settings | settings.read | — | — | — | — |
| backup | backup.read | — | — | — | — |
| buildings | buildings.read | buildings.create | buildings.update | buildings.delete | — |
| classes | classes.read | classes.create | classes.update | classes.delete | classes.assign, classes.copy |
| subjects | subjects.read | subjects.create | subjects.update | subjects.delete | — |
| timetables | timetables.read | — | — | — | timetables.export |
| schedule_slots | schedule_slots.read | schedule_slots.create | schedule_slots.update | schedule_slots.delete | — |
| teacher_subject_assignments | teacher_subject_assignments.read | — | — | — | — |
| exams | exams.read | exams.create | exams.update | exams.delete | — |
| students | students.read | students.create | students.update | students.delete | — |
| staff | staff.read | staff.create | staff.update | staff.delete | — |

Format: `{resource}.{action}`. No `academic.` or other prefix.

## Platform Admin (Different)

- Platform admin uses **global** permission `subscription.admin` (organization_id = NULL)
- Use `usePlatformAdminPermissions()` and `platformApi` in platform app — see [nazim-platform-admin](.cursor/skills/nazim-platform-admin/SKILL.md)
