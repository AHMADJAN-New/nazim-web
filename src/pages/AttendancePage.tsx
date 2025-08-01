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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarIcon, Search, QrCode, Camera, Download, Upload, CheckCircle, XCircle, Clock, Users, Settings, Wifi, WifiOff, Plus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAttendance, useMarkAttendance, useUpdateAttendance } from "@/hooks/useAttendance";
import { useClasses } from "@/hooks/useClasses";
import { useAttendanceDevices, useCreateAttendanceDevice, useCreateAttendanceLog, useSyncDeviceData } from "@/hooks/useAttendanceDevices";

export default function AttendancePage() {
  const { data: attendanceData = [], isLoading } = useAttendance();
  const { data: classes = [] } = useClasses();
  const { data: devices = [], isLoading: devicesLoading } = useAttendanceDevices();
  const markAttendanceMutation = useMarkAttendance();
  const updateAttendanceMutation = useUpdateAttendance();
  const createDevice = useCreateAttendanceDevice();
  const createLog = useCreateAttendanceLog();
  const syncDevice = useSyncDeviceData();
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showDeviceDialog, setShowDeviceDialog] = useState(false);
  const [deviceForm, setDeviceForm] = useState({
    device_name: '',
    device_type: 'zkt',
    ip_address: '',
    port: 4370,
    location: '',
    branch_id: classes[0]?.branch_id || ''
  });
  const { toast } = useToast();

  const handleAttendanceChange = (id: string, status: 'present' | 'absent' | 'late' | 'leave') => {
    updateAttendanceMutation.mutate({
      id,
      status: status as any
    });
  };

  const getStatusBadge = (status: 'present' | 'absent' | 'late' | 'leave') => {
    const variants = {
      present: "default",
      absent: "destructive", 
      late: "secondary",
      leave: "outline"
    } as const;
    
    const icons = {
      present: CheckCircle,
      absent: XCircle,
      late: Clock,
      leave: Users
    };
    
    const Icon = icons[status];
    
    return (
      <Badge variant={variants[status]} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const bulkMarkAttendance = (status: 'present' | 'absent' | 'late' | 'leave') => {
    // Bulk marking logic would go here
    toast({
      title: "Bulk Attendance",
      description: `All students marked as ${status}`
    });
  };

  const handleCreateDevice = () => {
    if (!deviceForm.device_name) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive"
      });
      return;
    }

    createDevice.mutate({
      ...deviceForm,
      branch_id: classes[0]?.branch_id || '',
      is_active: true,
      settings: {}
    }, {
      onSuccess: () => {
        setShowDeviceDialog(false);
        setDeviceForm({
          device_name: '',
          device_type: 'zkt',
          ip_address: '',
          port: 4370,
          location: '',
          branch_id: classes[0]?.branch_id || ''
        });
      }
    });
  };

  const handleSyncDevice = async (deviceId: string) => {
    // Simulate device data sync - in real implementation, this would connect to the actual device
    const mockLogs = [
      {
        student_id: 'STU001',
        timestamp: new Date().toISOString(),
        type: 'check_in',
        method: 'fingerprint',
        device_user_id: '1001'
      }
    ];

    syncDevice.mutate({
      deviceId,
      logs: mockLogs
    });
  };

  const handleManualLog = () => {
    const studentId = prompt('Enter Student ID:');
    const deviceId = devices?.[0]?.id;
    
    if (studentId && deviceId) {
      createLog.mutate({
        device_id: deviceId,
        student_id: studentId,
        timestamp: new Date().toISOString(),
        log_type: 'check_in',
        verification_method: 'manual',
        raw_data: {}
      });
    }
  };

  if (isLoading) {
    return (
      <MainLayout title="Attendance Management">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">Loading attendance data...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout 
      title="Attendance Management"
      showBreadcrumb
      breadcrumbItems={[
        { label: "Attendance" }
      ]}
    >
      <div className="space-y-6">
        {/* Header Controls */}
        <div className="flex flex-col lg:flex-row gap-4 justify-between">
          <div className="flex flex-col md:flex-row gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-60 justify-start text-left">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select Class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map(cls => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name} - {cls.section}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedSection} onValueChange={setSelectedSection}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">Section A</SelectItem>
                <SelectItem value="B">Section B</SelectItem>
                <SelectItem value="C">Section C</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleManualLog}>
              <QrCode className="w-4 h-4 mr-2" />
              Manual Entry
            </Button>
            <Button variant="outline" size="sm">
              <Camera className="w-4 h-4 mr-2" />
              Face Recognition
            </Button>
            <Dialog open={showDeviceDialog} onOpenChange={setShowDeviceDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Devices
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Attendance Devices</DialogTitle>
                  <DialogDescription>
                    Manage biometric and attendance devices
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Device List */}
                  <div className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-semibold">Connected Devices</h4>
                      <Badge variant="outline">{devices.length} devices</Badge>
                    </div>
                    <div className="space-y-2">
                      {devices.map((device) => (
                        <div key={device.id} className="flex items-center justify-between p-3 border rounded">
                          <div className="flex items-center gap-3">
                            {device.is_active ? (
                              <Wifi className="w-4 h-4 text-green-500" />
                            ) : (
                              <WifiOff className="w-4 h-4 text-red-500" />
                            )}
                            <div>
                              <p className="font-medium">{device.device_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {device.device_type.toUpperCase()} - {device.location}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleSyncDevice(device.id)}>
                              Sync
                            </Button>
                            <Badge variant={device.is_active ? "default" : "secondary"}>
                              {device.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                      {devices.length === 0 && (
                        <p className="text-center text-muted-foreground py-4">No devices configured</p>
                      )}
                    </div>
                  </div>

                  {/* Add New Device Form */}
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-4">Add New Device</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="device_name">Device Name</Label>
                        <Input
                          id="device_name"
                          value={deviceForm.device_name}
                          onChange={(e) => setDeviceForm(prev => ({ ...prev, device_name: e.target.value }))}
                          placeholder="ZKT Device 1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="device_type">Device Type</Label>
                        <Select value={deviceForm.device_type} onValueChange={(value) => setDeviceForm(prev => ({ ...prev, device_type: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="zkt">ZKT Biometric</SelectItem>
                            <SelectItem value="rfid">RFID Card Reader</SelectItem>
                            <SelectItem value="qr">QR Code Scanner</SelectItem>
                            <SelectItem value="face">Face Recognition</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="ip_address">IP Address</Label>
                        <Input
                          id="ip_address"
                          value={deviceForm.ip_address}
                          onChange={(e) => setDeviceForm(prev => ({ ...prev, ip_address: e.target.value }))}
                          placeholder="192.168.1.100"
                        />
                      </div>
                      <div>
                        <Label htmlFor="port">Port</Label>
                        <Input
                          id="port"
                          type="number"
                          value={deviceForm.port}
                          onChange={(e) => setDeviceForm(prev => ({ ...prev, port: parseInt(e.target.value) }))}
                          placeholder="4370"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          value={deviceForm.location}
                          onChange={(e) => setDeviceForm(prev => ({ ...prev, location: e.target.value }))}
                          placeholder="Main Entrance"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end mt-4">
                      <Button onClick={handleCreateDevice} disabled={createDevice.isPending}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Device
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <Tabs defaultValue="daily" className="w-full">
          <TabsList>
            <TabsTrigger value="daily">Daily Attendance</TabsTrigger>
            <TabsTrigger value="period">Period-wise</TabsTrigger>
            <TabsTrigger value="devices">Device Logs</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Daily Attendance - {format(selectedDate, "PPP")}</CardTitle>
                    <CardDescription>
                      Mark attendance for selected class ({attendanceData.length} students)
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => bulkMarkAttendance('present')}>
                      Mark All Present
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => bulkMarkAttendance('absent')}>
                      Mark All Absent
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search students..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 max-w-md"
                    />
                  </div>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Roll #</TableHead>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendanceData.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">{record.student?.student_id || 'N/A'}</TableCell>
                          <TableCell>{record.student?.profiles?.full_name || 'N/A'}</TableCell>
                          <TableCell>{record.classes?.name || 'N/A'}</TableCell>
                          <TableCell>{getStatusBadge(record.status === 'excused' ? 'leave' : record.status)}</TableCell>
                          <TableCell>{record.date}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button 
                                size="sm" 
                                variant={record.status === 'present' ? 'default' : 'outline'}
                                onClick={() => handleAttendanceChange(record.id, 'present')}
                              >
                                P
                              </Button>
                              <Button 
                                size="sm" 
                                variant={record.status === 'absent' ? 'destructive' : 'outline'}
                                onClick={() => handleAttendanceChange(record.id, 'absent')}
                              >
                                A
                              </Button>
                              <Button 
                                size="sm" 
                                variant={record.status === 'late' ? 'secondary' : 'outline'}
                                onClick={() => handleAttendanceChange(record.id, 'late')}
                              >
                                L
                              </Button>
                              <Button 
                                size="sm" 
                                variant={record.status === 'excused' ? 'outline' : 'outline'}
                                onClick={() => handleAttendanceChange(record.id, 'leave')}
                              >
                                Leave
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="period" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Period-wise Attendance</CardTitle>
                <CardDescription>
                  Track attendance for each subject period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Subject" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mathematics">Mathematics</SelectItem>
                      <SelectItem value="english">English</SelectItem>
                      <SelectItem value="urdu">Urdu</SelectItem>
                      <SelectItem value="science">Science</SelectItem>
                      <SelectItem value="islamiat">Islamiat</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Period 1 (8:00-8:40)</SelectItem>
                      <SelectItem value="2">Period 2 (8:40-9:20)</SelectItem>
                      <SelectItem value="3">Period 3 (9:20-10:00)</SelectItem>
                      <SelectItem value="4">Period 4 (10:20-11:00)</SelectItem>
                      <SelectItem value="5">Period 5 (11:00-11:40)</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button>Load Period</Button>
                </div>
                
                <div className="text-center py-8 text-muted-foreground">
                  Select subject and period to load attendance
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="devices" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Device Attendance Logs</CardTitle>
                <CardDescription>
                  View attendance logs from biometric and other devices
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <Select>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select Device" />
                      </SelectTrigger>
                      <SelectContent>
                        {devices.map((device) => (
                          <SelectItem key={device.id} value={device.id}>
                            {device.device_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline">
                      Sync All Devices
                    </Button>
                  </div>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Student ID</TableHead>
                        <TableHead>Device</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No device logs available. Sync devices to see logs.
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Daily Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Present:</span>
                      <span className="font-semibold text-green-600">45</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Absent:</span>
                      <span className="font-semibold text-red-600">5</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Late:</span>
                      <span className="font-semibold text-yellow-600">3</span>
                    </div>
                    <div className="flex justify-between">
                      <span>On Leave:</span>
                      <span className="font-semibold text-blue-600">2</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Average Attendance:</span>
                      <span className="font-semibold">92.5%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Best Day:</span>
                      <span className="font-semibold">98.2%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Lowest Day:</span>
                      <span className="font-semibold">85.1%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Export Daily Report
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Export Monthly Report
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Upload className="w-4 h-4 mr-2" />
                    Import Attendance
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="bulk" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Bulk Operations</CardTitle>
                <CardDescription>
                  Perform bulk attendance operations for multiple classes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Classes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classes</SelectItem>
                      <SelectItem value="class-6">Class 6 (All Sections)</SelectItem>
                      <SelectItem value="class-7">Class 7 (All Sections)</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mark-present">Mark All Present</SelectItem>
                      <SelectItem value="mark-absent">Mark All Absent</SelectItem>
                      <SelectItem value="copy-yesterday">Copy Yesterday's Attendance</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button>Execute</Button>
                </div>
                
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Upload Attendance File</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload Excel/CSV file with attendance data. Download template first.
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline">Download Template</Button>
                    <Button variant="outline">Choose File</Button>
                    <Button>Upload</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}