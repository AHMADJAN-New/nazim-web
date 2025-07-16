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
import { Textarea } from "@/components/ui/textarea";
import { 
  Building2, 
  Bed, 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  MoreHorizontal,
  MapPin,
  Calendar,
  Phone,
  Mail,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

// Mock data for hostel management
const hostelStats = {
  totalRooms: 120,
  occupiedRooms: 98,
  totalBeds: 480,
  occupiedBeds: 392,
  totalStudents: 392,
  pendingApplications: 15
};

const rooms = [
  {
    id: "R001",
    number: "101",
    floor: 1,
    building: "Block A",
    type: "4-bed",
    capacity: 4,
    occupied: 4,
    status: "full",
    students: ["Ahmad Ali", "Hassan Khan", "Omar Sheikh", "Bilal Ahmed"]
  },
  {
    id: "R002", 
    number: "102",
    floor: 1,
    building: "Block A", 
    type: "4-bed",
    capacity: 4,
    occupied: 3,
    status: "available",
    students: ["Tariq Shah", "Imran Malik", "Saeed Khan"]
  },
  {
    id: "R003",
    number: "103", 
    floor: 1,
    building: "Block A",
    type: "2-bed",
    capacity: 2,
    occupied: 0,
    status: "maintenance",
    students: []
  }
];

const students = [
  {
    id: "S001",
    name: "Ahmad Ali",
    fatherName: "Muhammad Ali",
    class: "Grade 10-A",
    room: "101",
    bed: "1",
    joinDate: "2024-01-15",
    phone: "+92-300-1234567",
    guardian: "Muhammad Ali",
    guardianPhone: "+92-321-7654321",
    status: "active",
    fees: "paid"
  },
  {
    id: "S002", 
    name: "Hassan Khan",
    fatherName: "Ibrahim Khan",
    class: "Grade 11-B", 
    room: "101",
    bed: "2",
    joinDate: "2024-01-20",
    phone: "+92-301-2345678",
    guardian: "Ibrahim Khan", 
    guardianPhone: "+92-322-8765432",
    status: "active",
    fees: "pending"
  }
];

const applications = [
  {
    id: "A001",
    studentName: "Zubair Ahmad",
    class: "Grade 9-A",
    fatherName: "Iqbal Ahmad",
    phone: "+92-302-3456789",
    applicationDate: "2024-03-01",
    preferredRoom: "Any",
    status: "pending",
    priority: "normal"
  },
  {
    id: "A002",
    studentName: "Yasir Malik", 
    class: "Grade 12-A",
    fatherName: "Asif Malik",
    phone: "+92-303-4567890", 
    applicationDate: "2024-03-02",
    preferredRoom: "Block A",
    status: "approved", 
    priority: "high"
  }
];

export default function HostelPage() {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBuilding, setFilterBuilding] = useState("all");
  const [selectedRoom, setSelectedRoom] = useState<any>(null);

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
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getFeeStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="bg-success text-success-foreground">Paid</Badge>;
      case 'pending':
        return <Badge variant="destructive">Pending</Badge>;
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
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
              <div className="text-2xl font-bold">{hostelStats.totalRooms}</div>
              <div className="text-xs text-muted-foreground">
                {hostelStats.occupiedRooms} occupied
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Beds</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{hostelStats.totalBeds}</div>
              <div className="text-xs text-muted-foreground">
                {hostelStats.occupiedBeds} occupied
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Hostel Students</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{hostelStats.totalStudents}</div>
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
                {Math.round((hostelStats.occupiedBeds / hostelStats.totalBeds) * 100)}%
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
              <div className="text-2xl font-bold">{hostelStats.pendingApplications}</div>
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
                {hostelStats.totalBeds - hostelStats.occupiedBeds}
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
                    {rooms.map((room) => (
                      <TableRow key={room.id}>
                        <TableCell className="font-medium">{room.number}</TableCell>
                        <TableCell>{room.building}</TableCell>
                        <TableCell>Floor {room.floor}</TableCell>
                        <TableCell>{room.type}</TableCell>
                        <TableCell>{room.occupied}/{room.capacity}</TableCell>
                        <TableCell>{getRoomStatusBadge(room.status)}</TableCell>
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
                                <DialogTitle>Room {selectedRoom?.number} Details</DialogTitle>
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
                                        {selectedRoom.building}
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
                                        {selectedRoom.occupied} students
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <Label>Current Students</Label>
                                    <div className="mt-2 space-y-2">
                                      {selectedRoom.students.length > 0 ? (
                                        selectedRoom.students.map((student: string, index: number) => (
                                          <div key={index} className="flex items-center justify-between p-2 border rounded">
                                            <span className="text-sm">{student}</span>
                                            <Badge variant="outline">Bed {index + 1}</Badge>
                                          </div>
                                        ))
                                      ) : (
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
              <Button>
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
                      <TableHead>Father's Name</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Room</TableHead>
                      <TableHead>Join Date</TableHead>
                      <TableHead>Fee Status</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>{student.fatherName}</TableCell>
                        <TableCell>{student.class}</TableCell>
                        <TableCell>{student.room}</TableCell>
                        <TableCell>{student.joinDate}</TableCell>
                        <TableCell>{getFeeStatusBadge(student.fees)}</TableCell>
                        <TableCell>{getStudentStatusBadge(student.status)}</TableCell>
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
          </TabsContent>

          {/* Applications Tab */}
          <TabsContent value="applications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Hostel Applications</CardTitle>
                <CardDescription>
                  Review and process new hostel applications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Father's Name</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Application Date</TableHead>
                      <TableHead>Preferred Room</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applications.map((app) => (
                      <TableRow key={app.id}>
                        <TableCell className="font-medium">{app.studentName}</TableCell>
                        <TableCell>{app.fatherName}</TableCell>
                        <TableCell>{app.class}</TableCell>
                        <TableCell>{app.applicationDate}</TableCell>
                        <TableCell>{app.preferredRoom}</TableCell>
                        <TableCell>
                          <Badge variant={app.status === 'approved' ? 'default' : 'secondary'}>
                            {app.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button variant="outline" size="sm">
                              View
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
                        {Math.round((hostelStats.occupiedBeds / hostelStats.totalBeds) * 100)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Available Beds</span>
                      <span className="font-semibold">
                        {hostelStats.totalBeds - hostelStats.occupiedBeds}
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