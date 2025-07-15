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

// Mock data - in real app, this would come from API
const mockStudents = [
  {
    id: "1",
    admissionNumber: "ADM001",
    rollNumber: "10A001",
    firstName: "Ahmed",
    lastName: "Ali",
    class: "Class 10",
    section: "A",
    fatherName: "Ali Hassan",
    phone: "+92-300-1234567",
    email: "ahmed.ali@gmail.com",
    status: "active",
    profilePhoto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    admissionDate: "2024-01-15",
    isHostelStudent: true
  },
  {
    id: "2", 
    admissionNumber: "ADM002",
    rollNumber: "9B012",
    firstName: "Fatima",
    lastName: "Khan",
    class: "Class 9",
    section: "B", 
    fatherName: "Muhammad Khan",
    phone: "+92-301-2345678",
    email: "fatima.khan@gmail.com",
    status: "active",
    profilePhoto: "https://images.unsplash.com/photo-1494790108755-2616b612b647?w=100&h=100&fit=crop&crop=face",
    admissionDate: "2024-01-12",
    isHostelStudent: false
  },
  {
    id: "3",
    admissionNumber: "ADM003", 
    rollNumber: "8A025",
    firstName: "Omar",
    lastName: "Sheikh",
    class: "Class 8",
    section: "A",
    fatherName: "Abdullah Sheikh",
    phone: "+92-302-3456789",
    email: "omar.sheikh@gmail.com",
    status: "on_leave",
    profilePhoto: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
    admissionDate: "2024-01-10",
    isHostelStudent: true
  }
];

const statusColors = {
  active: "default",
  on_leave: "secondary", 
  suspended: "destructive",
  graduated: "outline",
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

  const filteredStudents = mockStudents.filter(student => {
    const matchesSearch = 
      student.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.rollNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.fatherName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesClass = selectedClass === "all" || student.class === selectedClass;
    const matchesStatus = selectedStatus === "all" || student.status === selectedStatus;
    const matchesSection = selectedSection === "all" || student.section === selectedSection;

    return matchesSearch && matchesClass && matchesStatus && matchesSection;
  });

  const handleViewStudent = (studentId: string) => {
    // Navigate to student details page
    console.log("View student:", studentId);
  };

  const handleEditStudent = (studentId: string) => {
    // Navigate to edit student page
    console.log("Edit student:", studentId);
  };

  const handleDeleteStudent = (studentId: string) => {
    // Show confirmation dialog and delete
    console.log("Delete student:", studentId);
  };

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
                  <SelectItem value="Class 10">Class 10</SelectItem>
                  <SelectItem value="Class 9">Class 9</SelectItem>
                  <SelectItem value="Class 8">Class 8</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  <SelectItem value="A">Section A</SelectItem>
                  <SelectItem value="B">Section B</SelectItem>
                  <SelectItem value="C">Section C</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="graduated">Graduated</SelectItem>
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
                  <p className="text-2xl font-bold">2,847</p>
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
                  <p className="text-2xl font-bold text-success">2,756</p>
                </div>
                <UserPlus className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">On Leave</p>
                  <p className="text-2xl font-bold text-warning">67</p>
                </div>
                <GraduationCap className="h-8 w-8 text-warning" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Hostel Students</p>
                  <p className="text-2xl font-bold text-accent">1,234</p>
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
                          <img
                            src={student.profilePhoto}
                            alt={`${student.firstName} ${student.lastName}`}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div>
                            <p className="font-medium">
                              {student.firstName} {student.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Admitted: {student.admissionDate}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">
                        {student.admissionNumber}
                      </TableCell>
                      <TableCell className="font-mono">
                        {student.rollNumber}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{student.class}</p>
                          <p className="text-sm text-muted-foreground">
                            Section {student.section}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{student.fatherName}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3" />
                            {student.phone}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {student.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusColors[student.status as keyof typeof statusColors]}>
                          {student.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={student.isHostelStudent ? "default" : "outline"}>
                          {student.isHostelStudent ? "Yes" : "No"}
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