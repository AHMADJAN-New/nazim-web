// Nazim School Management System - Communication Management
import { useState } from "react";
import type { Announcement } from "@/types/announcement";
import { useCommunications, useCreateCommunication, useUpdateCommunication, useDeleteCommunication } from "@/hooks/useCommunications";
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
import { Checkbox } from "@/components/ui/checkbox";
import { 
  MessageSquare, 
  Send, 
  Mail, 
  Phone,
  Bell,
  Calendar,
  FileText,
  Users,
  Search, 
  Filter, 
  Plus,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle
} from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

// Mock data for communication management
const communicationStats = {
  totalMessages: 1580,
  sentToday: 45,
  pendingApproval: 8,
  totalAnnouncements: 125,
  activeEvents: 12,
  smsCredits: 2500
};

const announcements = [
  {
    id: "A001",
    title: "Mid-Term Examination Schedule",
    content: "Mid-term examinations will commence from March 15th, 2024. Students are advised to prepare accordingly.",
    type: "Academic",
    priority: "high",
    targetAudience: ["Students", "Parents"],
    createdBy: "Principal",
    createdDate: "2024-03-01",
    publishDate: "2024-03-01",
    expiryDate: "2024-03-20",
    status: "published",
    views: 1250,
    sendVia: ["Website", "SMS", "Email"]
  },
  {
    id: "A002",
    title: "Parent-Teacher Meeting",
    content: "Parent-teacher meeting is scheduled for March 25th, 2024. Parents are requested to attend with their children.",
    type: "Event",
    priority: "medium", 
    targetAudience: ["Parents"],
    createdBy: "Academic Coordinator",
    createdDate: "2024-02-28",
    publishDate: "2024-03-01",
    expiryDate: "2024-03-25",
    status: "published",
    views: 856,
    sendVia: ["Website", "Email"]
  },
  {
    id: "A003",
    title: "Fee Payment Reminder",
    content: "Monthly fee payment is due by March 10th, 2024. Please ensure timely payment to avoid late charges.",
    type: "Finance",
    priority: "high",
    targetAudience: ["Parents"],
    createdBy: "Accounts Manager",
    createdDate: "2024-02-25",
    publishDate: "2024-03-01",
    expiryDate: "2024-03-10",
    status: "draft",
    views: 0,
    sendVia: ["SMS", "Email"]
  }
];

const messages = [
  {
    id: "M001",
    subject: "Attendance Alert",
    content: "Your child Ahmad Ali was absent today. Please ensure regular attendance.",
    recipient: "Mr. Muhammad Ali",
    recipientType: "Parent",
    studentClass: "Grade 10-A",
    sentDate: "2024-03-01",
    sentTime: "14:30",
    type: "SMS",
    status: "delivered",
    cost: 5,
    template: "Attendance Alert"
  },
  {
    id: "M002",
    subject: "Fee Payment Confirmation",
    content: "Thank you for the fee payment of Rs. 5000 for Ahmad Ali. Payment ID: PAY001.",
    recipient: "Mr. Muhammad Ali",
    recipientType: "Parent", 
    studentClass: "Grade 10-A",
    sentDate: "2024-02-28",
    sentTime: "16:45",
    type: "Email",
    status: "delivered",
    cost: 0,
    template: "Payment Confirmation"
  },
  {
    id: "M003",
    subject: "Exam Result Available",
    content: "Mid-term exam results for Hassan Khan are now available. Please check the student portal.",
    recipient: "Mr. Ibrahim Khan",
    recipientType: "Parent",
    studentClass: "Grade 11-B", 
    sentDate: "2024-02-27",
    sentTime: "11:20",
    type: "Email",
    status: "failed",
    cost: 0,
    template: "Result Notification"
  }
];

const events = [
  {
    id: "E001",
    title: "Annual Sports Day",
    description: "Annual sports competition for all grades with various athletic events and prizes.",
    date: "2024-03-20",
    time: "09:00 AM",
    location: "Main Playground",
    organizer: "Sports Department",
    category: "Sports",
    audience: ["Students", "Parents", "Staff"],
    registrationRequired: true,
    maxParticipants: 500,
    currentRegistrations: 287,
    status: "upcoming",
    reminder: true,
    reminderDays: 3
  },
  {
    id: "E002",
    title: "Science Fair",
    description: "Students will showcase their science projects and innovations.",
    date: "2024-04-05",
    time: "10:00 AM",
    location: "Science Laboratory",
    organizer: "Science Department",
    category: "Academic",
    audience: ["Students", "Parents"],
    registrationRequired: true,
    maxParticipants: 100,
    currentRegistrations: 45,
    status: "upcoming",
    reminder: true,
    reminderDays: 7
  },
  {
    id: "E003",
    title: "Quran Recitation Competition",
    description: "Islamic competition for beautiful Quran recitation with cash prizes.",
    date: "2024-03-15",
    time: "02:00 PM",
    location: "Main Hall",
    organizer: "Islamic Studies Department",
    category: "Religious",
    audience: ["Students"],
    registrationRequired: true,
    maxParticipants: 50,
    currentRegistrations: 38,
    status: "completed",
    reminder: false,
    reminderDays: 0
  }
];

export default function CommunicationPage() {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  
  const { data: communications = [], isLoading } = useCommunications();
  const createCommunication = useCreateCommunication();
  const updateCommunication = useUpdateCommunication();
  const deleteCommunication = useDeleteCommunication();

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'medium':
        return <Badge variant="secondary">Medium</Badge>;
      case 'low':
        return <Badge variant="outline">Low</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge variant="default" className="bg-success text-success-foreground">Published</Badge>;
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'scheduled':
        return <Badge variant="outline">Scheduled</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getMessageStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return <Badge variant="default" className="bg-success text-success-foreground">Delivered</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getEventStatusBadge = (status: string) => {
    switch (status) {
      case 'upcoming':
        return <Badge variant="default">Upcoming</Badge>;
      case 'ongoing':
        return <Badge variant="secondary">Ongoing</Badge>;
      case 'completed':
        return <Badge variant="outline">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <MainLayout
      title={t('nav.communication')}
      showBreadcrumb={true}
      breadcrumbItems={[
        { label: t('nav.communication') }
      ]}
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{communicationStats.totalMessages}</div>
              <div className="text-xs text-muted-foreground">
                All time
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Sent Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{communicationStats.sentToday}</div>
              <div className="text-xs text-muted-foreground">
                Messages
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{communicationStats.pendingApproval}</div>
              <div className="text-xs text-muted-foreground">
                Need review
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Announcements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{communicationStats.totalAnnouncements}</div>
              <div className="text-xs text-muted-foreground">
                Published
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{communicationStats.activeEvents}</div>
              <div className="text-xs text-muted-foreground">
                Upcoming
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">SMS Credits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{communicationStats.smsCredits}</div>
              <div className="text-xs text-muted-foreground">
                Remaining
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="announcements" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
            <TabsTrigger value="announcements" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Announcements</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Messages</span>
            </TabsTrigger>
            <TabsTrigger value="events" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Events</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Templates</span>
            </TabsTrigger>
          </TabsList>

          {/* Announcements Tab */}
          <TabsContent value="announcements" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search announcements..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="academic">Academic</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                </SelectContent>
              </Select>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Announcement
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Announcements</CardTitle>
                <CardDescription>
                  Manage school announcements and notifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Target Audience</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Created Date</TableHead>
                      <TableHead>Views</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {announcements.map((announcement) => (
                      <TableRow key={announcement.id}>
                        <TableCell className="font-medium">{announcement.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{announcement.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {announcement.targetAudience.map((audience, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {audience}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{getPriorityBadge(announcement.priority)}</TableCell>
                        <TableCell>{announcement.createdDate}</TableCell>
                        <TableCell>{announcement.views.toLocaleString()}</TableCell>
                        <TableCell>{getStatusBadge(announcement.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                 onClick={() => setSelectedAnnouncement({
                                   ...announcement,
                                   priority: announcement.priority as 'high' | 'low' | 'normal' | 'urgent',
                                   status: announcement.status as 'draft' | 'published' | 'expired',
                                   author: announcement.createdBy || 'Unknown',
                                   notificationSent: false
                                 })}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>{selectedAnnouncement?.title}</DialogTitle>
                                  <DialogDescription>
                                    Announcement details and management options
                                  </DialogDescription>
                                </DialogHeader>
                                {selectedAnnouncement && (
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label>Type</Label>
                                        <p className="text-sm text-muted-foreground">
                                          {selectedAnnouncement.type}
                                        </p>
                                      </div>
                                      <div>
                                        <Label>Priority</Label>
                                        <div className="mt-1">
                                          {getPriorityBadge(selectedAnnouncement.priority)}
                                        </div>
                                      </div>
                                      <div>
                                        <Label>Created By</Label>
                                        <p className="text-sm text-muted-foreground">
                                          {selectedAnnouncement.createdBy}
                                        </p>
                                      </div>
                                      <div>
                                        <Label>Created Date</Label>
                                        <p className="text-sm text-muted-foreground">
                                          {selectedAnnouncement.createdDate}
                                        </p>
                                      </div>
                                      <div>
                                        <Label>Publish Date</Label>
                                        <p className="text-sm text-muted-foreground">
                                          {selectedAnnouncement.publishDate}
                                        </p>
                                      </div>
                                      <div>
                                        <Label>Expiry Date</Label>
                                        <p className="text-sm text-muted-foreground">
                                          {selectedAnnouncement.expiryDate}
                                        </p>
                                      </div>
                                    </div>
                                    
                                    <div>
                                      <Label>Content</Label>
                                      <p className="text-sm text-muted-foreground mt-1">
                                        {selectedAnnouncement.content}
                                      </p>
                                    </div>
                                    
                                    <div>
                                      <Label>Target Audience</Label>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {selectedAnnouncement.targetAudience.map((audience: string, index: number) => (
                                          <Badge key={index} variant="secondary">
                                            {audience}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                    
                                    <div>
                                      <Label>Send Via</Label>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {selectedAnnouncement.sendVia.map((channel: string, index: number) => (
                                          <Badge key={index} variant="outline">
                                            {channel}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                    
                                    <div className="flex gap-2 pt-4 border-t">
                                      <Button>Edit</Button>
                                      <Button variant="outline">Duplicate</Button>
                                      <Button variant="outline">Send Now</Button>
                                      {selectedAnnouncement.status === 'published' && (
                                        <Button variant="destructive">Archive</Button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
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

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search messages..."
                    className="pl-10"
                  />
                </div>
              </div>
              <Button>
                <Send className="h-4 w-4 mr-2" />
                Send Message
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Message History</CardTitle>
                <CardDescription>
                  Track all SMS and email communications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Sent Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {messages.map((message) => (
                      <TableRow key={message.id}>
                        <TableCell className="font-medium">{message.subject}</TableCell>
                        <TableCell>{message.recipient}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{message.type}</Badge>
                        </TableCell>
                        <TableCell>{message.studentClass}</TableCell>
                        <TableCell>
                          {message.sentDate} {message.sentTime}
                        </TableCell>
                        <TableCell>{getMessageStatusBadge(message.status)}</TableCell>
                        <TableCell>
                          {message.cost > 0 ? `Rs. ${message.cost}` : 'Free'}
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search events..."
                    className="pl-10"
                  />
                </div>
              </div>
              <Button>
                <Calendar className="h-4 w-4 mr-2" />
                Create Event
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>School Events</CardTitle>
                <CardDescription>
                  Manage school events and activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event Title</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Registrations</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="font-medium">{event.title}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{event.date}</div>
                            <div className="text-muted-foreground">{event.time}</div>
                          </div>
                        </TableCell>
                        <TableCell>{event.location}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{event.category}</Badge>
                        </TableCell>
                        <TableCell>
                          {event.registrationRequired ? (
                            <span>{event.currentRegistrations}/{event.maxParticipants}</span>
                          ) : (
                            <span className="text-muted-foreground">No registration</span>
                          )}
                        </TableCell>
                        <TableCell>{getEventStatusBadge(event.status)}</TableCell>
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

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>SMS Templates</CardTitle>
                  <CardDescription>
                    Pre-defined SMS message templates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Attendance Alert</Label>
                      <p className="text-xs text-muted-foreground">
                        Your child {"{student_name}"} was absent today...
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Fee Reminder</Label>
                      <p className="text-xs text-muted-foreground">
                        Monthly fee payment is due by {"{due_date}"}...
                      </p>
                    </div>
                    <Button className="w-full" variant="outline">
                      Manage SMS Templates
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Email Templates</CardTitle>
                  <CardDescription>
                    Pre-defined email message templates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Result Notification</Label>
                      <p className="text-xs text-muted-foreground">
                        Exam results for {"{student_name}"} are now available...
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Event Invitation</Label>
                      <p className="text-xs text-muted-foreground">
                        You are invited to {"{event_name}"} on {"{event_date}"}...
                      </p>
                    </div>
                    <Button className="w-full" variant="outline">
                      Manage Email Templates
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Announcement Templates</CardTitle>
                  <CardDescription>
                    Pre-defined announcement templates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Exam Schedule</Label>
                      <p className="text-xs text-muted-foreground">
                        {"{exam_type}"} examinations will commence from...
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Holiday Notice</Label>
                      <p className="text-xs text-muted-foreground">
                        School will remain closed on {"{holiday_date}"}...
                      </p>
                    </div>
                    <Button className="w-full" variant="outline">
                      Manage Announcement Templates
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