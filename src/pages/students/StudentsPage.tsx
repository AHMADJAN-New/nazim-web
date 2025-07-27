import { useState } from "react";
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  UserPlus,
  GraduationCap,
  Phone,
  Mail
} from "lucide-react";
import { useStudents, useUpdateStudent, useDeleteStudent } from "@/hooks/useStudents";
import { useClasses } from "@/hooks/useClasses";
import { toast } from "sonner";

import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Database integration

const statusColors = {
  active: "default",
  inactive: "secondary", 
  suspended: "destructive",
  graduated: "outline",
  transferred: "outline",
  expelled: "destructive"
} as const;

const breadcrumbItems = [
  { label: "Dashboard", href: "/" },
  { label: "Students" }
];

export default function StudentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedSection, setSelectedSection] = useState("all");

  const { data: students = [], isLoading } = useStudents();
  const { data: classes = [] } = useClasses();
  const updateStudent = useUpdateStudent();
  const deleteStudent = useDeleteStudent();

  const filteredStudents = students.filter(student => {
    const fullName = student.profiles?.full_name || '';
    const matchesSearch = 
      fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.student_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.guardian_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesClass = selectedClass === "all" || student.class_id === selectedClass;
    const matchesStatus = selectedStatus === "all" || student.status === selectedStatus;
    
    return matchesSearch && matchesClass && matchesStatus;
  });

  // Calculate stats from real data
  const totalStudents = students.length;
  const activeStudents = students.filter(s => s.status === 'active').length;
  const onLeaveStudents = students.filter(s => s.status === 'inactive').length;
  const hostelStudents = students.filter(s => s.status === 'active').length; // Adjust based on hostel data

  const handleViewStudent = (studentId: string) => {
    // Navigate to student details page
    console.log("View student:", studentId);
  };

  const handleEditStudent = (studentId: string) => {
    // Navigate to edit student page
    console.log("Edit student:", studentId);
  };

  const handleDeleteStudent = (studentId: string) => {
    if (confirm("Are you sure you want to delete this student?")) {
      deleteStudent.mutate(studentId);
    }
  };

  if (isLoading) {
    return (
      <MainLayout 
        title="Students Management"
        showBreadcrumb
        breadcrumbItems={breadcrumbItems}
      >
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout 
      title="Students Management"
      showBreadcrumb
      breadcrumbItems={breadcrumbItems}
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {Array.from(new Set(classes.map(cls => cls.section).filter(Boolean))).map((section) => (
                    <SelectItem key={section} value={section!}>
                      Section {section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="graduated">Graduated</SelectItem>
                  <SelectItem value="transferred">Transferred</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button size="sm" asChild>
              <a href="/students/admissions">
                <Plus className="h-4 w-4 mr-2" />
                Add Student
              </a>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Students</p>
                  <p className="text-2xl font-bold">{totalStudents}</p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold text-success">{activeStudents}</p>
                </div>
                <UserPlus className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Inactive</p>
                  <p className="text-2xl font-bold text-warning">{onLeaveStudents}</p>
                </div>
                <GraduationCap className="h-8 w-8 text-warning" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Enrolled Students</p>
                  <p className="text-2xl font-bold text-accent">{hostelStudents}</p>
                </div>
                <Users className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Students Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Students List ({filteredStudents.length} results)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Admission No.</TableHead>
                    <TableHead>Roll No.</TableHead>
                    <TableHead>Class/Section</TableHead>
                    <TableHead>Father Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Hostel</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {student.profiles?.full_name || 'Unknown'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Admitted: {new Date(student.admission_date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">
                        {student.student_id}
                      </TableCell>
                      <TableCell className="font-mono">
                        {student.student_id}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{student.classes?.name || 'No Class'}</p>
                          <p className="text-sm text-muted-foreground">
                            Section {student.classes?.section || 'A'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{student.guardian_name || 'N/A'}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {student.guardian_phone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3" />
                              {student.guardian_phone}
                            </div>
                          )}
                          {student.profiles?.email && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {student.profiles.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusColors[student.status as keyof typeof statusColors] || "default"}>
                          {student.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          Student
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewStudent(student.id)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditStudent(student.id)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Student
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteStudent(student.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredStudents.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  No students found
                </h3>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your search criteria or add a new student.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}