import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Hash, Users, RefreshCw, Download, Search, Filter, Plus, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RollNumberAssignment {
  id: string;
  studentName: string;
  studentId: string;
  class: string;
  examName: string;
  rollNumber: string;
  assignedDate: string;
  status: 'assigned' | 'pending' | 'reassigned';
}

const mockAssignments: RollNumberAssignment[] = [
  {
    id: "1",
    studentName: "Ahmed Hassan",
    studentId: "STU001",
    class: "Class 10-A",
    examName: "Mid Term Exam",
    rollNumber: "MT001",
    assignedDate: "2024-02-01",
    status: "assigned"
  },
  {
    id: "2",
    studentName: "Fatima Ali",
    studentId: "STU002",
    class: "Class 10-A",
    examName: "Mid Term Exam", 
    rollNumber: "MT002",
    assignedDate: "2024-02-01",
    status: "assigned"
  },
  {
    id: "3",
    studentName: "Omar Khan",
    studentId: "STU003",
    class: "Class 10-B",
    examName: "Mid Term Exam",
    rollNumber: "MT003",
    assignedDate: "2024-02-01",
    status: "pending"
  }
];

const mockStudents = [
  { id: "STU001", name: "Ahmed Hassan", class: "Class 10-A" },
  { id: "STU002", name: "Fatima Ali", class: "Class 10-A" },
  { id: "STU003", name: "Omar Khan", class: "Class 10-B" },
  { id: "STU004", name: "Ayesha Malik", class: "Class 9-A" },
  { id: "STU005", name: "Hassan Ahmed", class: "Class 9-B" }
];

const statusVariants = {
  assigned: "default",
  pending: "secondary",
  reassigned: "outline"
} as const;

export default function RollNumberAssignmentPage() {
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<RollNumberAssignment[]>(mockAssignments);
  const [selectedExam, setSelectedExam] = useState<string>("mid-term");
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);

  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = assignment.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         assignment.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         assignment.rollNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = classFilter === "all" || assignment.class === classFilter;
    return matchesSearch && matchesClass;
  });

  const totalAssigned = assignments.filter(a => a.status === 'assigned').length;
  const pendingAssignments = assignments.filter(a => a.status === 'pending').length;
  const classes = Array.from(new Set(mockStudents.map(s => s.class)));

  const generateRollNumber = (examPrefix: string, sequence: number) => {
    return `${examPrefix}${String(sequence).padStart(3, '0')}`;
  };

  const handleAssignRollNumber = (assignmentData: {
    studentId: string;
    customRollNumber?: string;
  }) => {
    const student = mockStudents.find(s => s.id === assignmentData.studentId);
    if (!student) return;

    const rollNumber = assignmentData.customRollNumber || 
                      generateRollNumber("MT", assignments.length + 1);

    const newAssignment: RollNumberAssignment = {
      id: `${assignments.length + 1}`,
      studentName: student.name,
      studentId: student.id,
      class: student.class,
      examName: "Mid Term Exam",
      rollNumber,
      assignedDate: new Date().toISOString().split('T')[0],
      status: "assigned"
    };

    setAssignments([...assignments, newAssignment]);
    setIsAssignDialogOpen(false);
    toast({
      title: "Roll Number Assigned",
      description: `Roll number ${rollNumber} assigned to ${student.name}.`
    });
  };

  const handleBulkAssign = (classFilter: string) => {
    const unassignedStudents = mockStudents.filter(student => 
      (classFilter === "all" || student.class === classFilter) &&
      !assignments.some(a => a.studentId === student.id)
    );

    const newAssignments = unassignedStudents.map((student, index) => ({
      id: `${assignments.length + index + 1}`,
      studentName: student.name,
      studentId: student.id,
      class: student.class,
      examName: "Mid Term Exam",
      rollNumber: generateRollNumber("MT", assignments.length + index + 1),
      assignedDate: new Date().toISOString().split('T')[0],
      status: "assigned" as const
    }));

    setAssignments([...assignments, ...newAssignments]);
    setIsBulkAssignOpen(false);
    toast({
      title: "Bulk Assignment Complete",
      description: `${newAssignments.length} roll numbers assigned successfully.`
    });
  };

  const reassignRollNumber = (assignmentId: string) => {
    const newRollNumber = generateRollNumber("MT", Date.now() % 1000);
    setAssignments(prev => prev.map(assignment => 
      assignment.id === assignmentId 
        ? { 
            ...assignment, 
            rollNumber: newRollNumber, 
            status: 'reassigned' as const,
            assignedDate: new Date().toISOString().split('T')[0]
          }
        : assignment
    ));
    toast({
      title: "Roll Number Reassigned",
      description: `New roll number ${newRollNumber} assigned.`
    });
  };

  const downloadRollNumbers = () => {
    toast({
      title: "Download Started",
      description: "Roll number list is being downloaded."
    });
  };

  return (
    <MainLayout 
      title="Exam Roll Number Assignment"
      showBreadcrumb={true}
      breadcrumbItems={[
        { label: "Examinations", href: "/exams" },
        { label: "Roll Number Assignment" }
      ]}
    >
      <div className="space-y-6">
        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Select value={selectedExam} onValueChange={setSelectedExam}>
              <SelectTrigger className="w-60">
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
            <Button onClick={downloadRollNumbers} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download List
            </Button>
            <Button onClick={() => setIsBulkAssignOpen(true)} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Bulk Assign
            </Button>
            <Button onClick={() => setIsAssignDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Assign Roll Number
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
              <Hash className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assignments.length}</div>
              <p className="text-xs text-muted-foreground">Roll numbers assigned</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalAssigned}</div>
              <p className="text-xs text-muted-foreground">Students with roll numbers</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingAssignments}</div>
              <p className="text-xs text-muted-foreground">Awaiting assignment</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unassigned Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {mockStudents.filter(s => !assignments.some(a => a.studentId === s.id)).length}
              </div>
              <p className="text-xs text-muted-foreground">Need roll numbers</p>
            </CardContent>
          </Card>
        </div>

        {/* Assignments Table */}
        <Card>
          <CardHeader>
            <CardTitle>Roll Number Assignments</CardTitle>
            <CardDescription>Manage exam roll number assignments for students</CardDescription>
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
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Roll Number</TableHead>
                  <TableHead>Assigned Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{assignment.studentName}</div>
                        <div className="text-sm text-muted-foreground">{assignment.studentId}</div>
                      </div>
                    </TableCell>
                    <TableCell>{assignment.class}</TableCell>
                    <TableCell>
                      <div className="font-mono text-lg font-bold">{assignment.rollNumber}</div>
                    </TableCell>
                    <TableCell>{assignment.assignedDate}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[assignment.status]}>
                        {assignment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => reassignRollNumber(assignment.id)}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Manual Assignment Dialog */}
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Assign Roll Number</DialogTitle>
              <DialogDescription>
                Manually assign a roll number to a student.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleAssignRollNumber({
                studentId: formData.get('studentId') as string,
                customRollNumber: formData.get('customRollNumber') as string || undefined,
              });
            }}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="studentId" className="text-right">Student</Label>
                  <Select name="studentId" required>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockStudents.filter(student => 
                        !assignments.some(a => a.studentId === student.id)
                      ).map(student => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.name} ({student.class})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="customRollNumber" className="text-right">Roll Number</Label>
                  <Input 
                    id="customRollNumber" 
                    name="customRollNumber" 
                    placeholder="Auto-generated if empty"
                    className="col-span-3" 
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Assign Roll Number</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Bulk Assignment Dialog */}
        <Dialog open={isBulkAssignOpen} onOpenChange={setIsBulkAssignOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Bulk Roll Number Assignment</DialogTitle>
              <DialogDescription>
                Automatically assign roll numbers to all unassigned students.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleBulkAssign(formData.get('classFilter') as string);
            }}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="bulkClassFilter" className="text-right">Filter by Class</Label>
                  <Select name="classFilter" defaultValue="all" required>
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classes</SelectItem>
                      {classes.map(cls => (
                        <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-sm text-muted-foreground">
                  This will assign roll numbers to all students who don't have one yet.
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Assign All</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}