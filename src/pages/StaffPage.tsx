import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { UserPlus, Search, Edit, Trash2, Eye, Users, GraduationCap, Shield, Calculator, BookOpen, Coffee } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useStaff, useDeleteStaff, useCreateStaff, useStaffStats } from "@/hooks/useStaff";

export default function StaffPage() {
  const { data: staff = [], isLoading } = useStaff();
  const { data: staffStats } = useStaffStats();
  const deleteStaffMutation = useDeleteStaff();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [showNewStaffDialog, setShowNewStaffDialog] = useState(false);
  const { toast } = useToast();
  const createStaffMutation = useCreateStaff();
  const queryClient = useQueryClient();

  const staffSchema = z.object({
    fullName: z.string().min(1, "Full name is required"),
    email: z.string().email("Invalid email"),
    phone: z.string().min(1, "Phone is required"),
    role: z.string().min(1, "Role is required"),
    department: z.string().optional(),
    salary: z
      .coerce.number()
      .min(0, "Salary must be at least 0")
      .max(1000000, "Salary must be less than 1,000,000")
      .optional(),
    qualification: z.string().optional(),
    address: z.string().optional(),
  });

  type StaffFormValues = z.infer<typeof staffSchema>;

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      role: "",
      department: "",
      salary: undefined,
      qualification: "",
      address: "",
    },
  });

  const handleDeleteStaff = (id: string) => {
    deleteStaffMutation.mutate(id);
  };

  const onSubmit = (data: StaffFormValues) => {
    const staffData = {
      user_id: "",
      employee_id: "",
      branch_id: "",
      department: data.department,
      designation: data.role,
      qualification: data.qualification,
      salary: data.salary,
    };

    createStaffMutation.mutate(staffData, {
      onSuccess: () => {
        toast({ title: "Staff member added successfully" });
        queryClient.invalidateQueries({ queryKey: ["staff"] });
        setShowNewStaffDialog(false);
        form.reset();
      },
      onError: (error: Error) => {
        toast({
          title: "Error creating staff",
          description: error.message,
        });
      },
    });
  };

  const getStatusBadge = (role: string) => {
    return (
      <Badge variant="default">
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </Badge>
    );
  };

  const getRoleIcon = (role: string) => {
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
    const matchesSearch = (member.profile?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (member.profile?.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (member.department || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || member.designation === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (isLoading) {
    return (
      <MainLayout title="Staff Management">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">Loading staff data...</div>
        </div>
      </MainLayout>
    );
  }

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
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="staff-name">Full Name *</FormLabel>
                        <FormControl>
                          <Input id="staff-name" placeholder="Enter full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="staff-email">Email *</FormLabel>
                        <FormControl>
                          <Input id="staff-email" type="email" placeholder="Enter email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="staff-phone">Phone *</FormLabel>
                        <FormControl>
                          <Input id="staff-phone" placeholder="+92-300-0000000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="staff-role">Role *</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
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
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="staff-department">Department</FormLabel>
                        <FormControl>
                          <Input id="staff-department" placeholder="Enter department" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="salary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="staff-salary">Salary (PKR)</FormLabel>
                        <FormControl>
                          <Input
                            id="staff-salary"
                            type="number"
                            placeholder="45000"
                            value={field.value ?? ""}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="qualification"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel htmlFor="staff-qualification">Qualification</FormLabel>
                        <FormControl>
                          <Input
                            id="staff-qualification"
                            placeholder="e.g., M.Sc Mathematics"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel htmlFor="staff-address">Address</FormLabel>
                        <FormControl>
                          <Textarea
                            id="staff-address"
                            placeholder="Enter complete address"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-2 pt-4 md:col-span-2">
                    <Button type="submit" className="flex-1" disabled={createStaffMutation.isPending}>
                      Add Staff Member
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowNewStaffDialog(false);
                        form.reset();
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
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
                  <p className="text-2xl font-bold">{staffStats?.total ?? 0}</p>
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
                  <p className="text-2xl font-bold">{staffStats?.teachers ?? 0}</p>
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
                  <p className="text-2xl font-bold">{staffStats?.admin ?? 0}</p>
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
                  <p className="text-2xl font-bold">{staffStats?.support ?? 0}</p>
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
                       const RoleIcon = getRoleIcon(member.designation || 'support');
                       return (
                         <TableRow key={member.id}>
                           <TableCell className="font-medium">{member.profile?.full_name || 'N/A'}</TableCell>
                           <TableCell>
                             <div className="flex items-center gap-2">
                               <RoleIcon className="w-4 h-4 text-muted-foreground" />
                               {(member.designation || 'staff').charAt(0).toUpperCase() + (member.designation || 'staff').slice(1)}
                             </div>
                           </TableCell>
                           <TableCell>{member.department || 'N/A'}</TableCell>
                           <TableCell>{member.profile?.email || 'N/A'}</TableCell>
                           <TableCell>{member.profile?.phone || 'N/A'}</TableCell>
                           <TableCell>{member.hire_date || 'N/A'}</TableCell>
                           <TableCell>{getStatusBadge(member.designation || 'staff')}</TableCell>
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
                     {staff.filter(s => s.designation === 'teacher').map((teacher) => (
                       <TableRow key={teacher.id}>
                         <TableCell className="font-medium">{teacher.profile?.full_name || 'N/A'}</TableCell>
                         <TableCell>{teacher.qualification || 'N/A'}</TableCell>
                         <TableCell>{teacher.experience_years || 0} years</TableCell>
                         <TableCell>
                           <Badge variant="outline">N/A</Badge>
                         </TableCell>
                         <TableCell>
                           <Badge variant="secondary">N/A</Badge>
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
                         <TableCell className="font-medium">{member.profile?.full_name || 'N/A'}</TableCell>
                         <TableCell>{member.designation || 'N/A'}</TableCell>
                         <TableCell>PKR {(member.salary || 0).toLocaleString()}</TableCell>
                         <TableCell>PKR 5,000</TableCell>
                         <TableCell>PKR 2,000</TableCell>
                         <TableCell className="font-bold">PKR {((member.salary || 0) + 5000 - 2000).toLocaleString()}</TableCell>
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
                   {staff.filter(s => s.designation === 'teacher').map((teacher) => (
                     <Card key={teacher.id}>
                       <CardContent className="p-4">
                         <div className="space-y-2">
                           <h4 className="font-semibold">{teacher.profile?.full_name || 'N/A'}</h4>
                           <p className="text-sm text-muted-foreground">{teacher.department || 'N/A'}</p>
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