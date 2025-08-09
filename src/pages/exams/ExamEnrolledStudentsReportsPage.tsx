import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, BookOpen, Calendar, Download, Search, Filter, Eye, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StudentEnrollment {
  id: string;
  studentName: string;
  studentId: string;
  class: string;
  rollNumber: string;
  enrolledSubjects: string[];
  totalSubjects: number;
  examDate: string;
  status: 'enrolled' | 'completed' | 'absent';
}


const statusVariants = {
  enrolled: "default",
  completed: "secondary",
  absent: "destructive"
} as const;

export default function ExamEnrolledStudentsReportsPage() {
  const { toast } = useToast();
  const [selectedExam, setSelectedExam] = useState<string>("mid-term");
  const { data: enrollments = [] } = useQuery({
    queryKey: ["exam-enrollments-report", selectedExam],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_enrollments")
        .select("*")
        .eq("exam_id", selectedExam);
      if (error) throw error;
      return data as any as StudentEnrollment[];
    },
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredEnrollments = enrollments.filter(enrollment => {
    const matchesSearch = enrollment.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         enrollment.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         enrollment.rollNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = classFilter === "all" || enrollment.class === classFilter;
    const matchesStatus = statusFilter === "all" || enrollment.status === statusFilter;
    return matchesSearch && matchesClass && matchesStatus;
  });

  const totalEnrolled = enrollments.length;
  const totalSubjectsEnrolled = enrollments.reduce((sum, e) => sum + e.totalSubjects, 0);
  const classes = Array.from(new Set(enrollments.map(e => e.class)));
  const allSubjects = Array.from(new Set(enrollments.flatMap(e => e.enrolledSubjects)));

  const exportReport = (format: 'pdf' | 'excel') => {
    toast({
      title: "Export Started",
      description: `Exam enrollment report is being exported as ${format.toUpperCase()}.`
    });
  };

  const generateDetailedReport = () => {
    toast({
      title: "Detailed Report",
      description: "Generating comprehensive enrollment report with subject breakdown."
    });
  };

  const getSubjectEnrollmentCount = (subject: string) => {
    return enrollments.filter(e => e.enrolledSubjects.includes(subject)).length;
  };

  const getClassEnrollmentCount = (className: string) => {
    return enrollments.filter(e => e.class === className).length;
  };

  return (
    <MainLayout 
      title="Exam Enrolled Students Reports"
      showBreadcrumb={true}
      breadcrumbItems={[
        { label: "Examinations", href: "/exams" },
        { label: "Enrolled Students Reports" }
      ]}
    >
      <div className="space-y-6">
        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Select value={selectedExam} onValueChange={setSelectedExam}>
              <SelectTrigger className="w-60">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Select exam" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mid-term">Mid Term Exam</SelectItem>
                <SelectItem value="final-term">Final Term Exam</SelectItem>
                <SelectItem value="monthly">Monthly Test</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex space-x-2">
            <Button onClick={() => exportReport('excel')} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            <Button onClick={() => exportReport('pdf')} variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button onClick={generateDetailedReport}>
              <Eye className="h-4 w-4 mr-2" />
              Detailed Report
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Enrolled</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalEnrolled}</div>
              <p className="text-xs text-muted-foreground">Students registered</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Subject Enrollments</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSubjectsEnrolled}</div>
              <p className="text-xs text-muted-foreground">Total subject registrations</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Classes Participating</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{classes.length}</div>
              <p className="text-xs text-muted-foreground">Different classes</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Subjects Offered</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{allSubjects.length}</div>
              <p className="text-xs text-muted-foreground">Available subjects</p>
            </CardContent>
          </Card>
        </div>

        {/* Summary Reports */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Subject-wise Enrollment */}
          <Card>
            <CardHeader>
              <CardTitle>Subject-wise Enrollment</CardTitle>
              <CardDescription>Number of students enrolled in each subject</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {allSubjects.map(subject => (
                  <div key={subject} className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">{subject}</span>
                    <Badge variant="secondary">
                      {getSubjectEnrollmentCount(subject)} students
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Class-wise Enrollment */}
          <Card>
            <CardHeader>
              <CardTitle>Class-wise Enrollment</CardTitle>
              <CardDescription>Number of students enrolled from each class</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {classes.map(className => (
                  <div key={className} className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">{className}</span>
                    <Badge variant="secondary">
                      {getClassEnrollmentCount(className)} students
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Student List */}
        <Card>
          <CardHeader>
            <CardTitle>Enrolled Students Details</CardTitle>
            <CardDescription>Complete list of students with their enrolled subjects</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground transform -translate-y-1/2" />
                <Input
                  placeholder="Search by student name, ID, or roll number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map(cls => (
                    <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="enrolled">Enrolled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Roll Number</TableHead>
                    <TableHead>Subjects Count</TableHead>
                    <TableHead>Enrolled Subjects</TableHead>
                    <TableHead>Exam Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEnrollments.map((enrollment) => (
                    <TableRow key={enrollment.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{enrollment.studentName}</div>
                          <div className="text-sm text-muted-foreground">{enrollment.studentId}</div>
                        </div>
                      </TableCell>
                      <TableCell>{enrollment.class}</TableCell>
                      <TableCell className="font-mono font-bold">{enrollment.rollNumber}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {enrollment.totalSubjects} subjects
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-md">
                          {enrollment.enrolledSubjects.map(subject => (
                            <Badge key={subject} variant="secondary" className="text-xs">
                              {subject}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{enrollment.examDate}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariants[enrollment.status]}>
                          {enrollment.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}