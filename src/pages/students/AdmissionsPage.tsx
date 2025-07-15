import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserPlus, Search, Filter, Download, Upload, Eye, Edit, CheckCircle, XCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AdmissionApplication {
  id: string;
  studentName: string;
  fatherName: string;
  phone: string;
  class: string;
  status: 'pending' | 'approved' | 'rejected' | 'interview';
  appliedDate: string;
  documents: string[];
  fees: number;
}

const mockApplications: AdmissionApplication[] = [
  {
    id: "ADM001",
    studentName: "احمد علی",
    fatherName: "محمد علی",
    phone: "+92-300-1234567",
    class: "Class 6",
    status: "pending",
    appliedDate: "2024-01-15",
    documents: ["Birth Certificate", "Previous School Certificate"],
    fees: 15000
  },
  {
    id: "ADM002", 
    studentName: "فاطمہ خان",
    fatherName: "عمر خان",
    phone: "+92-301-2345678",
    class: "Class 8",
    status: "approved",
    appliedDate: "2024-01-14",
    documents: ["Birth Certificate", "Medical Certificate", "Photos"],
    fees: 18000
  }
];

export default function AdmissionsPage() {
  const [applications, setApplications] = useState<AdmissionApplication[]>(mockApplications);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showNewForm, setShowNewForm] = useState(false);
  const { toast } = useToast();

  const handleStatusChange = (id: string, newStatus: AdmissionApplication['status']) => {
    setApplications(prev => prev.map(app => 
      app.id === id ? { ...app, status: newStatus } : app
    ));
    toast({
      title: "Status Updated",
      description: `Application ${id} status changed to ${newStatus}`
    });
  };

  const getStatusBadge = (status: AdmissionApplication['status']) => {
    const variants = {
      pending: "secondary",
      approved: "default", 
      rejected: "destructive",
      interview: "outline"
    } as const;
    
    const icons = {
      pending: Clock,
      approved: CheckCircle,
      rejected: XCircle,
      interview: Eye
    };
    
    const Icon = icons[status];
    
    return (
      <Badge variant={variants[status]} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const filteredApplications = applications.filter(app => {
    const matchesSearch = app.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.fatherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <MainLayout 
      title="Admissions Management"
      showBreadcrumb
      breadcrumbItems={[
        { label: "Students", href: "/students" },
        { label: "Admissions" }
      ]}
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="flex flex-col md:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search applications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="interview">Interview</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => setShowNewForm(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              New Application
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="applications" className="w-full">
          <TabsList>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="admission-form">Admission Form</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="applications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Admission Applications</CardTitle>
                <CardDescription>
                  Manage and review student admission applications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Application ID</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Father Name</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Applied Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApplications.map((app) => (
                      <TableRow key={app.id}>
                        <TableCell className="font-medium">{app.id}</TableCell>
                        <TableCell>{app.studentName}</TableCell>
                        <TableCell>{app.fatherName}</TableCell>
                        <TableCell>{app.class}</TableCell>
                        <TableCell>{app.phone}</TableCell>
                        <TableCell>{app.appliedDate}</TableCell>
                        <TableCell>{getStatusBadge(app.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Select onValueChange={(value) => handleStatusChange(app.id, value as AdmissionApplication['status'])}>
                              <SelectTrigger className="w-24 h-8">
                                <SelectValue placeholder="Status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="approved">Approve</SelectItem>
                                <SelectItem value="rejected">Reject</SelectItem>
                                <SelectItem value="interview">Interview</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admission-form" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Online Admission Form</CardTitle>
                <CardDescription>
                  Create and manage the online admission form for prospective students
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="student-name">Student Name *</Label>
                    <Input id="student-name" placeholder="Enter student name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="father-name">Father Name *</Label>
                    <Input id="father-name" placeholder="Enter father name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input id="phone" placeholder="+92-300-0000000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="class-applying">Class Applying For *</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nursery">Nursery</SelectItem>
                        <SelectItem value="prep">Prep</SelectItem>
                        <SelectItem value="class-1">Class 1</SelectItem>
                        <SelectItem value="class-2">Class 2</SelectItem>
                        <SelectItem value="class-3">Class 3</SelectItem>
                        <SelectItem value="class-4">Class 4</SelectItem>
                        <SelectItem value="class-5">Class 5</SelectItem>
                        <SelectItem value="class-6">Class 6</SelectItem>
                        <SelectItem value="class-7">Class 7</SelectItem>
                        <SelectItem value="class-8">Class 8</SelectItem>
                        <SelectItem value="class-9">Class 9</SelectItem>
                        <SelectItem value="class-10">Class 10</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea id="address" placeholder="Enter complete address" />
                </div>
                
                <div className="flex gap-4">
                  <Button className="flex-1">Save Draft</Button>
                  <Button variant="outline" className="flex-1">Preview Form</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Admission Settings</CardTitle>
                <CardDescription>
                  Configure admission process settings and requirements
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="admission-fee">Admission Fee (PKR)</Label>
                    <Input id="admission-fee" type="number" placeholder="15000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="session">Academic Session</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select session" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2024-25">2024-25</SelectItem>
                        <SelectItem value="2025-26">2025-26</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="required-docs">Required Documents (one per line)</Label>
                  <Textarea 
                    id="required-docs" 
                    placeholder="Birth Certificate&#10;Previous School Certificate&#10;Medical Certificate&#10;Photos (2x2)"
                    rows={6}
                  />
                </div>
                
                <Button>Save Settings</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}