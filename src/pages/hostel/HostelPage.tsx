// Nazim School Management System - Hostel Management
import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Building2,
  Users,
  UserPlus,
  Search,
  Filter,
  MoreHorizontal,
  CheckCircle
} from "lucide-react";
import { useHostelRooms, useHostelAllocations, useCreateHostelAllocation, useUpdateHostelAllocation } from "@/hooks/useHostel";
import { useLanguage } from "@/hooks/useLanguage";

export default function HostelPage() {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBuilding, setFilterBuilding] = useState("all");
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const { data: rooms = [] } = useHostelRooms();
  const { data: allocations = [] } = useHostelAllocations();
  const createAllocation = useCreateHostelAllocation();
  const updateAllocation = useUpdateHostelAllocation();
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isApplicationDialogOpen, setIsApplicationDialogOpen] = useState(false);
  const [assignmentData, setAssignmentData] = useState({ studentId: "", roomId: "", allocatedDate: "" });
  const [applicationData, setApplicationData] = useState({ studentId: "", roomId: "", applicationDate: "" });

  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter(r => r.occupied_count === r.capacity).length;
  const totalBeds = rooms.reduce((sum, r) => sum + (r.capacity || 0), 0);
  const occupiedBeds = rooms.reduce((sum, r) => sum + (r.occupied_count || 0), 0);
  const totalStudents = allocations.filter(a => a.status === "active").length;
  const pendingApplications = allocations.filter(a => a.status === "pending").length;

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.room_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBuilding = filterBuilding === "all" || room.branch_id === filterBuilding;
    return matchesSearch && matchesBuilding;
  });

  const activeAllocations = allocations.filter(a => a.status === "active");
  const pendingAllocations = allocations.filter(a => a.status === "pending");

  const handleAssignStudent = (e: React.FormEvent) => {
    e.preventDefault();
    createAllocation.mutate({
      student_id: assignmentData.studentId,
      room_id: assignmentData.roomId,
      allocated_date: assignmentData.allocatedDate,
      status: "active",
      allocated_by: "system",
    });
    setIsAssignDialogOpen(false);
    setAssignmentData({ studentId: "", roomId: "", allocatedDate: "" });
  };

  const handleCreateApplication = (e: React.FormEvent) => {
    e.preventDefault();
    createAllocation.mutate({
      student_id: applicationData.studentId,
      room_id: applicationData.roomId,
      allocated_date: applicationData.applicationDate,
      status: "pending",
      allocated_by: "system",
    });
    setIsApplicationDialogOpen(false);
    setApplicationData({ studentId: "", roomId: "", applicationDate: "" });
  };

  const handleApproveApplication = (id: string) => {
    updateAllocation.mutate({ id, status: "active" });
  };

  const getRoomStatusBadge = (status: string) => {
    switch (status) {
      case 'full':
        return <Badge variant="secondary">Full</Badge>;
      case 'available': 
        return <Badge variant="default">Available</Badge>;
      case 'maintenance':
        return <Badge variant="destructive">Maintenance</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getStudentStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'checkout':
        return <Badge variant="destructive">Checkout</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <MainLayout
      title={t('nav.hostel')}
      showBreadcrumb={true}
      breadcrumbItems={[
        { label: t('nav.hostel') }
      ]}
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Rooms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalRooms}</div>
              <div className="text-xs text-muted-foreground">
                {occupiedRooms} occupied
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Beds</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalBeds}</div>
              <div className="text-xs text-muted-foreground">
                {occupiedBeds} occupied
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Hostel Students</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStudents}</div>
              <div className="text-xs text-muted-foreground">
                Currently residing
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0}%
              </div>
              <div className="text-xs text-muted-foreground">
                Current occupancy
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingApplications}</div>
              <div className="text-xs text-muted-foreground">
                Pending review
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Available Beds</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {totalBeds - occupiedBeds}
              </div>
              <div className="text-xs text-muted-foreground">
                Ready to assign
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="rooms" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
            <TabsTrigger value="rooms" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Rooms</span>
            </TabsTrigger>
            <TabsTrigger value="students" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Students</span>
            </TabsTrigger>
            <TabsTrigger value="applications" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Applications</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <MoreHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
          </TabsList>

          {/* Rooms Tab */}
          <TabsContent value="rooms" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search rooms..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filterBuilding} onValueChange={setFilterBuilding}>
                <SelectTrigger className="w-full sm:w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Building" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Buildings</SelectItem>
                  <SelectItem value="block-a">Block A</SelectItem>
                  <SelectItem value="block-b">Block B</SelectItem>
                  <SelectItem value="block-c">Block C</SelectItem>
                </SelectContent>
              </Select>
              <Button>
                <Building2 className="h-4 w-4 mr-2" />
                Add Room
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Room Management</CardTitle>
                <CardDescription>
                  Manage hostel rooms, capacity, and student assignments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Room No.</TableHead>
                      <TableHead>Building</TableHead>
                      <TableHead>Floor</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Occupancy</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRooms.map((room) => (
                      <TableRow key={room.id}>
                        <TableCell className="font-medium">{room.room_number}</TableCell>
                        <TableCell>{room.branch_id}</TableCell>
                        <TableCell>Floor {room.floor}</TableCell>
                        <TableCell>{room.room_type}</TableCell>
                        <TableCell>{room.occupied_count}/{room.capacity}</TableCell>
                        <TableCell>{getRoomStatusBadge(room.occupied_count === room.capacity ? 'full' : 'available')}</TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedRoom(room)}
                              >
                                View Details
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Room {selectedRoom?.room_number} Details</DialogTitle>
                                <DialogDescription>
                                  Room information and student assignments
                                </DialogDescription>
                              </DialogHeader>
                              {selectedRoom && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>Building</Label>
                                      <p className="text-sm text-muted-foreground">
                                        {selectedRoom.branch_id}
                                      </p>
                                    </div>
                                    <div>
                                      <Label>Floor</Label>
                                      <p className="text-sm text-muted-foreground">
                                        Floor {selectedRoom.floor}
                                      </p>
                                    </div>
                                    <div>
                                      <Label>Capacity</Label>
                                      <p className="text-sm text-muted-foreground">
                                        {selectedRoom.capacity} beds
                                      </p>
                                    </div>
                                    <div>
                                      <Label>Occupied</Label>
                                      <p className="text-sm text-muted-foreground">
                                        {selectedRoom.occupied_count} students
                                      </p>
                                    </div>
                                  </div>

                                  <div>
                                    <Label>Current Students</Label>
                                    <div className="mt-2 space-y-2">
                                      {allocations.filter(a => a.room_id === selectedRoom.id && a.status === 'active').map((alloc, index) => (
                                        <div key={alloc.id} className="flex items-center justify-between p-2 border rounded">
                                          <span className="text-sm">{alloc.student?.profiles?.full_name || alloc.student_id}</span>
                                          <Badge variant="outline">Bed {index + 1}</Badge>
                                        </div>
                                      ))}
                                      {allocations.filter(a => a.room_id === selectedRoom.id && a.status === 'active').length === 0 && (
                                        <p className="text-sm text-muted-foreground">No students assigned</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search students..."
                    className="pl-10"
                  />
                </div>
              </div>
              <Button onClick={() => setIsAssignDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Assign Student
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Hostel Students</CardTitle>
                <CardDescription>
                  Manage students residing in the hostel
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Room</TableHead>
                      <TableHead>Allocated Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeAllocations.map((alloc) => (
                      <TableRow key={alloc.id}>
                        <TableCell className="font-medium">{alloc.student?.profiles?.full_name || alloc.student_id}</TableCell>
                        <TableCell>{alloc.room?.room_number}</TableCell>
                        <TableCell>{alloc.allocated_date}</TableCell>
                        <TableCell>{getStudentStatusBadge(alloc.status)}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            View Profile
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Student</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAssignStudent} className="space-y-4">
                  <div>
                    <Label>Student ID</Label>
                    <Input value={assignmentData.studentId} onChange={(e) => setAssignmentData({ ...assignmentData, studentId: e.target.value })} />
                  </div>
                  <div>
                    <Label>Room</Label>
                    <Select value={assignmentData.roomId} onValueChange={(value) => setAssignmentData({ ...assignmentData, roomId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select room" />
                      </SelectTrigger>
                      <SelectContent>
                        {rooms.map((room) => (
                          <SelectItem key={room.id} value={room.id}>{room.room_number}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Allocated Date</Label>
                    <Input type="date" value={assignmentData.allocatedDate} onChange={(e) => setAssignmentData({ ...assignmentData, allocatedDate: e.target.value })} />
                  </div>
                  <Button type="submit">Assign</Button>
                </form>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Applications Tab */}
          <TabsContent value="applications" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Hostel Applications</CardTitle>
                    <CardDescription>
                      Review and process new hostel applications
                    </CardDescription>
                  </div>
                  <Button onClick={() => setIsApplicationDialogOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    New Application
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Room</TableHead>
                      <TableHead>Application Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingAllocations.map((app) => (
                      <TableRow key={app.id}>
                        <TableCell className="font-medium">{app.student?.profiles?.full_name || app.student_id}</TableCell>
                        <TableCell>{app.room?.room_number}</TableCell>
                        <TableCell>{app.allocated_date}</TableCell>
                        <TableCell>
                          <Badge variant={app.status === 'approved' ? 'default' : 'secondary'}>
                            {app.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleApproveApplication(app.id)}>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Dialog open={isApplicationDialogOpen} onOpenChange={setIsApplicationDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New Application</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateApplication} className="space-y-4">
                  <div>
                    <Label>Student ID</Label>
                    <Input value={applicationData.studentId} onChange={(e) => setApplicationData({ ...applicationData, studentId: e.target.value })} />
                  </div>
                  <div>
                    <Label>Preferred Room</Label>
                    <Select value={applicationData.roomId} onValueChange={(value) => setApplicationData({ ...applicationData, roomId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select room" />
                      </SelectTrigger>
                      <SelectContent>
                        {rooms.map((room) => (
                          <SelectItem key={room.id} value={room.id}>{room.room_number}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Application Date</Label>
                    <Input type="date" value={applicationData.applicationDate} onChange={(e) => setApplicationData({ ...applicationData, applicationDate: e.target.value })} />
                  </div>
                  <Button type="submit">Submit</Button>
                </form>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Occupancy Report</CardTitle>
                  <CardDescription>
                    Monthly occupancy statistics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Current Occupancy</span>
                      <span className="font-semibold">
                        {totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Available Beds</span>
                      <span className="font-semibold">
                        {totalBeds - occupiedBeds}
                      </span>
                    </div>
                    <Button className="w-full" variant="outline">
                      Generate Detailed Report
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Fee Collection</CardTitle>
                  <CardDescription>
                    Hostel fee collection summary
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Total Collected</span>
                      <span className="font-semibold">Rs. 2,45,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pending</span>
                      <span className="font-semibold text-warning">Rs. 15,000</span>
                    </div>
                    <Button className="w-full" variant="outline">
                      View Fee Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}