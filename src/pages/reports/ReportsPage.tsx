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
  Printer,
  Mail,
  Share,
  Edit,
  Trash,
  Plus
} from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import {
  useReports,
  useCreateReport,
  useUpdateReport,
  useDeleteReport,
  useReportHistory,
  useCreateGeneratedReport,
  useDeleteGeneratedReport,
  useReportSchedules,
  useCreateSchedule,
  useUpdateSchedule,
  useDeleteSchedule,
  ReportTemplate,
  ScheduledReport,
} from "@/hooks/useReports";

export default function ReportsPage() {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterType, setFilterType] = useState("all");

  const { data: reports = [] } = useReports();
  const { data: reportHistory = [] } = useReportHistory();
  const { data: scheduledReports = [] } = useReportSchedules();

  const createReport = useCreateReport();
  const updateReport = useUpdateReport();
  const deleteReport = useDeleteReport();
  const createHistory = useCreateGeneratedReport();
  const deleteHistory = useDeleteGeneratedReport();
  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();
  const deleteSchedule = useDeleteSchedule();

  const currentMonth = new Date().getMonth();
  const reportsStats = {
    totalReports: reports.length,
    generatedThisMonth: reportHistory.filter(r => new Date(r.generated_at).getMonth() === currentMonth).length,
    scheduledReports: scheduledReports.length,
    sharedReports: 0
  };

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
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
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

  const handleAddReport = () => {
    const name = prompt('Report name');
    if (!name) return;
    createReport.mutate({
      name,
      category: 'General',
      type: 'Standard',
      created_by: 'system',
      access_level: 'Staff',
      query_template: 'SELECT 1'
    });
  };

  const handleEditReport = (report: ReportTemplate) => {
    const name = prompt('New name', report.name);
    if (!name) return;
    updateReport.mutate({ id: report.id, name });
  };

  const handleDeleteReport = (id: string) => {
    if (confirm('Delete report?')) {
      deleteReport.mutate(id);
    }
  };

  const handleGenerateReport = (report: ReportTemplate) => {
    createHistory.mutate({
      template_id: report.id,
      report_name: report.name,
      format: 'pdf',
      generated_by: 'system',
      status: 'completed',
      is_public: false,
      parameters: null,
      file_size: 0,
      expires_at: null
    });
  };

  const handleDeleteHistory = (id: string) => {
    if (confirm('Delete history?')) {
      deleteHistory.mutate(id);
    }
  };

  const handleCreateSchedule = () => {
    const name = prompt('Schedule name');
    const templateId = prompt('Template ID');
    if (!name || !templateId) return;
    createSchedule.mutate({
      name,
      template_id: templateId,
      schedule_expression: '0 0 * * *',
      next_run: new Date().toISOString(),
      created_by: 'system',
      recipients: [],
      format: 'pdf',
      is_active: true,
      parameters: null
    });
  };

  const handleEditSchedule = (schedule: ScheduledReport) => {
    const expr = prompt('Cron expression', schedule.schedule_expression);
    if (!expr) return;
    updateSchedule.mutate({ id: schedule.id, schedule_expression: expr });
  };

  const handleDeleteSchedule = (id: string) => {
    if (confirm('Delete schedule?')) {
      deleteSchedule.mutate(id);
    }
  };

  const formatFileSize = (size: number | null) => {
    if (!size) return '-';
    return `${(size / 1024).toFixed(1)} KB`;
  };

  const filteredReports = reports.filter((report) => {
    const matchesSearch = report.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || report.category.toLowerCase() === filterCategory;
    const matchesType = filterType === 'all' || report.type.toLowerCase() === filterType;
    return matchesSearch && matchesCategory && matchesType;
  });

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
              <Button onClick={handleAddReport} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add Report
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredReports.map((report) => {
                const formats = Array.isArray(report.format_options)
                  ? (report.format_options as string[])
                  : [];
                const params = Array.isArray(report.parameters)
                  ? (report.parameters as string[])
                  : [];
                return (
                <Card key={report.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{report.name}</CardTitle>
                        <div className="flex gap-2">
                          {getCategoryBadge(report.category)}
                          {getAccessLevelBadge(report.access_level)}
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
                          <p>N/A</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Last Generated</Label>
                          <p>{report.updated_at ? new Date(report.updated_at).toLocaleDateString() : '-'}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Generated By</Label>
                          <p>{report.created_by}</p>
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Available Formats</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {formats.map((format, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {format}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Parameters</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {params.map((param, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {param}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button size="sm" className="flex-1" onClick={() => handleGenerateReport(report)}>
                          <FileText className="h-4 w-4 mr-1" />
                          Generate
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleEditReport(report)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDeleteReport(report.id)}>
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                );
              })}
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
                        <TableCell className="font-medium">{report.report_name}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{new Date(report.generated_at).toLocaleDateString()}</div>
                            <div className="text-muted-foreground">{new Date(report.generated_at).toLocaleTimeString()}</div>
                          </div>
                        </TableCell>
                        <TableCell>{report.generated_by}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {JSON.stringify(report.parameters)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{report.format}</Badge>
                        </TableCell>
                        <TableCell>{formatFileSize(report.file_size)}</TableCell>
                        <TableCell>{report.download_count}</TableCell>
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
                            <Button variant="outline" size="sm" onClick={() => handleDeleteHistory(report.id)}>
                              <Trash className="h-4 w-4" />
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
              <Button onClick={handleCreateSchedule}>
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
                        <TableCell className="font-medium">{report.name}</TableCell>
                        <TableCell>{report.schedule_expression}</TableCell>
                        <TableCell>{new Date(report.next_run).toLocaleString()}</TableCell>
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
                        <TableCell>{getStatusBadge(report.is_active ? 'active' : 'paused')}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" onClick={() => handleEditSchedule(report)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDeleteSchedule(report.id)}>
                              <Trash className="h-4 w-4" />
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