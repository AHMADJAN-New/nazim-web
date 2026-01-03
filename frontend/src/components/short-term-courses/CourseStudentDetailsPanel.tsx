import {
  User,
  BookOpen,
  Calendar,
  MapPin,
  Phone,
  Award,
  GraduationCap,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  DollarSign,
  Users,
} from 'lucide-react';
import { useMemo } from 'react';

import { CourseStudentPictureCell } from './CourseStudentPictureCell';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCourseStudents } from '@/hooks/useCourseStudents';
import { useShortTermCourses } from '@/hooks/useShortTermCourses';
import { formatDate, formatDateTime } from '@/lib/utils';
import type { CourseStudent } from '@/types/domain/courseStudent';
import type { ShortTermCourse } from '@/types/domain/shortTermCourse';


interface CourseStudentDetailsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: CourseStudent | null;
}

const statusBadge: Record<string, string> = {
  enrolled: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200',
  dropped: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200',
  failed: 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-200',
};

const statusIcon: Record<string, typeof CheckCircle> = {
  enrolled: Clock,
  completed: CheckCircle,
  dropped: XCircle,
  failed: AlertCircle,
};

export function CourseStudentDetailsPanel({
  open,
  onOpenChange,
  student,
}: CourseStudentDetailsPanelProps) {
  // Get all students to find related courses
  const { data: allStudents } = useCourseStudents(undefined, false);
  const { data: courses } = useShortTermCourses();

  // Find all courses this student is enrolled in
  const studentCourses = useMemo(() => {
    if (!student || !allStudents || !courses) return [];
    
    return allStudents
      .filter(s => 
        s.id !== student.id && 
        (s.mainStudentId === student.mainStudentId || 
         (s.mainStudentId && student.mainStudentId && s.mainStudentId === student.mainStudentId) ||
         (s.fullName === student.fullName && s.fatherName === student.fatherName))
      )
      .map(s => {
        const course = courses.find(c => c.id === s.courseId);
        return course ? { course, enrollment: s } : null;
      })
      .filter(Boolean) as Array<{ course: ShortTermCourse; enrollment: CourseStudent }>;
  }, [student, allStudents, courses]);

  // Get current course
  const currentCourse = useMemo(() => {
    if (!student || !courses) return null;
    return courses.find(c => c.id === student.courseId) || null;
  }, [student, courses]);

  // Early return
  if (!student) return null;

  const StatusIcon = statusIcon[student.completionStatus] || Clock;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-4">
            <CourseStudentPictureCell student={student} size="lg" />
            <div>
              <SheetTitle className="text-2xl font-bold">{student.fullName}</SheetTitle>
              <SheetDescription>
                {student.admissionNo && `Admission #${student.admissionNo}`}
                {student.mainStudentId && ' • Linked to Main Student'}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="info" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">
              <User className="h-4 w-4 mr-2" />
              Student Info
            </TabsTrigger>
            <TabsTrigger value="courses">
              <BookOpen className="h-4 w-4 mr-2" />
              Courses ({studentCourses.length + 1})
            </TabsTrigger>
            <TabsTrigger value="history">
              <Clock className="h-4 w-4 mr-2" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Student Info Tab */}
          <TabsContent value="info" className="space-y-4 mt-4">
            {/* Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <StatusIcon className="h-5 w-5" />
                  Enrollment Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant="outline" className={statusBadge[student.completionStatus] || ''}>
                    {student.completionStatus}
                  </Badge>
                </div>
                {student.certificateIssued && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Certificate</span>
                    <Badge variant="outline" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200">
                      <Award className="h-3 w-3 mr-1" />
                      Issued
                    </Badge>
                  </div>
                )}
                {student.registrationDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Registration Date</span>
                    <span className="text-sm font-medium">
                      {formatDate(student.registrationDate)}
                    </span>
                  </div>
                )}
                {student.completionDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Completion Date</span>
                    <span className="text-sm font-medium">
                      {formatDate(student.completionDate)}
                    </span>
                  </div>
                )}
                {student.grade && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Grade</span>
                    <span className="text-sm font-medium">{student.grade}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Full Name</p>
                    <p className="text-sm font-medium">{student.fullName || '-'}</p>
                  </div>
                  {student.fatherName && (
                    <div>
                      <p className="text-sm text-muted-foreground">Father Name</p>
                      <p className="text-sm font-medium">{student.fatherName}</p>
                    </div>
                  )}
                  {student.grandfatherName && (
                    <div>
                      <p className="text-sm text-muted-foreground">Grandfather Name</p>
                      <p className="text-sm font-medium">{student.grandfatherName}</p>
                    </div>
                  )}
                  {student.motherName && (
                    <div>
                      <p className="text-sm text-muted-foreground">Mother Name</p>
                      <p className="text-sm font-medium">{student.motherName}</p>
                    </div>
                  )}
                  {student.gender && (
                    <div>
                      <p className="text-sm text-muted-foreground">Gender</p>
                      <p className="text-sm font-medium capitalize">{student.gender}</p>
                    </div>
                  )}
                  {student.birthYear && (
                    <div>
                      <p className="text-sm text-muted-foreground">Birth Year</p>
                      <p className="text-sm font-medium">{student.birthYear}</p>
                    </div>
                  )}
                  {student.birthDate && (
                    <div>
                      <p className="text-sm text-muted-foreground">Birth Date</p>
                      <p className="text-sm font-medium">
                        {formatDate(student.birthDate)}
                      </p>
                    </div>
                  )}
                  {student.age && (
                    <div>
                      <p className="text-sm text-muted-foreground">Age</p>
                      <p className="text-sm font-medium">{student.age} years</p>
                    </div>
                  )}
                  {student.nationality && (
                    <div>
                      <p className="text-sm text-muted-foreground">Nationality</p>
                      <p className="text-sm font-medium">{student.nationality}</p>
                    </div>
                  )}
                  {student.preferredLanguage && (
                    <div>
                      <p className="text-sm text-muted-foreground">Preferred Language</p>
                      <p className="text-sm font-medium">{student.preferredLanguage}</p>
                    </div>
                  )}
                </div>
                {(student.isOrphan || student.disabilityStatus) && (
                  <>
                    <Separator />
                    <div className="grid grid-cols-2 gap-4">
                      {student.isOrphan && (
                        <div>
                          <p className="text-sm text-muted-foreground">Orphan Status</p>
                          <p className="text-sm font-medium">Yes</p>
                        </div>
                      )}
                      {student.disabilityStatus && (
                        <div>
                          <p className="text-sm text-muted-foreground">Disability Status</p>
                          <p className="text-sm font-medium">{student.disabilityStatus}</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Address Information */}
            {(student.origProvince || student.currProvince || student.homeAddress) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Address Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {student.origProvince && (
                    <div>
                      <p className="text-sm text-muted-foreground">Origin</p>
                      <p className="text-sm font-medium">
                        {[student.origVillage, student.origDistrict, student.origProvince]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    </div>
                  )}
                  {student.currProvince && (
                    <div>
                      <p className="text-sm text-muted-foreground">Current Location</p>
                      <p className="text-sm font-medium">
                        {[student.currVillage, student.currDistrict, student.currProvince]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    </div>
                  )}
                  {student.homeAddress && (
                    <div>
                      <p className="text-sm text-muted-foreground">Home Address</p>
                      <p className="text-sm font-medium">{student.homeAddress}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Guardian Information */}
            {(student.guardianName || student.guardianPhone || student.guardianRelation) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Guardian Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {student.guardianName && (
                    <div>
                      <p className="text-sm text-muted-foreground">Guardian Name</p>
                      <p className="text-sm font-medium">{student.guardianName}</p>
                    </div>
                  )}
                  {student.guardianRelation && (
                    <div>
                      <p className="text-sm text-muted-foreground">Relation</p>
                      <p className="text-sm font-medium">{student.guardianRelation}</p>
                    </div>
                  )}
                  {student.guardianPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="text-sm font-medium">{student.guardianPhone}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Fee Information */}
            {student.feeAmount !== null && student.feeAmount !== undefined && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Fee Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Fee Amount</span>
                    <span className="text-sm font-medium">
                      ${typeof student.feeAmount === 'number' 
                        ? student.feeAmount.toFixed(2) 
                        : Number(student.feeAmount || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Payment Status</span>
                    <Badge variant={student.feePaid ? 'default' : 'secondary'}>
                      {student.feePaid ? 'Paid' : 'Unpaid'}
                    </Badge>
                  </div>
                  {student.feePaidDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Payment Date</span>
                      <span className="text-sm font-medium">
                        {formatDate(student.feePaidDate)}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Courses Tab */}
          <TabsContent value="courses" className="space-y-4 mt-4">
            {/* Current Course */}
            {currentCourse && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Current Course
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Course Name</p>
                    <p className="text-base font-semibold">{currentCourse.name}</p>
                  </div>
                  {currentCourse.description && (
                    <div>
                      <p className="text-sm text-muted-foreground">Description</p>
                      <p className="text-sm">{currentCourse.description}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    {currentCourse.startDate && (
                      <div>
                        <p className="text-sm text-muted-foreground">Start Date</p>
                        <p className="text-sm font-medium">
                          {formatDate(currentCourse.startDate)}
                        </p>
                      </div>
                    )}
                    {currentCourse.endDate && (
                      <div>
                        <p className="text-sm text-muted-foreground">End Date</p>
                        <p className="text-sm font-medium">
                          {formatDate(currentCourse.endDate)}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <Badge variant="outline" className={statusBadge[student.completionStatus] || ''}>
                      {student.completionStatus}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Other Courses */}
            {studentCourses.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    Other Enrollments ({studentCourses.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {studentCourses.map(({ course, enrollment }) => (
                    <div key={enrollment.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-semibold">{course.name}</p>
                          {course.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {course.description}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className={statusBadge[enrollment.completionStatus] || ''}>
                          {enrollment.completionStatus}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {enrollment.registrationDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Registered: {formatDate(enrollment.registrationDate)}</span>
                          </div>
                        )}
                        {enrollment.completionDate && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            <span>Completed: {formatDate(enrollment.completionDate)}</span>
                          </div>
                        )}
                      </div>
                      {enrollment.certificateIssued && (
                        <div className="flex items-center gap-1 text-xs">
                          <Award className="h-3 w-3 text-purple-600" />
                          <span className="text-purple-600 font-medium">Certificate Issued</span>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {studentCourses.length === 0 && !currentCourse && (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No course enrollments found</p>
              </div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Enrollment History
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Registration */}
                {student.registrationDate && (
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                      <div className="h-full w-px bg-border mt-1" />
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">Enrolled</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(student.registrationDate)}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Student registered for {currentCourse?.name || 'course'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Completion */}
                {student.completionDate && (
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="h-2 w-2 rounded-full bg-emerald-500" />
                      <div className="h-full w-px bg-border mt-1" />
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">Completed</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(student.completionDate)}
                        </p>
                      </div>
                      {student.grade && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Grade: {student.grade}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Certificate Issued */}
                {student.certificateIssued && student.certificateIssuedDate && (
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="h-2 w-2 rounded-full bg-purple-500" />
                      <div className="h-full w-px bg-border mt-1" />
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold flex items-center gap-1">
                          <Award className="h-3 w-3" />
                          Certificate Issued
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(student.certificateIssuedDate)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Fee Payment */}
                {student.feePaid && student.feePaidDate && (
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          Fee Paid
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(student.feePaidDate)}
                        </p>
                      </div>
                      {student.feeAmount !== null && student.feeAmount !== undefined && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Amount: ${typeof student.feeAmount === 'number' 
                            ? student.feeAmount.toFixed(2) 
                            : Number(student.feeAmount || 0).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Created/Updated timestamps */}
                <Separator />
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span>{formatDate(student.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Updated:</span>
                    <span>{formatDate(student.updatedAt)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

