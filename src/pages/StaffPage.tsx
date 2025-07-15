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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { UserPlus, Search, Edit, Trash2, Eye, Users, GraduationCap, Shield, Calculator, BookOpen, Coffee } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'teacher' | 'admin' | 'accountant' | 'librarian' | 'security' | 'support';
  department: string;
  joiningDate: string;
  salary: number;
  subjects?: string[];
  classes?: string[];
  status: 'active' | 'inactive' | 'on-leave';
  address: string;
  qualification: string;
  experience: number; // years
}

const mockStaff: StaffMember[] = [
  {
    id: "STF001",
    name: "استاد احمد علی",
    email: "ahmad.ali@school.edu.pk",
    phone: "+92-300-1234567",
    role: "teacher",
    department: "Mathematics",
    joiningDate: "2022-01-15",
    salary: 45000,
    subjects: ["Mathematics", "Physics"],
    classes: ["Class 6-A", "Class 7-A"],
    status: "active",
    address: "House 123, Street 45, Islamabad",
    qualification: "M.Sc Mathematics",
    experience: 5
  },
  {
    id: "STF002",
    name: "Miss Sarah Khan",
    email: "sarah.khan@school.edu.pk",
    phone: "+92-301-2345678",
    role: "teacher",
    department: "English",
    joiningDate: "2021-08-20",
    salary: 42000,
    subjects: ["English", "Literature"],
    classes: ["Class 8-A", "Class 9-A"],
    status: "active",
    address: "Apartment 45, Block B, Rawalpindi",
    qualification: "M.A English Literature",
    experience: 7
  },
  {
    id: "STF003",
    name: "محمد حسن",
    email: "hassan@school.edu.pk",
    phone: "+92-302-3456789",
    role: "accountant",
    department: "Finance",
    joiningDate: "2020-03-10",
    salary: 50000,
    status: "active",
    address: "House 67, Street 12, Islamabad",
    qualification: "MBA Finance",
    experience: 8
  }
];

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>(mockStaff);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [showNewStaffDialog, setShowNewStaffDialog] = useState(false);
  const { toast } = useToast();

  const handleDeleteStaff = (id: string) => {
    setStaff(prev => prev.filter(member => member.id !== id));
    toast({
      title: "Staff Member Deleted",
      description: "Staff member has been successfully removed"
    });
  };

  const getStatusBadge = (status: StaffMember['status']) => {
    const variants = {
      active: "default",
      inactive: "secondary",
      "on-leave": "outline"
    } as const;
    
    return (
      <Badge variant={variants[status]}>
        {status.replace('-', ' ').charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getRoleIcon = (role: StaffMember['role']) => {
    const icons = {
      teacher: GraduationCap,
      admin: Shield,
      accountant: Calculator,
      librarian: BookOpen,
      security: Shield,
      support: Coffee
    };
    return icons[role];
  };

  const filteredStaff = staff.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || member.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const statsData = {
    total: staff.length,
    teachers: staff.filter(s => s.role === 'teacher').length,
    admin: staff.filter(s => s.role === 'admin').length,
    support: staff.filter(s => s.role !== 'teacher' && s.role !== 'admin').length
  };

  return (
    <MainLayout 
      title="Staff Management"
      showBreadcrumb
      breadcrumbItems={[
        { label: "Staff" }
      ]}
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="flex flex-col md:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search staff..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="teacher">Teachers</SelectItem>
                <SelectItem value="admin">Administrators</SelectItem>
                <SelectItem value="accountant">Accountants</SelectItem>
                <SelectItem value="librarian">Librarians</SelectItem>
                <SelectItem value="security">Security</SelectItem>
                <SelectItem value="support">Support Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Dialog open={showNewStaffDialog} onOpenChange={setShowNewStaffDialog}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Staff Member
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Staff Member</DialogTitle>
                <DialogDescription>
                  Enter the details for the new staff member
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="staff-name">Full Name *</Label>
                  <Input id="staff-name" placeholder="Enter full name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="staff-email">Email *</Label>
                  <Input id="staff-email" type="email" placeholder="Enter email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="staff-phone">Phone *</Label>
                  <Input id="staff-phone" placeholder="+92-300-0000000" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="staff-role">Role *</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="teacher">Teacher</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                      <SelectItem value="accountant">Accountant</SelectItem>
                      <SelectItem value="librarian">Librarian</SelectItem>
                      <SelectItem value="security">Security</SelectItem>
                      <SelectItem value="support">Support Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="staff-department">Department</Label>
                  <Input id="staff-department" placeholder="Enter department" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="staff-salary">Salary (PKR)</Label>
                  <Input id="staff-salary" type="number" placeholder="45000" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="staff-qualification">Qualification</Label>
                  <Input id="staff-qualification" placeholder="e.g., M.Sc Mathematics" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="staff-address">Address</Label>
                  <Textarea id="staff-address" placeholder="Enter complete address" />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button className="flex-1" onClick={() => setShowNewStaffDialog(false)}>
                  Add Staff Member
                </Button>
                <Button variant="outline" onClick={() => setShowNewStaffDialog(false)}>
                  Cancel
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Staff</p>
                  <p className="text-2xl font-bold">{statsData.total}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Teachers</p>
                  <p className="text-2xl font-bold">{statsData.teachers}</p>
                </div>
                <GraduationCap className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Admin Staff</p>
                  <p className="text-2xl font-bold">{statsData.admin}</p>
                </div>
                <Shield className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Support Staff</p>
                  <p className="text-2xl font-bold">{statsData.support}</p>
                </div>
                <Coffee className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Staff Overview</TabsTrigger>
            <TabsTrigger value="teachers">Teachers</TabsTrigger>
            <TabsTrigger value="payroll">Payroll</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Staff Directory</CardTitle>
                <CardDescription>
                  Complete list of all staff members and their details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Joining Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStaff.map((member) => {
                      const RoleIcon = getRoleIcon(member.role);
                      return (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium">{member.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <RoleIcon className="w-4 h-4 text-muted-foreground" />
                              {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                            </div>
                          </TableCell>
                          <TableCell>{member.department}</TableCell>
                          <TableCell>{member.email}</TableCell>
                          <TableCell>{member.phone}</TableCell>
                          <TableCell>{member.joiningDate}</TableCell>
                          <TableCell>{getStatusBadge(member.status)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="outline" size="sm">
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleDeleteStaff(member.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="teachers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Teacher Management</CardTitle>
                <CardDescription>
                  Manage teaching staff and their subject assignments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Teacher Name</TableHead>
                      <TableHead>Qualification</TableHead>
                      <TableHead>Experience</TableHead>
                      <TableHead>Subjects</TableHead>
                      <TableHead>Classes</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staff.filter(s => s.role === 'teacher').map((teacher) => (
                      <TableRow key={teacher.id}>
                        <TableCell className="font-medium">{teacher.name}</TableCell>
                        <TableCell>{teacher.qualification}</TableCell>
                        <TableCell>{teacher.experience} years</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {teacher.subjects?.map((subject, index) => (
                              <Badge key={index} variant="outline">{subject}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {teacher.classes?.map((cls, index) => (
                              <Badge key={index} variant="secondary">{cls}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">Assign</Button>
                            <Button variant="outline" size="sm">Schedule</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payroll" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Payroll Management</CardTitle>
                    <CardDescription>
                      Manage staff salaries and payroll processing
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline">Generate Payroll</Button>
                    <Button>Process Payments</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Basic Salary</TableHead>
                      <TableHead>Allowances</TableHead>
                      <TableHead>Deductions</TableHead>
                      <TableHead>Net Salary</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staff.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.name}</TableCell>
                        <TableCell>{member.role}</TableCell>
                        <TableCell>PKR {member.salary.toLocaleString()}</TableCell>
                        <TableCell>PKR 5,000</TableCell>
                        <TableCell>PKR 2,000</TableCell>
                        <TableCell className="font-bold">PKR {(member.salary + 5000 - 2000).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="default">Processed</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">View Slip</Button>
                            <Button variant="outline" size="sm">Edit</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Tracking</CardTitle>
                <CardDescription>
                  Monitor and evaluate staff performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {staff.filter(s => s.role === 'teacher').map((teacher) => (
                    <Card key={teacher.id}>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <h4 className="font-semibold">{teacher.name}</h4>
                          <p className="text-sm text-muted-foreground">{teacher.department}</p>
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>Teaching Quality:</span>
                              <span className="font-medium">4.5/5</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Punctuality:</span>
                              <span className="font-medium">4.8/5</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Student Feedback:</span>
                              <span className="font-medium">4.3/5</span>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" className="w-full">
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}