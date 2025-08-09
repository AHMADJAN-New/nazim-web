// Nazim School Management System - Communication Management
import { useState } from "react";
import {
  useCommunications,
  useCreateCommunication,
  useUpdateCommunication,
  useDeleteCommunication,
  useMessages,
  useCreateMessage,
  useUpdateMessage,
  useDeleteMessage,
  useEvents,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  type Communication,
  type Message,
  type CommunicationEvent,
} from "@/hooks/useCommunications";
import { useAuth } from "@/hooks/useAuth";
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
import { 
  MessageSquare,
  Send,
  Bell,
  Calendar,
  FileText,
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Trash2
} from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

export default function CommunicationPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Communication | null>(null);

  const { data: announcements = [] } = useCommunications();
  const { data: messages = [] } = useMessages();
  const { data: events = [] } = useEvents();

  const createCommunication = useCreateCommunication();
  const updateCommunication = useUpdateCommunication();
  const deleteCommunication = useDeleteCommunication();
  const createMessage = useCreateMessage();
  const updateMessage = useUpdateMessage();
  const deleteMessage = useDeleteMessage();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

  const defaultBranchId = "00000000-0000-0000-0000-000000000000";

  const communicationStats = {
    totalMessages: messages.length,
    sentToday: messages.filter((m) => {
      if (!m.sent_at) return false;
      const today = new Date().toISOString().split("T")[0];
      return m.sent_at.startsWith(today);
    }).length,
    pendingApproval: announcements.filter((a) => !a.published_date).length,
    totalAnnouncements: announcements.length,
    activeEvents: events.filter((e) => e.status === "upcoming" || e.status === "ongoing").length,
    smsCredits: 0,
  };

  const handleCreateAnnouncement = () => {
    const title = prompt("Announcement title");
    const content = prompt("Announcement content");
    if (title && content && user) {
      createCommunication.mutate({
        title,
        content,
        type: "announcement",
        priority: "normal",
        target_audience: [],
        branch_id: defaultBranchId,
        created_by: user.id,
      });
    }
  };

  const handleUpdateMessage = (message: Message) => {
    const subject = prompt("Edit subject", message.subject);
    if (subject) {
      updateMessage.mutate({ id: message.id, subject });
    }
  };

  const handleDeleteMessage = (id: string) => {
    deleteMessage.mutate(id);
  };

  const handleSendMessage = () => {
    const subject = prompt("Message subject");
    const content = prompt("Message content");
    if (subject && content && user) {
      createMessage.mutate({
        subject,
        content,
        sender_id: user.id,
        recipients: [],
        message_type: "notification",
        priority: "normal",
        status: "draft",
        branch_id: defaultBranchId,
      });
    }
  };

  const handleCreateEvent = () => {
    const title = prompt("Event title");
    const description = prompt("Event description");
    const date = prompt("Event date (YYYY-MM-DD)");
    if (title && description && date && user) {
      createEvent.mutate({
        title,
        description,
        event_date: date,
        start_time: "09:00",
        end_time: "10:00",
        location: "TBD",
        category: "academic",
        priority: "normal",
        organizer: user.id,
        participants: [],
        registration_required: false,
        status: "upcoming",
        notification_sent: false,
        branch_id: defaultBranchId,
        created_by: user.id,
      });
    }
  };

  const handleUpdateEvent = (event: CommunicationEvent) => {
    const title = prompt("Edit event title", event.title);
    if (title) {
      updateEvent.mutate({ id: event.id, title });
    }
  };

  const handleDeleteEvent = (id: string) => {
    deleteEvent.mutate(id);
  };

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
              <Button onClick={handleCreateAnnouncement}>
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
                     {announcements.map((communication) => (
                     <TableRow key={communication.id}>
                         <TableCell className="font-medium">{communication.title}</TableCell>
                         <TableCell>
                           <Badge variant="outline">{communication.type}</Badge>
                         </TableCell>
                         <TableCell>
                           <div className="flex flex-wrap gap-1">
                             {communication.target_audience?.map((audience, index) => (
                               <Badge key={index} variant="secondary" className="text-xs">
                                 {audience}
                               </Badge>
                             ))}
                           </div>
                         </TableCell>
                         <TableCell>{getPriorityBadge(communication.priority || 'normal')}</TableCell>
                         <TableCell>{new Date(communication.created_at).toLocaleDateString()}</TableCell>
                         <TableCell>-</TableCell>
                         <TableCell>
                           <Badge variant={communication.published_date ? 'default' : 'secondary'}>
                             {communication.published_date ? 'Published' : 'Draft'}
                           </Badge>
                         </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedAnnouncement(communication)}
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
                                          {selectedAnnouncement.created_by}
                                        </p>
                                      </div>
                                      <div>
                                        <Label>Created Date</Label>
                                        <p className="text-sm text-muted-foreground">
                                          {new Date(selectedAnnouncement.created_at).toLocaleDateString()}
                                        </p>
                                      </div>
                                      <div>
                                        <Label>Publish Date</Label>
                                        <p className="text-sm text-muted-foreground">
                                          {selectedAnnouncement.published_date}
                                        </p>
                                      </div>
                                      <div>
                                        <Label>Expiry Date</Label>
                                        <p className="text-sm text-muted-foreground">
                                          {selectedAnnouncement.expires_at}
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
                                        {selectedAnnouncement.target_audience?.map((audience: string, index: number) => (
                                          <Badge key={index} variant="secondary">
                                            {audience}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                    
                                    <div className="flex gap-2 pt-4 border-t">
                                      <Button>Edit</Button>
                                      <Button variant="outline">Duplicate</Button>
                                      <Button variant="outline">Send Now</Button>
                                      {selectedAnnouncement.published_date && (
                                        <Button variant="destructive">Archive</Button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const title = prompt("Edit title", communication.title);
                                if (title) {
                                  updateCommunication.mutate({ id: communication.id, title });
                                }
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteCommunication.mutate(communication.id)}
                            >
                              <Trash2 className="h-4 w-4" />
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
              <Button onClick={handleSendMessage}>
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
                      <TableHead>Recipients</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Sent At</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {messages.map((message) => (
                      <TableRow key={message.id}>
                        <TableCell className="font-medium">{message.subject}</TableCell>
                        <TableCell>{message.recipients.join(", ")}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{message.message_type}</Badge>
                        </TableCell>
                        <TableCell>
                          {message.sent_at ? new Date(message.sent_at).toLocaleString() : "-"}
                        </TableCell>
                        <TableCell>{getMessageStatusBadge(message.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateMessage(message)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteMessage(message.id)}
                            >
                              <Trash2 className="h-4 w-4" />
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
              <Button onClick={handleCreateEvent}>
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
                            <div>{event.event_date}</div>
                            <div className="text-muted-foreground">{event.start_time}</div>
                          </div>
                        </TableCell>
                        <TableCell>{event.location}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{event.category}</Badge>
                        </TableCell>
                        <TableCell>
                          {event.registration_required ? (
                            <span>{event.participants.length}/{event.max_participants || 0}</span>
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
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateEvent(event)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteEvent(event.id)}
                            >
                              <Trash2 className="h-4 w-4" />
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