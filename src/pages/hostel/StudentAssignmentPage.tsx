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
import { Users, UserPlus, UserMinus, Building, Search, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useHostelAllocations, useHostelRooms, useCreateHostelAllocation, useUpdateHostelAllocation } from "@/hooks/useHostel";
import { useStudents } from "@/hooks/useStudents";

const statusVariants = {
  active: "default",
  checkout: "secondary",
  pending: "outline",
} as const;

export default function StudentAssignmentPage() {
  const { toast } = useToast();
  const { data: allocations = [] } = useHostelAllocations();
  const { data: rooms = [] } = useHostelRooms();
  const { data: students = [] } = useStudents({ page: 1, pageSize: 50 });
  const createAllocation = useCreateHostelAllocation();
  const updateAllocation = useUpdateHostelAllocation();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isCheckoutDialogOpen, setIsCheckoutDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);

  const assignments = allocations;

  const filteredAssignments = assignments.filter(assignment => {
    const studentName = assignment.student?.profiles?.full_name || "";
    const studentId = assignment.student?.student_id || "";
    const roomNumber = assignment.room?.room_number || "";
    const matchesSearch = studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      roomNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || assignment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalAssigned = assignments.filter(a => a.status === "active").length;
  const totalCheckouts = assignments.filter(a => a.status === "checkout").length;
  const availableRooms = rooms.filter(r => (r.occupied_count || 0) < r.capacity);

  const unassignedStudents = students.filter(s =>
    !assignments.some(a => a.student_id === s.student_id && a.status === "active")
  );

  const handleAssignStudent = (data: { studentId: string; roomId: string; assignedDate: string }) => {
    const room = rooms.find(r => r.id === data.roomId);
    if (!room) return;
    createAllocation.mutate({
      student_id: data.studentId,
      room_id: data.roomId,
      allocated_date: data.assignedDate,
      status: "active",
      allocated_by: "Admin",
      monthly_fee: room.monthly_fee,
    });
    setIsAssignDialogOpen(false);
    toast({ title: "Student Assigned", description: "Room allocated successfully" });
  };

  const handleCheckoutStudent = (assignmentId: string, checkoutDate: string) => {
    updateAllocation.mutate({ id: assignmentId, status: "checkout", checkout_date: checkoutDate });
    setIsCheckoutDialogOpen(false);
    setSelectedAssignment(null);
    toast({ title: "Student Checked Out", description: "Student has been checked out." });
  };

  return (
    <MainLayout
      title="Student Assignment"
      showBreadcrumb={true}
      breadcrumbItems={[
        { label: "Hostel", href: "/hostel" },
        { label: "Student Assignment" },
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
              <div className="text-2xl font-bold">{availableRooms.length}</div>
              <p className="text-xs text-muted-foreground">Ready for assignment</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Checkouts</CardTitle>
              <UserMinus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCheckouts}</div>
              <p className="text-xs text-muted-foreground">Total checkouts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Rooms</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rooms.length}</div>
              <p className="text-xs text-muted-foreground">Across all blocks</p>
            </CardContent>
          </Card>
        </div>

        {/* Assignments Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Current Assignments</CardTitle>
                <CardDescription>Manage student room allocations</CardDescription>
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
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="checkout">Checkout</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssignments.map(assignment => (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{assignment.student?.profiles?.full_name}</div>
                          <div className="text-sm text-muted-foreground">{assignment.student?.student_id}</div>
                        </div>
                      </TableCell>
                      <TableCell>{assignment.room?.room_number}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariants[assignment.status as keyof typeof statusVariants] || "default"}>
                          {assignment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {assignment.status === "active" && (
                          <Button size="sm" variant="outline" onClick={() => { setSelectedAssignment(assignment); setIsCheckoutDialogOpen(true); }}>
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assign Student Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Student</DialogTitle>
            <DialogDescription>Allocate a student to a room</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleAssignStudent({
                studentId: formData.get("studentId") as string,
                roomId: formData.get("roomId") as string,
                assignedDate: formData.get("assignedDate") as string,
              });
            }}
          >
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Student</Label>
                <Select name="studentId">
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {unassignedStudents.map(student => (
                      <SelectItem key={student.student_id} value={student.student_id}>{student.profiles?.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Room</Label>
                <Select name="roomId">
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select room" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRooms.map(room => (
                      <SelectItem key={room.id} value={room.id}>{room.room_number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="assignedDate" className="text-right">Assigned Date</Label>
                <Input name="assignedDate" type="date" className="col-span-3" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Assign</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutDialogOpen} onOpenChange={setIsCheckoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Checkout Student</DialogTitle>
            <DialogDescription>Record checkout for a student</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!selectedAssignment) return;
              const formData = new FormData(e.currentTarget);
              handleCheckoutStudent(selectedAssignment.id, formData.get("checkoutDate") as string);
            }}
          >
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="checkoutDate" className="text-right">Checkout Date</Label>
                <Input name="checkoutDate" type="date" className="col-span-3" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Checkout</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

