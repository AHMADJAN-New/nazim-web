// Nazim School Management System - Reports & Analytics
import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  BarChart3, 
  TrendingUp, 
  Download,
  FileText,
  Calendar,
  Users,
  BookOpen,
  DollarSign,
  Activity,
  Search, 
  Filter, 
  Eye,
  Printer,
  Mail,
  Share,
  Edit
} from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

// Mock data for reports
const reportsStats = {
  totalReports: 245,
  generatedThisMonth: 45,
  scheduledReports: 8,
  sharedReports: 125
};

const availableReports = [
  {
    id: "R001",
    name: "Student Attendance Report",
    description: "Daily, weekly, and monthly attendance statistics by class and individual students",
    category: "Attendance",
    type: "Standard",
    frequency: "Daily",
    lastGenerated: "2024-03-01",
    generatedBy: "Admin",
    format: ["PDF", "Excel", "CSV"],
    parameters: ["Date Range", "Class", "Section", "Student"],
    accessLevel: "Staff"
  },
  {
    id: "R002",
    name: "Fee Collection Summary",
    description: "Monthly fee collection status, pending amounts, and payment trends",
    category: "Finance",
    type: "Financial",
    frequency: "Monthly",
    lastGenerated: "2024-02-28",
    generatedBy: "Finance Manager",
    format: ["PDF", "Excel"],
    parameters: ["Month", "Class", "Fee Type"],
    accessLevel: "Finance"
  },
  {
    id: "R003",
    name: "Academic Performance Analysis",
    description: "Student exam results, class averages, and subject-wise performance trends",
    category: "Academics", 
    type: "Academic",
    frequency: "After Each Exam",
    lastGenerated: "2024-02-25",
    generatedBy: "Academic Coordinator",
    format: ["PDF", "Excel", "Charts"],
    parameters: ["Exam", "Class", "Subject", "Student"],
    accessLevel: "Academic"
  },
  {
    id: "R004",
    name: "Staff Performance Report",
    description: "Teacher performance metrics, attendance, and professional development tracking",
    category: "HR",
    type: "Administrative", 
    frequency: "Quarterly",
    lastGenerated: "2024-01-15",
    generatedBy: "HR Manager",
    format: ["PDF", "Excel"],
    parameters: ["Quarter", "Department", "Employee"],
    accessLevel: "Management"
  },
  {
    id: "R005",
    name: "Library Usage Report",
    description: "Book circulation, member activity, and inventory status",
    category: "Library",
    type: "Operational",
    frequency: "Monthly",
    lastGenerated: "2024-02-29",
    generatedBy: "Librarian",
    format: ["PDF", "Excel"],
    parameters: ["Month", "Book Category", "Member Type"],
    accessLevel: "Staff"
  },
  {
    id: "R006",
    name: "Hostel Occupancy Report",
    description: "Room occupancy rates, student check-ins/outs, and facility utilization",
    category: "Hostel",
    type: "Operational",
    frequency: "Weekly",
    lastGenerated: "2024-03-01",
    generatedBy: "Hostel Manager",
    format: ["PDF", "Excel"],
    parameters: ["Week", "Building", "Room Type"],
    accessLevel: "Management"
  }
];

const reportHistory = [
  {
    id: "H001",
    reportName: "Student Attendance Report",
    generatedDate: "2024-03-01",
    generatedTime: "09:30 AM",
    generatedBy: "Mr. Ahmad Ali",
    parameters: "March 2024, All Classes",
    format: "PDF",
    size: "2.5 MB",
    downloads: 15,
    status: "completed"
  },
  {
    id: "H002",
    reportName: "Fee Collection Summary",
    generatedDate: "2024-02-28",
    generatedTime: "05:45 PM",
    generatedBy: "Ms. Fatima Shah",
    parameters: "February 2024, All Classes",
    format: "Excel",
    size: "1.8 MB", 
    downloads: 8,
    status: "completed"
  },
  {
    id: "H003",
    reportName: "Academic Performance Analysis",
    generatedDate: "2024-02-25",
    generatedTime: "11:20 AM",
    generatedBy: "Dr. Hassan Khan",
    parameters: "Mid-Term Exam, Grade 10",
    format: "PDF",
    size: "4.2 MB",
    downloads: 22,
    status: "completed"
  }
];

const scheduledReports = [
  {
    id: "S001",
    reportName: "Daily Attendance Summary",
    schedule: "Daily at 6:00 PM",
    nextRun: "2024-03-02 18:00",
    recipients: ["principal@school.com", "admin@school.com"],
    format: "PDF",
    status: "active"
  },
  {
    id: "S002", 
    reportName: "Weekly Finance Report",
    schedule: "Every Friday at 4:00 PM",
    nextRun: "2024-03-08 16:00",
    recipients: ["finance@school.com"],
    format: "Excel",
    status: "active"
  },
  {
    id: "S003",
    reportName: "Monthly Academic Summary",
    schedule: "Last day of month at 10:00 AM",
    nextRun: "2024-03-31 10:00",
    recipients: ["academic@school.com", "principal@school.com"],
    format: "PDF",
    status: "paused"
  }
];

export default function ReportsPage() {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterType, setFilterType] = useState("all");

  const getCategoryBadge = (category: string) => {
    const colors: { [key: string]: string } = {
      "Attendance": "bg-blue-100 text-blue-800",
      "Finance": "bg-green-100 text-green-800", 
      "Academics": "bg-purple-100 text-purple-800",
      "HR": "bg-orange-100 text-orange-800",
      "Library": "bg-indigo-100 text-indigo-800",
      "Hostel": "bg-pink-100 text-pink-800"
    };
    
    return (
      <Badge variant="secondary" className={colors[category] || ""}>
        {category}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-success text-success-foreground">Completed</Badge>;
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'paused':
        return <Badge variant="secondary">Paused</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getAccessLevelBadge = (level: string) => {
    switch (level) {
      case 'Management':
        return <Badge variant="destructive">Management</Badge>;
      case 'Finance':
        return <Badge variant="secondary">Finance</Badge>;
      case 'Academic':
        return <Badge variant="default">Academic</Badge>;
      case 'Staff':
        return <Badge variant="outline">Staff</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <MainLayout
      title={t('nav.reports')}
      showBreadcrumb={true}
      breadcrumbItems={[
        { label: t('nav.reports') }
      ]}
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportsStats.totalReports}</div>
              <div className="text-xs text-muted-foreground">
                Available templates
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Generated This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportsStats.generatedThisMonth}</div>
              <div className="text-xs text-muted-foreground">
                Reports created
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Scheduled Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportsStats.scheduledReports}</div>
              <div className="text-xs text-muted-foreground">
                Auto-generated
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Shared Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportsStats.sharedReports}</div>
              <div className="text-xs text-muted-foreground">
                Via email/download
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="generate" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
            <TabsTrigger value="generate" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Generate</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
            <TabsTrigger value="scheduled" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Scheduled</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
          </TabsList>

          {/* Generate Reports Tab */}
          <TabsContent value="generate" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search reports..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-full sm:w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="attendance">Attendance</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="academics">Academics</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                  <SelectItem value="library">Library</SelectItem>
                  <SelectItem value="hostel">Hostel</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="financial">Financial</SelectItem>
                  <SelectItem value="academic">Academic</SelectItem>
                  <SelectItem value="administrative">Administrative</SelectItem>
                  <SelectItem value="operational">Operational</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableReports.map((report) => (
                <Card key={report.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{report.name}</CardTitle>
                        <div className="flex gap-2">
                          {getCategoryBadge(report.category)}
                          {getAccessLevelBadge(report.accessLevel)}
                        </div>
                      </div>
                    </div>
                    <CardDescription className="text-sm">
                      {report.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <Label className="text-xs text-muted-foreground">Type</Label>
                          <p>{report.type}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Frequency</Label>
                          <p>{report.frequency}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Last Generated</Label>
                          <p>{report.lastGenerated}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Generated By</Label>
                          <p>{report.generatedBy}</p>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-xs text-muted-foreground">Available Formats</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {report.format.map((format, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {format}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-xs text-muted-foreground">Parameters</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {report.parameters.map((param, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {param}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" className="flex-1">
                          <FileText className="h-4 w-4 mr-1" />
                          Generate
                        </Button>
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Report History Tab */}
          <TabsContent value="history" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search report history..."
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Report History</CardTitle>
                <CardDescription>
                  Previously generated reports and their download history
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Report Name</TableHead>
                      <TableHead>Generated Date</TableHead>
                      <TableHead>Generated By</TableHead>
                      <TableHead>Parameters</TableHead>
                      <TableHead>Format</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Downloads</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportHistory.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">{report.reportName}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{report.generatedDate}</div>
                            <div className="text-muted-foreground">{report.generatedTime}</div>
                          </div>
                        </TableCell>
                        <TableCell>{report.generatedBy}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {report.parameters}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{report.format}</Badge>
                        </TableCell>
                        <TableCell>{report.size}</TableCell>
                        <TableCell>{report.downloads}</TableCell>
                        <TableCell>{getStatusBadge(report.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Mail className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Share className="h-4 w-4" />
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

          {/* Scheduled Reports Tab */}
          <TabsContent value="scheduled" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Scheduled Reports</h3>
                <p className="text-sm text-muted-foreground">
                  Automatically generated reports on a schedule
                </p>
              </div>
              <Button>
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Report
              </Button>
            </div>

            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Report Name</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Next Run</TableHead>
                      <TableHead>Recipients</TableHead>
                      <TableHead>Format</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scheduledReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">{report.reportName}</TableCell>
                        <TableCell>{report.schedule}</TableCell>
                        <TableCell>{report.nextRun}</TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            {report.recipients.length > 1 ? (
                              <span>{report.recipients.length} recipients</span>
                            ) : (
                              <span>{report.recipients[0]}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{report.format}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(report.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
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

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Report Usage</CardTitle>
                  <CardDescription>
                    Most frequently generated reports
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Attendance Reports</span>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 bg-muted rounded-full">
                          <div className="h-2 w-16 bg-primary rounded-full"></div>
                        </div>
                        <span className="text-xs text-muted-foreground">80%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Finance Reports</span>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 bg-muted rounded-full">
                          <div className="h-2 w-12 bg-primary rounded-full"></div>
                        </div>
                        <span className="text-xs text-muted-foreground">60%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Academic Reports</span>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 bg-muted rounded-full">
                          <div className="h-2 w-8 bg-primary rounded-full"></div>
                        </div>
                        <span className="text-xs text-muted-foreground">40%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Report Performance</CardTitle>
                  <CardDescription>
                    Generation times and success rates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm">Average Generation Time</span>
                      <span className="font-semibold">2.5 minutes</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Success Rate</span>
                      <span className="font-semibold text-success">98.5%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Failed Reports</span>
                      <span className="font-semibold text-warning">3</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Total Size Generated</span>
                      <span className="font-semibold">1.2 GB</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Format Preferences</CardTitle>
                  <CardDescription>
                    Most downloaded report formats
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">PDF</span>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 bg-muted rounded-full">
                          <div className="h-2 w-14 bg-primary rounded-full"></div>
                        </div>
                        <span className="text-xs text-muted-foreground">70%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Excel</span>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 bg-muted rounded-full">
                          <div className="h-2 w-8 bg-primary rounded-full"></div>
                        </div>
                        <span className="text-xs text-muted-foreground">25%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">CSV</span>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 bg-muted rounded-full">
                          <div className="h-2 w-2 bg-primary rounded-full"></div>
                        </div>
                        <span className="text-xs text-muted-foreground">5%</span>
                      </div>
                    </div>
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