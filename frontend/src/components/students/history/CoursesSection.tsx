import { Award, CheckCircle, Clock, XCircle, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLanguage } from '@/hooks/useLanguage';
import { formatDate } from '@/lib/utils';
import type { CourseHistory, CourseCompletionStatus } from '@/types/domain/studentHistory';

interface CoursesSectionProps {
  courses: CourseHistory;
}

function getStatusBadgeVariant(status: CourseCompletionStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'completed':
      return 'default';
    case 'enrolled':
      return 'secondary';
    case 'dropped':
    case 'failed':
      return 'destructive';
    default:
      return 'outline';
  }
}

function getStatusIcon(status: CourseCompletionStatus) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'enrolled':
      return <Clock className="h-4 w-4 text-blue-600" />;
    case 'dropped':
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-600" />;
    default:
      return <Clock className="h-4 w-4 text-gray-600" />;
  }
}

export function CoursesSection({ courses }: CoursesSectionProps) {
  const { t } = useLanguage();
  const { summary, courses: courseList } = courses;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        <StatsCard
          title={t('studentHistory.totalCourses') || 'Total Courses'}
          value={summary.totalCourses}
          icon={Award}
          color="purple"
        />
        <StatsCard
          title={t('studentHistory.completed') || 'Completed'}
          value={summary.completedCourses}
          icon={CheckCircle}
          color="green"
        />
        <StatsCard
          title={t('studentHistory.enrolled') || 'Enrolled'}
          value={summary.enrolledCourses}
          icon={Clock}
          color="blue"
        />
        <StatsCard
          title={t('studentHistory.dropped') || 'Dropped'}
          value={summary.droppedCourses}
          icon={XCircle}
          color="red"
        />
        <StatsCard
          title={t('studentHistory.certificates') || 'Certificates'}
          value={summary.certificatesIssued}
          icon={FileText}
          color="amber"
        />
      </div>

      {/* Completion Rate */}
      {summary.totalCourses > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('studentHistory.completionRate') || 'Completion Rate'}</span>
                <span className="font-medium">{summary.completionRate}%</span>
              </div>
              <Progress value={summary.completionRate} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{summary.completedCourses} {t('studentHistory.completed') || 'completed'}</span>
                <span>{summary.totalCourses} {t('studentHistory.total') || 'total'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Course List */}
      {courseList.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('studentHistory.courseHistory') || 'Course History'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('studentHistory.courseName') || 'Course Name'}</TableHead>
                    <TableHead>{t('studentHistory.registrationDate') || 'Registration'}</TableHead>
                    <TableHead>{t('studentHistory.status') || 'Status'}</TableHead>
                    <TableHead>{t('studentHistory.grade') || 'Grade'}</TableHead>
                    <TableHead>{t('studentHistory.certificate') || 'Certificate'}</TableHead>
                    <TableHead>{t('studentHistory.fee') || 'Fee'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courseList.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{course.course?.name || '-'}</p>
                          {course.course?.code && (
                            <p className="text-xs text-muted-foreground">{course.course.code}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {course.registrationDate ? formatDate(course.registrationDate) : '-'}
                        {course.completionDate && (
                          <p className="text-xs text-muted-foreground">
                            {t('studentHistory.completedOn') || 'Completed'}: {formatDate(course.completionDate)}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(course.completionStatus)}
                          <Badge variant={getStatusBadgeVariant(course.completionStatus)}>
                            {course.completionStatus}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {course.grade ? (
                          <Badge variant="outline">{course.grade}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {course.certificateIssued ? (
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-amber-600" />
                            <div>
                              <Badge variant="default">{t('studentHistory.issued') || 'Issued'}</Badge>
                              {course.certificateNumber && (
                                <p className="text-xs text-muted-foreground mt-1">#{course.certificateNumber}</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {course.feePaid ? (
                          <Badge variant="default">{t('studentHistory.paid') || 'Paid'}</Badge>
                        ) : (
                          <Badge variant="outline">{t('studentHistory.unpaid') || 'Unpaid'}</Badge>
                        )}
                        {course.feeAmount > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">{course.feeAmount.toLocaleString()}</p>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t('studentHistory.noCourseRecords') || 'No course records found'}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

