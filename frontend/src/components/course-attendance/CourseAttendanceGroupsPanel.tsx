import { Pencil, Plus, Trash2, Users } from 'lucide-react';
import { useState } from 'react';

import { CourseAttendanceGroupDialog } from '@/components/course-attendance/CourseAttendanceGroupDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useCourseAttendanceGroups,
  useCourseRoster,
  useDeleteCourseAttendanceGroup,
  type CourseAttendanceGroup,
} from '@/hooks/useCourseAttendance';
import { useLanguage } from '@/hooks/useLanguage';
import { useHasPermission } from '@/hooks/usePermissions';

interface CourseAttendanceGroupsPanelProps {
  courseId: string;
}

export function CourseAttendanceGroupsPanel({ courseId }: CourseAttendanceGroupsPanelProps) {
  const { t } = useLanguage();
  const { data: groups = [], isLoading } = useCourseAttendanceGroups(courseId);
  const { data: roster = [] } = useCourseRoster(courseId);
  const deleteGroup = useDeleteCourseAttendanceGroup();
  const canCreate = useHasPermission('course_attendance.create') === true;
  const canUpdate = useHasPermission('course_attendance.update') === true;
  const canDelete = useHasPermission('course_attendance.delete') === true;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CourseAttendanceGroup | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<CourseAttendanceGroup | null>(null);

  const openCreate = () => {
    setEditingGroup(null);
    setDialogOpen(true);
  };

  const openEdit = (group: CourseAttendanceGroup) => {
    setEditingGroup(group);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!groupToDelete) return;
    try {
      await deleteGroup.mutateAsync(groupToDelete.id);
      setGroupToDelete(null);
    } catch {
      // The mutation hook already shows the error toast.
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-3">
          <div className="space-y-1">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <Users className="h-4 w-4 hidden md:inline" />
              {t('courses.attendance.groupsTitle')}
            </CardTitle>
            <CardDescription className="hidden md:block">
              {t('courses.attendance.groupsDescription')}
            </CardDescription>
          </div>
          {canCreate && (
            <Button size="sm" onClick={openCreate} className="flex-shrink-0 w-full sm:w-auto" aria-label={t('courses.attendance.addGroup')}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">{t('courses.attendance.addGroup')}</span>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : groups.length === 0 ? (
            <div className="space-y-1">
              <p className="text-sm font-medium">{t('courses.attendance.noGroupsYet')}</p>
              <p className="text-sm text-muted-foreground">{t('courses.attendance.noGroupsHint')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
              {groups.map((group) => (
                <div key={group.id} className="flex items-start justify-between gap-2 rounded-lg border p-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{group.name}</p>
                    {group.description && (
                      <p className="text-xs text-muted-foreground truncate">{group.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('courses.attendance.studentsSelected', { count: group.students_count })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {canUpdate && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        aria-label={t('courses.attendance.editGroup')}
                        onClick={() => openEdit(group)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        aria-label={t('courses.attendance.deleteGroup')}
                        onClick={() => setGroupToDelete(group)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CourseAttendanceGroupDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        courseId={courseId}
        group={editingGroup}
        students={roster}
      />

      <AlertDialog open={!!groupToDelete} onOpenChange={(open) => !open && setGroupToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('courses.attendance.deleteGroup')}</AlertDialogTitle>
            <AlertDialogDescription>{t('courses.attendance.deleteGroupConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteGroup.isPending}>
              {t('courses.attendance.deleteGroup')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
