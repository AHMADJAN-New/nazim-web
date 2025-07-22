import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Download, FileText, Printer, Eye, Send } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

interface SubjectResult {
  subject: string;
  marksObtained: number;
  totalMarks: number;
  grade: string;
  percentage: number;
}

interface StudentReportCard {
  studentId: string;
  studentName: string;
  rollNumber: string;
  class: string;
  examType: string;
  examDate: string;
  subjects: SubjectResult[];
  totalMarks: number;
  totalObtained: number;
  overallPercentage: number;
  overallGrade: string;
  rank: number;
  attendance: number;
  remarks: string;
}

const mockReportCards: StudentReportCard[] = [
  {
    studentId: "ST001",
    studentName: "John Smith",
    rollNumber: "01",
    class: "Grade 5A",
    examType: "Mid-Term",
    examDate: "2024-02-15",
    subjects: [
      { subject: "Mathematics", marksObtained: 85, totalMarks: 100, grade: "A", percentage: 85 },
      { subject: "English", marksObtained: 78, totalMarks: 100, grade: "B+", percentage: 78 },
      { subject: "Science", marksObtained: 92, totalMarks: 100, grade: "A+", percentage: 92 },
      { subject: "History", marksObtained: 74, totalMarks: 100, grade: "B", percentage: 74 },
      { subject: "Geography", marksObtained: 80, totalMarks: 100, grade: "A-", percentage: 80 }
    ],
    totalMarks: 500,
    totalObtained: 409,
    overallPercentage: 81.8,
    overallGrade: "A",
    rank: 3,
    attendance: 95,
    remarks: "Excellent performance in Science. Needs improvement in History."
  },
  {
    studentId: "ST002",
    studentName: "Sarah Johnson",
    rollNumber: "02",
    class: "Grade 5A",
    examType: "Mid-Term",
    examDate: "2024-02-15",
    subjects: [
      { subject: "Mathematics", marksObtained: 72, totalMarks: 100, grade: "B", percentage: 72 },
      { subject: "English", marksObtained: 88, totalMarks: 100, grade: "A", percentage: 88 },
      { subject: "Science", marksObtained: 76, totalMarks: 100, grade: "B+", percentage: 76 },
      { subject: "History", marksObtained: 82, totalMarks: 100, grade: "A-", percentage: 82 },
      { subject: "Geography", marksObtained: 79, totalMarks: 100, grade: "B+", percentage: 79 }
    ],
    totalMarks: 500,
    totalObtained: 397,
    overallPercentage: 79.4,
    overallGrade: "B+",
    rank: 5,
    attendance: 98,
    remarks: "Consistent performance across all subjects. Excellent attendance."
  }
];

export default function ReportCardsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [reportCards, setReportCards] = useState<StudentReportCard[]>(mockReportCards);
  const [selectedClass, setSelectedClass] = useState("Grade 5A");
  const [selectedExam, setSelectedExam] = useState("Mid-Term");
  const [selectedStudent, setSelectedStudent] = useState<StudentReportCard | null>(null);

  const classes = ["Grade 1A", "Grade 2A", "Grade 3A", "Grade 4A", "Grade 5A", "Grade 6A"];
  const examTypes = ["Mid-Term", "Final", "Unit Test", "Monthly Test"];

  const filteredReportCards = reportCards.filter(
    card => card.class === selectedClass && card.examType === selectedExam
  );

  const handleDownloadReportCard = (student: StudentReportCard) => {
    toast({
      title: "Download Started",
      description: `Report card for ${student.studentName} is being downloaded`
    });
  };

  const handlePrintReportCard = (student: StudentReportCard) => {
    window.print();
    toast({
      title: "Print Started",
      description: `Report card for ${student.studentName} is being printed`
    });
  };

  const handleEmailReportCard = (student: StudentReportCard) => {
    toast({
      title: "Email Sent",
      description: `Report card has been emailed to ${student.studentName}'s parents`
    });
  };

  const handleBulkDownload = () => {
    toast({
      title: "Bulk Download Started",
      description: `Downloading ${filteredReportCards.length} report cards`
    });
  };

  const getGradeColor = (grade: string) => {
    if (grade.includes("A")) return "text-green-600";
    if (grade.includes("B")) return "text-blue-600";
    if (grade.includes("C")) return "text-yellow-600";
    if (grade.includes("D")) return "text-orange-600";
    return "text-red-600";
  };

  return (
    <MainLayout title="Report Cards">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Report Cards</h1>
            <p className="text-muted-foreground">Generate and manage student report cards</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleBulkDownload} disabled={filteredReportCards.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Bulk Download
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="w-48">
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map(cls => (
                      <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-48">
                <Select value={selectedExam} onValueChange={setSelectedExam}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {examTypes.map(exam => (
                      <SelectItem key={exam} value={exam}>{exam}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report Cards Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Report Cards ({filteredReportCards.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Roll No</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Total Marks</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Rank</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReportCards.map((student) => (
                  <TableRow key={student.studentId}>
                    <TableCell className="font-medium">{student.rollNumber}</TableCell>
                    <TableCell>{student.studentName}</TableCell>
                    <TableCell>
                      {student.totalObtained}/{student.totalMarks}
                    </TableCell>
                    <TableCell>{student.overallPercentage.toFixed(1)}%</TableCell>
                    <TableCell>
                      <Badge className={getGradeColor(student.overallGrade)}>
                        {student.overallGrade}
                      </Badge>
                    </TableCell>
                    <TableCell>#{student.rank}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedStudent(student)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Report Card - {student.studentName}</DialogTitle>
                            </DialogHeader>
                            {selectedStudent && (
                              <div className="space-y-6">
                                {/* Student Info */}
                                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                                  <div>
                                    <div className="text-sm text-muted-foreground">Student Name</div>
                                    <div className="font-medium">{selectedStudent.studentName}</div>
                                  </div>
                                  <div>
                                    <div className="text-sm text-muted-foreground">Roll Number</div>
                                    <div className="font-medium">{selectedStudent.rollNumber}</div>
                                  </div>
                                  <div>
                                    <div className="text-sm text-muted-foreground">Class</div>
                                    <div className="font-medium">{selectedStudent.class}</div>
                                  </div>
                                  <div>
                                    <div className="text-sm text-muted-foreground">Exam Type</div>
                                    <div className="font-medium">{selectedStudent.examType}</div>
                                  </div>
                                </div>

                                {/* Subject-wise Results */}
                                <div>
                                  <h3 className="text-lg font-medium mb-4">Subject-wise Performance</h3>
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Subject</TableHead>
                                        <TableHead>Marks Obtained</TableHead>
                                        <TableHead>Total Marks</TableHead>
                                        <TableHead>Percentage</TableHead>
                                        <TableHead>Grade</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {selectedStudent.subjects.map((subject) => (
                                        <TableRow key={subject.subject}>
                                          <TableCell className="font-medium">{subject.subject}</TableCell>
                                          <TableCell>{subject.marksObtained}</TableCell>
                                          <TableCell>{subject.totalMarks}</TableCell>
                                          <TableCell>{subject.percentage}%</TableCell>
                                          <TableCell>
                                            <Badge className={getGradeColor(subject.grade)}>
                                              {subject.grade}
                                            </Badge>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>

                                {/* Overall Performance */}
                                <div className="grid grid-cols-3 gap-4">
                                  <Card>
                                    <CardContent className="p-4 text-center">
                                      <div className="text-2xl font-bold">{selectedStudent.overallPercentage.toFixed(1)}%</div>
                                      <div className="text-sm text-muted-foreground">Overall Percentage</div>
                                    </CardContent>
                                  </Card>
                                  <Card>
                                    <CardContent className="p-4 text-center">
                                      <div className="text-2xl font-bold">{selectedStudent.overallGrade}</div>
                                      <div className="text-sm text-muted-foreground">Overall Grade</div>
                                    </CardContent>
                                  </Card>
                                  <Card>
                                    <CardContent className="p-4 text-center">
                                      <div className="text-2xl font-bold">#{selectedStudent.rank}</div>
                                      <div className="text-sm text-muted-foreground">Class Rank</div>
                                    </CardContent>
                                  </Card>
                                </div>

                                {/* Additional Info */}
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <div className="text-sm text-muted-foreground">Attendance</div>
                                    <div className="font-medium">{selectedStudent.attendance}%</div>
                                  </div>
                                  <div>
                                    <div className="text-sm text-muted-foreground">Exam Date</div>
                                    <div className="font-medium">{new Date(selectedStudent.examDate).toLocaleDateString()}</div>
                                  </div>
                                </div>

                                {/* Remarks */}
                                <div>
                                  <div className="text-sm text-muted-foreground mb-2">Teacher's Remarks</div>
                                  <div className="p-3 bg-muted rounded-lg">{selectedStudent.remarks}</div>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadReportCard(student)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePrintReportCard(student)}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEmailReportCard(student)}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}