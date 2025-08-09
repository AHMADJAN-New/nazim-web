import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTeacherPortal } from '@/hooks/useTeacherPortal';

export default function TeacherClassesPage() {
  const { data } = useTeacherPortal();

  const scheduleMap = Object.fromEntries(
    (data?.schedule || []).map((s) => [s.class_id, s])
  );
  const attendanceMap = Object.fromEntries(
    (data?.classPerformance || []).map((c) => [c.classId, c.attendance])
  );
  const formatTime = (t: string) =>
    new Date(`1970-01-01T${t}`).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });

  return (
    <MainLayout title="Teacher Portal — Classes">
      <div className="space-y-6">
        <header className="bg-gradient-hero p-6 rounded-lg text-primary-foreground">
          <h1 className="text-2xl font-bold">My Classes</h1>
          <p className="text-primary-foreground/80">Quick overview of your assigned classes</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data?.teacherInfo.classes.map((c) => {
            const sched = scheduleMap[c.id];
            const time = sched
              ? `${formatTime(sched.start_time)} - ${formatTime(sched.end_time)}`
              : 'N/A';
            const attendance = attendanceMap[c.id] ?? 0;
            return (
              <Card key={c.id}>
                <CardHeader>
                  <CardTitle>{c.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Time: {time}</p>
                  <p className="text-sm text-muted-foreground">Attendance: {attendance.toFixed(1)}%</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
}
