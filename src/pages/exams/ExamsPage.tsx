import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Search, FileText, BarChart3, Award, Download, Upload, Eye, Edit } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Exam {
  id: string;
  name: string;
  type: 'midterm' | 'final' | 'monthly' | 'quiz';
  class: string;
  subject: string;
  date: string;
  time: string;
  duration: number; // minutes
  totalMarks: number;
  passingMarks: number;
  room: string;
  teacher: string;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
}

const mockExams: Exam[] = [
  {
    id: "EXM001",
    name: "Mathematics Midterm",
    type: "midterm",
    class: "Class 6-A",
    subject: "Mathematics",
    date: "2024-02-15",
    time: "09:00",
    duration: 120,
    totalMarks: 100,
    passingMarks: 40,
    room: "Room 101",
    teacher: "استاد احمد",
    status: "scheduled"
  },
  {
    id: "EXM002",
    name: "English Monthly Test",
    type: "monthly",
    class: "Class 6-A",
    subject: "English",
    date: "2024-02-10",
    time: "10:00",
    duration: 90,
    totalMarks: 50,
    passingMarks: 20,
    room: "Room 101",
    teacher: "Miss Sarah",
    status: "completed"
  }
];

interface ExamResult {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  grade: string;
  status: 'pass' | 'fail';
}

const mockResults: ExamResult[] = [
  {
    id: "RES001",
    examId: "EXM002",
    studentId: "STU001",
    studentName: "احمد علی",
    rollNumber: "001",
    marksObtained: 42,
    totalMarks: 50,
    percentage: 84,
    grade: "A",
    status: "pass"
  },
  {
    id: "RES002",
    examId: "EXM002", 
    studentId: "STU002",
    studentName: "فاطمہ خان",
    rollNumber: "002",
    marksObtained: 15,
    totalMarks: 50,
    percentage: 30,
    grade: "F",
    status: "fail"
  }
];

export default function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>(mockExams);
  const [results, setResults] = useState<ExamResult[]>(mockResults);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const { toast } = useToast();

  const getStatusBadge = (status: Exam['status']) => {
    const variants = {
      scheduled: "outline",
      ongoing: "default",
      completed: "secondary",
      cancelled: "destructive"
    } as const;
    
    return (
      <Badge variant={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getGradeBadge = (grade: string) => {
    const variants = {
      'A': "default",
      'B': "secondary", 
      'C': "outline",
      'D': "outline",
      'F': "destructive"
    } as const;
    
    return (
      <Badge variant={variants[grade as keyof typeof variants] || "outline"}>
        {grade}
      </Badge>
    );
  };

  return (
    <MainLayout 
      title="Examinations"
      showBreadcrumb
      breadcrumbItems={[
        { label: "Exams" }
      ]}
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search exams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-60 justify-start text-left">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : "Filter by date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Schedule Exam
            </Button>
          </div>
        </div>

        <Tabs defaultValue="exams" className="w-full">
          <TabsList>
            <TabsTrigger value="exams">Scheduled Exams</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="seating">Seating Plans</TabsTrigger>
          </TabsList>

          <TabsContent value="exams" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Exams</p>
                      <p className="text-2xl font-bold">{exams.length}</p>
                    </div>
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Scheduled</p>
                      <p className="text-2xl font-bold">{exams.filter(e => e.status === 'scheduled').length}</p>
                    </div>
                    <CalendarIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Completed</p>
                      <p className="text-2xl font-bold">{exams.filter(e => e.status === 'completed').length}</p>
                    </div>
                    <Award className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Pass Rate</p>
                      <p className="text-2xl font-bold">75%</p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Exam Schedule</CardTitle>
                <CardDescription>
                  View and manage all scheduled examinations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Exam Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Total Marks</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exams.map((exam) => (
                      <TableRow key={exam.id}>
                        <TableCell className="font-medium">{exam.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{exam.type}</Badge>
                        </TableCell>
                        <TableCell>{exam.class}</TableCell>
                        <TableCell>{exam.subject}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div>{format(new Date(exam.date), "PPP")}</div>
                            <div className="text-sm text-muted-foreground">{exam.time}</div>
                          </div>
                        </TableCell>
                        <TableCell>{exam.duration} min</TableCell>
                        <TableCell>{exam.totalMarks}</TableCell>
                        <TableCell>{getStatusBadge(exam.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <FileText className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Exam Results</CardTitle>
                    <CardDescription>
                      View and manage examination results
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Select>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select Exam" />
                      </SelectTrigger>
                      <SelectContent>
                        {exams.filter(e => e.status === 'completed').map(exam => (
                          <SelectItem key={exam.id} value={exam.id}>
                            {exam.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button>Enter Marks</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Roll #</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Marks Obtained</TableHead>
                      <TableHead>Total Marks</TableHead>
                      <TableHead>Percentage</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell className="font-medium">{result.rollNumber}</TableCell>
                        <TableCell>{result.studentName}</TableCell>
                        <TableCell>{result.marksObtained}</TableCell>
                        <TableCell>{result.totalMarks}</TableCell>
                        <TableCell>{result.percentage}%</TableCell>
                        <TableCell>{getGradeBadge(result.grade)}</TableCell>
                        <TableCell>
                          <Badge variant={result.status === 'pass' ? 'default' : 'destructive'}>
                            {result.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Class Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Class 6-A Mathematics</span>
                      <span className="font-bold">Average: 65%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: '65%' }}></div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span>Class 6-B Mathematics</span>
                      <span className="font-bold">Average: 58%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: '58%' }}></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Subject Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Mathematics:</span>
                      <span className="font-semibold">62% avg</span>
                    </div>
                    <div className="flex justify-between">
                      <span>English:</span>
                      <span className="font-semibold">78% avg</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Urdu:</span>
                      <span className="font-semibold">71% avg</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Science:</span>
                      <span className="font-semibold">69% avg</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Top Performers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 border rounded">
                    <span>1. احمد علی (Class 6-A)</span>
                    <Badge>95% Average</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 border rounded">
                    <span>2. فاطمہ خان (Class 6-B)</span>
                    <Badge>93% Average</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 border rounded">
                    <span>3. علی حسن (Class 6-A)</span>
                    <Badge>91% Average</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="seating" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Seating Arrangements</CardTitle>
                    <CardDescription>
                      Generate and manage exam seating plans
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline">Generate Plan</Button>
                    <Button>Create Manual Plan</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="exam-select">Select Exam</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose exam" />
                        </SelectTrigger>
                        <SelectContent>
                          {exams.filter(e => e.status === 'scheduled').map(exam => (
                            <SelectItem key={exam.id} value={exam.id}>
                              {exam.name} - {exam.class}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="room-select">Select Room</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose room" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="room-101">Room 101 (40 seats)</SelectItem>
                          <SelectItem value="room-102">Room 102 (40 seats)</SelectItem>
                          <SelectItem value="hall-1">Main Hall (100 seats)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button className="w-full">Generate Seating Plan</Button>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-4 text-center">Room Layout Preview</h4>
                    <div className="grid grid-cols-5 gap-2">
                      {Array.from({ length: 20 }, (_, i) => (
                        <div
                          key={i}
                          className="w-8 h-8 border rounded flex items-center justify-center text-xs"
                        >
                          {i + 1}
                        </div>
                      ))}
                    </div>
                    <div className="text-center mt-4 text-sm text-muted-foreground">
                      Teacher's Desk
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}