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
import { Users, UserPlus, UserMinus, Building, Search, Filter, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Student {
  id: string;
  name: string;
  studentId: string;
  class: string;
  phone: string;
  guardianPhone: string;
}

interface RoomAssignment {
  id: string;
  student: Student;
  roomNumber: string;
  building: string;
  assignedDate: string;
  monthlyFee: number;
  status: 'active' | 'checkout' | 'pending';
  checkoutDate?: string;
}

const mockStudents: Student[] = [
  {
    id: "1",
    name: "Ahmed Hassan",
    studentId: "STU001",
    class: "Class 10-A",
    phone: "+92-300-1234567",
    guardianPhone: "+92-301-1234567"
  },
  {
    id: "2",
    name: "Fatima Ali",
    studentId: "STU002", 
    class: "Class 9-B",
    phone: "+92-300-2345678",
    guardianPhone: "+92-301-2345678"
  },
  {
    id: "3",
    name: "Omar Khan",
    studentId: "STU003",
    class: "Class 11-A",
    phone: "+92-300-3456789",
    guardianPhone: "+92-301-3456789"
  }
];

const mockAssignments: RoomAssignment[] = [
  {
    id: "1",
    student: mockStudents[0],
    roomNumber: "101",
    building: "Block A",
    assignedDate: "2024-01-15",
    monthlyFee: 3000,
    status: "active"
  },
  {
    id: "2",
    student: mockStudents[1],
    roomNumber: "102",
    building: "Block A",
    assignedDate: "2024-01-10",
    monthlyFee: 4500,
    status: "active"
  }
];

const mockAvailableRooms = [
  { id: "r1", roomNumber: "103", building: "Block A", capacity: 2, currentOccupancy: 0, monthlyFee: 3000 },
  { id: "r2", roomNumber: "201", building: "Block B", capacity: 3, currentOccupancy: 1, monthlyFee: 2500 },
  { id: "r3", roomNumber: "301", building: "Block C", capacity: 1, currentOccupancy: 0, monthlyFee: 4500 }
];

const statusVariants = {
  active: "default",
  checkout: "secondary",
  pending: "outline"
} as const;

export default function StudentAssignmentPage() {
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<RoomAssignment[]>(mockAssignments);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isCheckoutDialogOpen, setIsCheckoutDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<RoomAssignment | null>(null);

  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = assignment.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         assignment.student.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         assignment.roomNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || assignment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalAssigned = assignments.filter(a => a.status === 'active').length;
  const totalCheckouts = assignments.filter(a => a.status === 'checkout').length;

  const handleAssignStudent = (assignmentData: {
    studentId: string;
    roomId: string;
    assignedDate: string;
  }) => {
    const student = mockStudents.find(s => s.id === assignmentData.studentId);
    const room = mockAvailableRooms.find(r => r.id === assignmentData.roomId);
    
    if (!student || !room) return;

    const newAssignment: RoomAssignment = {
      id: `${assignments.length + 1}`,
      student,
      roomNumber: room.roomNumber,
      building: room.building,
      assignedDate: assignmentData.assignedDate,
      monthlyFee: room.monthlyFee,
      status: 'active'
    };

    setAssignments([...assignments, newAssignment]);
    setIsAssignDialogOpen(false);
    toast({
      title: "Student Assigned",
      description: `${student.name} has been assigned to room ${room.roomNumber}.`
    });
  };

  const handleCheckoutStudent = (assignmentId: string, checkoutDate: string) => {
    setAssignments(prev => prev.map(assignment => 
      assignment.id === assignmentId 
        ? { ...assignment, status: 'checkout' as const, checkoutDate }
        : assignment
    ));
    
    setIsCheckoutDialogOpen(false);
    setSelectedAssignment(null);
    toast({
      title: "Student Checked Out",
      description: "Student has been successfully checked out from the hostel."
    });
  };

  const removeAssignment = (assignmentId: string) => {
    setAssignments(prev => prev.filter(a => a.id !== assignmentId));
    toast({
      title: "Assignment Removed",
      description: "Room assignment has been removed."
    });
  };

  const initiateCheckout = (assignment: RoomAssignment) => {
    setSelectedAssignment(assignment);
    setIsCheckoutDialogOpen(true);
  };

  return (
    <MainLayout 
      title="Student Assignment" 
      showBreadcrumb={true}
      breadcrumbItems={[
        { label: "Hostel", href: "/hostel" },
        { label: "Student Assignment" }
      ]}
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assigned</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalAssigned}</div>
              <p className="text-xs text-muted-foreground">Active hostel residents</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Rooms</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockAvailableRooms.filter(r => r.currentOccupancy < r.capacity).length}</div>
              <p className="text-xs text-muted-foreground">Ready for assignment</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month Checkouts</CardTitle>
              <UserMinus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCheckouts}</div>
              <p className="text-xs text-muted-foreground">Students checked out</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹{assignments.filter(a => a.status === 'active').reduce((sum, a) => sum + a.monthlyFee, 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">From hostel fees</p>
            </CardContent>
          </Card>
        </div>

        {/* Assignments Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Room Assignments</CardTitle>
                <CardDescription>Manage student room assignments and checkouts</CardDescription>
              </div>
              <Button onClick={() => setIsAssignDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Assign Student
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground transform -translate-y-1/2" />
                <Input
                  placeholder="Search by student name, ID, or room number..."
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
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="checkout">Checked Out</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
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
                    <TableHead>Assigned Date</TableHead>
                    <TableHead>Monthly Fee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{assignment.student.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {assignment.student.studentId} • {assignment.student.class}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{assignment.roomNumber}</TableCell>
                      <TableCell>{assignment.building}</TableCell>
                      <TableCell>{assignment.assignedDate}</TableCell>
                      <TableCell>₹{assignment.monthlyFee}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariants[assignment.status]}>
                          {assignment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {assignment.status === 'active' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => initiateCheckout(assignment)}
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAssignment(assignment.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
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

        {/* Assign Student Dialog */}
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Assign Student to Room</DialogTitle>
              <DialogDescription>
                Select a student and assign them to an available room.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleAssignStudent({
                studentId: formData.get('studentId') as string,
                roomId: formData.get('roomId') as string,
                assignedDate: formData.get('assignedDate') as string,
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
                        !assignments.some(a => a.student.id === student.id && a.status === 'active')
                      ).map(student => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.name} ({student.studentId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="roomId" className="text-right">Room</Label>
                  <Select name="roomId" required>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select room" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockAvailableRooms.filter(room => room.currentOccupancy < room.capacity).map(room => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.roomNumber} - {room.building} (₹{room.monthlyFee}/month)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="assignedDate" className="text-right">Assigned Date</Label>
                  <Input 
                    id="assignedDate" 
                    name="assignedDate" 
                    type="date" 
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="col-span-3" 
                    required 
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Assign Student</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Checkout Dialog */}
        <Dialog open={isCheckoutDialogOpen} onOpenChange={setIsCheckoutDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Student Checkout</DialogTitle>
              <DialogDescription>
                Confirm checkout details for the student.
              </DialogDescription>
            </DialogHeader>
            {selectedAssignment && (
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleCheckoutStudent(
                  selectedAssignment.id,
                  formData.get('checkoutDate') as string
                );
              }}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Student</Label>
                    <div className="col-span-3">
                      <p className="font-medium">{selectedAssignment.student.name}</p>
                      <p className="text-sm text-muted-foreground">{selectedAssignment.student.studentId}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Room</Label>
                    <div className="col-span-3">
                      <p>{selectedAssignment.roomNumber} - {selectedAssignment.building}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="checkoutDate" className="text-right">Checkout Date</Label>
                    <Input 
                      id="checkoutDate" 
                      name="checkoutDate" 
                      type="date" 
                      defaultValue={new Date().toISOString().split('T')[0]}
                      className="col-span-3" 
                      required 
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" variant="destructive">Confirm Checkout</Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}