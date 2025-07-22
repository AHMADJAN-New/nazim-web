import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { UserCheck, Users, Calendar as CalendarIcon, CheckCircle, XCircle, AlertCircle, Search, Filter, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface HostelStudent {
  id: string;
  name: string;
  studentId: string;
  roomNumber: string;
  building: string;
  class: string;
  guardianPhone: string;
}

interface AttendanceRecord {
  id: string;
  student: HostelStudent;
  date: string;
  status: 'present' | 'absent' | 'late';
  remarks?: string;
  markedBy: string;
  markedAt: string;
}

const mockHostelStudents: HostelStudent[] = [
  {
    id: "1",
    name: "Ahmed Hassan",
    studentId: "STU001",
    roomNumber: "101",
    building: "Block A",
    class: "Class 10-A",
    guardianPhone: "+92-301-1234567"
  },
  {
    id: "2",
    name: "Fatima Ali",
    studentId: "STU002",
    roomNumber: "102",
    building: "Block A",
    class: "Class 9-B",
    guardianPhone: "+92-301-2345678"
  },
  {
    id: "3",
    name: "Omar Khan",
    studentId: "STU003",
    roomNumber: "201",
    building: "Block B",
    class: "Class 11-A",
    guardianPhone: "+92-301-3456789"
  },
  {
    id: "4",
    name: "Ayesha Malik",
    studentId: "STU004",
    roomNumber: "203",
    building: "Block B",
    class: "Class 8-C",
    guardianPhone: "+92-301-4567890"
  }
];

const mockAttendance: AttendanceRecord[] = [
  {
    id: "1",
    student: mockHostelStudents[0],
    date: new Date().toISOString().split('T')[0],
    status: "present",
    markedBy: "Admin",
    markedAt: new Date().toISOString()
  },
  {
    id: "2",
    student: mockHostelStudents[1],
    date: new Date().toISOString().split('T')[0],
    status: "absent",
    remarks: "Family emergency",
    markedBy: "Admin",
    markedAt: new Date().toISOString()
  },
  {
    id: "3",
    student: mockHostelStudents[2],
    date: new Date().toISOString().split('T')[0],
    status: "late",
    remarks: "Arrived at 11 PM",
    markedBy: "Admin",
    markedAt: new Date().toISOString()
  }
];

const statusVariants = {
  present: "default",
  absent: "destructive",
  late: "secondary"
} as const;

const statusIcons = {
  present: CheckCircle,
  absent: XCircle,
  late: AlertCircle
};

export default function HostelAttendancePage() {
  const { toast } = useToast();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(mockAttendance);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [buildingFilter, setBuildingFilter] = useState<string>("all");
  const [isMarkAttendanceOpen, setIsMarkAttendanceOpen] = useState(false);
  const [isBulkAttendanceOpen, setIsBulkAttendanceOpen] = useState(false);

  const dateString = format(selectedDate, 'yyyy-MM-dd');
  
  const todayAttendance = attendanceRecords.filter(record => 
    record.date === dateString
  );

  const studentsNotMarked = mockHostelStudents.filter(student =>
    !todayAttendance.some(record => record.student.id === student.id)
  );

  const filteredRecords = todayAttendance.filter(record => {
    const matchesSearch = record.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         record.student.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         record.student.roomNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || record.status === statusFilter;
    const matchesBuilding = buildingFilter === "all" || record.student.building === buildingFilter;
    return matchesSearch && matchesStatus && matchesBuilding;
  });

  const presentCount = todayAttendance.filter(r => r.status === 'present').length;
  const absentCount = todayAttendance.filter(r => r.status === 'absent').length;
  const lateCount = todayAttendance.filter(r => r.status === 'late').length;
  const attendanceRate = Math.round((presentCount / mockHostelStudents.length) * 100);

  const handleMarkAttendance = (attendanceData: {
    studentId: string;
    status: 'present' | 'absent' | 'late';
    remarks?: string;
  }) => {
    const student = mockHostelStudents.find(s => s.id === attendanceData.studentId);
    if (!student) return;

    const newRecord: AttendanceRecord = {
      id: `${attendanceRecords.length + 1}`,
      student,
      date: dateString,
      status: attendanceData.status,
      remarks: attendanceData.remarks,
      markedBy: "Admin",
      markedAt: new Date().toISOString()
    };

    setAttendanceRecords([...attendanceRecords, newRecord]);
    setIsMarkAttendanceOpen(false);
    toast({
      title: "Attendance Marked",
      description: `${student.name} marked as ${attendanceData.status}.`
    });
  };

  const handleBulkAttendance = (bulkData: { 
    status: 'present' | 'absent' | 'late';
    remarks?: string;
  }) => {
    const newRecords = studentsNotMarked.map(student => ({
      id: `${attendanceRecords.length + studentsNotMarked.indexOf(student) + 1}`,
      student,
      date: dateString,
      status: bulkData.status,
      remarks: bulkData.remarks,
      markedBy: "Admin",
      markedAt: new Date().toISOString()
    }));

    setAttendanceRecords([...attendanceRecords, ...newRecords]);
    setIsBulkAttendanceOpen(false);
    toast({
      title: "Bulk Attendance Marked",
      description: `${newRecords.length} students marked as ${bulkData.status}.`
    });
  };

  const updateAttendance = (recordId: string, status: 'present' | 'absent' | 'late') => {
    setAttendanceRecords(prev => prev.map(record => 
      record.id === recordId 
        ? { ...record, status, markedAt: new Date().toISOString() }
        : record
    ));
    toast({
      title: "Attendance Updated",
      description: "Attendance status has been updated."
    });
  };

  const exportAttendance = () => {
    toast({
      title: "Export Started",
      description: "Attendance report is being generated."
    });
  };

  const buildings = Array.from(new Set(mockHostelStudents.map(s => s.building)));

  return (
    <MainLayout 
      title="Hostel Attendance" 
      showBreadcrumb={true}
      breadcrumbItems={[
        { label: "Hostel", href: "/hostel" },
        { label: "Attendance" }
      ]}
    >
      <div className="space-y-6">
        {/* Date Selector and Stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[240px] justify-start text-left font-normal")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex space-x-2">
            <Button onClick={exportAttendance} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
            <Button onClick={() => setIsBulkAttendanceOpen(true)} variant="outline">
              <Users className="h-4 w-4 mr-2" />
              Bulk Mark
            </Button>
            <Button onClick={() => setIsMarkAttendanceOpen(true)}>
              <UserCheck className="h-4 w-4 mr-2" />
              Mark Attendance
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Present</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{presentCount}</div>
              <p className="text-xs text-muted-foreground">Students present</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Absent</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{absentCount}</div>
              <p className="text-xs text-muted-foreground">Students absent</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Late</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{lateCount}</div>
              <p className="text-xs text-muted-foreground">Students late</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{attendanceRate}%</div>
              <p className="text-xs text-muted-foreground">Overall attendance</p>
            </CardContent>
          </Card>
        </div>

        {/* Attendance Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Daily Attendance - {format(selectedDate, "MMM dd, yyyy")}</CardTitle>
                <CardDescription>
                  {studentsNotMarked.length > 0 && (
                    <span className="text-orange-600">
                      {studentsNotMarked.length} students not marked
                    </span>
                  )}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground transform -translate-y-1/2" />
                <Input
                  placeholder="Search by student name, ID, or room..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                </SelectContent>
              </Select>
              <Select value={buildingFilter} onValueChange={setBuildingFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by building" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Buildings</SelectItem>
                  {buildings.map(building => (
                    <SelectItem key={building} value={building}>{building}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Building</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Remarks</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => {
                    const StatusIcon = statusIcons[record.status];
                    return (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{record.student.name}</div>
                            <div className="text-sm text-muted-foreground">{record.student.studentId}</div>
                          </div>
                        </TableCell>
                        <TableCell>{record.student.roomNumber}</TableCell>
                        <TableCell>{record.student.building}</TableCell>
                        <TableCell>{record.student.class}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <StatusIcon className={cn("h-4 w-4", {
                              "text-green-600": record.status === 'present',
                              "text-red-600": record.status === 'absent',
                              "text-orange-600": record.status === 'late'
                            })} />
                            <Badge variant={statusVariants[record.status]}>
                              {record.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>{record.remarks || "—"}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Button
                              variant={record.status === 'present' ? 'default' : 'ghost'}
                              size="sm"
                              onClick={() => updateAttendance(record.id, 'present')}
                            >
                              P
                            </Button>
                            <Button
                              variant={record.status === 'absent' ? 'destructive' : 'ghost'}
                              size="sm"
                              onClick={() => updateAttendance(record.id, 'absent')}
                            >
                              A
                            </Button>
                            <Button
                              variant={record.status === 'late' ? 'secondary' : 'ghost'}
                              size="sm"
                              onClick={() => updateAttendance(record.id, 'late')}
                            >
                              L
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {/* Show unmarked students */}
                  {studentsNotMarked.map((student) => (
                    <TableRow key={student.id} className="bg-muted/30">
                      <TableCell>
                        <div>
                          <div className="font-medium">{student.name}</div>
                          <div className="text-sm text-muted-foreground">{student.studentId}</div>
                        </div>
                      </TableCell>
                      <TableCell>{student.roomNumber}</TableCell>
                      <TableCell>{student.building}</TableCell>
                      <TableCell>{student.class}</TableCell>
                      <TableCell>
                        <Badge variant="outline">Not Marked</Badge>
                      </TableCell>
                      <TableCell>—</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkAttendance({ studentId: student.id, status: 'present' })}
                          >
                            P
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkAttendance({ studentId: student.id, status: 'absent' })}
                          >
                            A
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkAttendance({ studentId: student.id, status: 'late' })}
                          >
                            L
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Mark Individual Attendance Dialog */}
        <Dialog open={isMarkAttendanceOpen} onOpenChange={setIsMarkAttendanceOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Mark Attendance</DialogTitle>
              <DialogDescription>
                Mark attendance for individual students.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleMarkAttendance({
                studentId: formData.get('studentId') as string,
                status: formData.get('status') as 'present' | 'absent' | 'late',
                remarks: formData.get('remarks') as string || undefined,
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
                      {studentsNotMarked.map(student => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.name} ({student.roomNumber})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="status" className="text-right">Status</Label>
                  <Select name="status" required>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="present">Present</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                      <SelectItem value="late">Late</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="remarks" className="text-right">Remarks</Label>
                  <Textarea id="remarks" name="remarks" className="col-span-3" placeholder="Optional remarks..." />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Mark Attendance</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Bulk Attendance Dialog */}
        <Dialog open={isBulkAttendanceOpen} onOpenChange={setIsBulkAttendanceOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Bulk Mark Attendance</DialogTitle>
              <DialogDescription>
                Mark attendance for all unmarked students ({studentsNotMarked.length} students).
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleBulkAttendance({
                status: formData.get('status') as 'present' | 'absent' | 'late',
                remarks: formData.get('remarks') as string || undefined,
              });
            }}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="bulkStatus" className="text-right">Status</Label>
                  <Select name="status" required>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select status for all" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="present">Present</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                      <SelectItem value="late">Late</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="bulkRemarks" className="text-right">Remarks</Label>
                  <Textarea id="bulkRemarks" name="remarks" className="col-span-3" placeholder="Optional remarks for all..." />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Mark All Students</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}