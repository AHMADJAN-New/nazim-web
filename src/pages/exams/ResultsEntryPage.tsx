import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Save, Upload, Download, Trophy, Users } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

interface StudentResult {
  id: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  marksObtained: number;
  grade: string;
  status: "pass" | "fail";
}

interface ExamResult {
  examId: string;
  examName: string;
  subject: string;
  class: string;
  totalMarks: number;
  passMarks: number;
  students: StudentResult[];
}

const mockExamResults: ExamResult[] = [
  {
    examId: "1",
    examName: "Mid-Term Mathematics",
    subject: "Mathematics",
    class: "Grade 5A",
    totalMarks: 100,
    passMarks: 40,
    students: [
      { id: "1", studentId: "ST001", studentName: "John Smith", rollNumber: "01", marksObtained: 85, grade: "A", status: "pass" },
      { id: "2", studentId: "ST002", studentName: "Sarah Johnson", rollNumber: "02", marksObtained: 72, grade: "B", status: "pass" },
      { id: "3", studentId: "ST003", studentName: "Mike Brown", rollNumber: "03", marksObtained: 35, grade: "F", status: "fail" },
      { id: "4", studentId: "ST004", studentName: "Emma Davis", rollNumber: "04", marksObtained: 91, grade: "A+", status: "pass" },
    ]
  }
];

export default function ResultsEntryPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [examResults, setExamResults] = useState<ExamResult[]>(mockExamResults);
  const [selectedExam, setSelectedExam] = useState<string>("");
  const [results, setResults] = useState<StudentResult[]>([]);

  const exams = [
    { id: "1", name: "Mid-Term Mathematics - Grade 5A" },
    { id: "2", name: "Final English - Grade 5A" },
    { id: "3", name: "Unit Test Science - Grade 4A" }
  ];

  const handleExamSelect = (examId: string) => {
    setSelectedExam(examId);
    const examResult = examResults.find(er => er.examId === examId);
    if (examResult) {
      setResults([...examResult.students]);
    } else {
      // Load students for new exam
      const mockStudents: StudentResult[] = [
        { id: "1", studentId: "ST001", studentName: "John Smith", rollNumber: "01", marksObtained: 0, grade: "", status: "fail" as const },
        { id: "2", studentId: "ST002", studentName: "Sarah Johnson", rollNumber: "02", marksObtained: 0, grade: "", status: "fail" as const },
        { id: "3", studentId: "ST003", studentName: "Mike Brown", rollNumber: "03", marksObtained: 0, grade: "", status: "fail" as const },
        { id: "4", studentId: "ST004", studentName: "Emma Davis", rollNumber: "04", marksObtained: 0, grade: "", status: "fail" as const },
      ];
      setResults(mockStudents);
    }
  };

  const calculateGrade = (marks: number, totalMarks: number) => {
    const percentage = (marks / totalMarks) * 100;
    if (percentage >= 90) return "A+";
    if (percentage >= 80) return "A";
    if (percentage >= 70) return "B";
    if (percentage >= 60) return "C";
    if (percentage >= 50) return "D";
    return "F";
  };

  const handleMarksChange = (studentId: string, marks: number) => {
    const selectedExamData = examResults.find(er => er.examId === selectedExam);
    if (!selectedExamData) return;

    const updatedResults = results.map(result => {
      if (result.id === studentId) {
        const grade = calculateGrade(marks, selectedExamData.totalMarks);
        const status: "pass" | "fail" = marks >= selectedExamData.passMarks ? "pass" : "fail";
        return { ...result, marksObtained: marks, grade, status };
      }
      return result;
    });
    setResults(updatedResults);
  };

  const handleSaveResults = () => {
    const selectedExamData = examResults.find(er => er.examId === selectedExam);
    if (!selectedExamData) return;

    const updatedExamResults = examResults.map(er => 
      er.examId === selectedExam 
        ? { ...er, students: results }
        : er
    );

    // If this is a new exam result, add it
    if (!selectedExamData) {
      // This would be handled differently in real implementation
    }

    setExamResults(updatedExamResults);
    toast({
      title: "Results Saved",
      description: "Exam results have been saved successfully"
    });
  };

  const exportResults = () => {
    const selectedExamData = examResults.find(er => er.examId === selectedExam);
    if (!selectedExamData) return;

    const csvContent = [
      ['Roll No', 'Student Name', 'Marks Obtained', 'Total Marks', 'Grade', 'Status'].join(','),
      ...results.map(student => [
        student.rollNumber,
        student.studentName,
        student.marksObtained,
        selectedExamData.totalMarks,
        student.grade,
        student.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedExamData.examName}_results.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const selectedExamData = examResults.find(er => er.examId === selectedExam);
  const passCount = results.filter(r => r.status === "pass").length;
  const failCount = results.filter(r => r.status === "fail").length;
  const averageMarks = results.length > 0 
    ? (results.reduce((sum, r) => sum + r.marksObtained, 0) / results.length).toFixed(1)
    : "0";

  return (
    <MainLayout title="Results Entry">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Results Entry</h1>
            <p className="text-muted-foreground">Enter and manage exam results</p>
          </div>
          <div className="flex gap-2">
            {results.length > 0 && (
              <>
                <Button variant="outline" onClick={exportResults}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button onClick={handleSaveResults}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Results
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Exam Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Select Exam
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full max-w-md">
              <Label htmlFor="exam-select">Choose Exam</Label>
              <Select value={selectedExam} onValueChange={handleExamSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an exam" />
                </SelectTrigger>
                <SelectContent>
                  {exams.map(exam => (
                    <SelectItem key={exam.id} value={exam.id}>
                      {exam.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results Entry */}
        {selectedExam && selectedExamData && (
          <>
            {/* Exam Info */}
            <Card>
              <CardHeader>
                <CardTitle>{selectedExamData.examName}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label>Subject</Label>
                    <div className="font-medium">{selectedExamData.subject}</div>
                  </div>
                  <div>
                    <Label>Class</Label>
                    <div className="font-medium">{selectedExamData.class}</div>
                  </div>
                  <div>
                    <Label>Total Marks</Label>
                    <div className="font-medium">{selectedExamData.totalMarks}</div>
                  </div>
                  <div>
                    <Label>Pass Marks</Label>
                    <div className="font-medium">{selectedExamData.passMarks}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Statistics */}
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-500" />
                    <div>
                      <div className="text-2xl font-bold">{results.length}</div>
                      <div className="text-sm text-muted-foreground">Total Students</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-green-500" />
                    <div>
                      <div className="text-2xl font-bold">{passCount}</div>
                      <div className="text-sm text-muted-foreground">Passed</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-red-500" />
                    <div>
                      <div className="text-2xl font-bold">{failCount}</div>
                      <div className="text-sm text-muted-foreground">Failed</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-blue-500" />
                    <div>
                      <div className="text-2xl font-bold">{averageMarks}</div>
                      <div className="text-sm text-muted-foreground">Average</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Results Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Student Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Roll No</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Marks Obtained</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.rollNumber}</TableCell>
                        <TableCell>{student.studentName}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              max={selectedExamData.totalMarks}
                              value={student.marksObtained}
                              onChange={(e) => handleMarksChange(student.id, parseInt(e.target.value) || 0)}
                              className="w-20"
                            />
                            <span className="text-sm text-muted-foreground">
                              / {selectedExamData.totalMarks}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={student.grade === "F" ? "destructive" : "default"}>
                            {student.grade}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={student.status === "pass" ? "default" : "destructive"}>
                            {student.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  );
}