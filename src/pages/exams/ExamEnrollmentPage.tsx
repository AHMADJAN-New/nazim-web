import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStudents } from "@/hooks/useStudents";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { UserPlus, Users, BookOpen, Calendar, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExamEnrollment {
  id: string;
  studentName: string;
  studentId: string;
  class: string;
  examName: string;
  enrolledSubjects: string[];
  rollNumber: string;
  status: "enrolled" | "pending" | "cancelled";
}

export default function ExamEnrollmentPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedExam, setSelectedExam] = useState<string>("mid-term");
  const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string>("");

  const { data: enrollments = [] } = useQuery({
    queryKey: ["exam-enrollments", selectedExam],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_enrollments")
        .select("*")
        .eq("exam_id", selectedExam);
      if (error) throw error;
      return data as any as ExamEnrollment[];
    },
  });

  const enrollMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("exam_enrollments")
        .insert({ exam_id: selectedExam, student_id: selectedStudent });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exam-enrollments", selectedExam] });
      toast({
        title: "Student Enrolled",
        description: "Student has been successfully enrolled in the exam.",
      });
    },
  });

  const { data: students = [] } = useStudents();

  const handleEnrollStudent = () => {
    enrollMutation.mutate();
    setIsEnrollDialogOpen(false);
  };

  return (
    <MainLayout
      title="Exam Enrollment"
      showBreadcrumb={true}
      breadcrumbItems={[
        { label: "Examinations", href: "/exams" },
        { label: "Student Enrollment" },
      ]}
    >
      <div className="space-y-6">
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
          <Button onClick={() => setIsEnrollDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Enroll Student
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Enrolled</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{enrollments.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Enrollments</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {enrollments.filter((e) => e.status === "pending").length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Subjects Enrolled</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Array.from(
                  new Set(enrollments.flatMap((e) => e.enrolledSubjects))
                ).length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Enrolled Students</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Roll Number</TableHead>
                  <TableHead>Enrolled Subjects</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.map((enrollment) => (
                  <TableRow key={enrollment.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{enrollment.studentName}</div>
                        <div className="text-sm text-muted-foreground">
                          {enrollment.studentId}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{enrollment.class}</TableCell>
                    <TableCell className="font-mono">
                      {enrollment.rollNumber}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {enrollment.enrolledSubjects.map((subject) => (
                          <Badge key={subject} variant="secondary" className="text-xs">
                            {subject}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          enrollment.status === "enrolled" ? "default" : "secondary"
                        }
                      >
                        {enrollment.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={isEnrollDialogOpen} onOpenChange={setIsEnrollDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enroll Student in Exam</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger>
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.profiles?.full_name} ({s.student_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button onClick={handleEnrollStudent}>Enroll Student</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}

