import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarDays, MapPin, Users, Clock, Plus, Search, Filter, Edit, Trash2, Eye, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useEvents, useCreateEvent, useUpdateEvent, useDeleteEvent } from "@/hooks/useEvents";

interface SchoolEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  category: 'academic' | 'sports' | 'cultural' | 'meeting' | 'exam' | 'holiday';
  priority: 'low' | 'normal' | 'high';
  organizer: string;
  participants: string[];
  maxParticipants?: number;
  registrationRequired: boolean;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  notificationSent: boolean;
}

const eventCategories = [
  { value: "academic", label: "Academic", color: "bg-blue-500" },
  { value: "sports", label: "Sports", color: "bg-green-500" },
  { value: "cultural", label: "Cultural", color: "bg-purple-500" },
  { value: "meeting", label: "Meeting", color: "bg-orange-500" },
  { value: "exam", label: "Exam", color: "bg-red-500" },
  { value: "holiday", label: "Holiday", color: "bg-gray-500" }
];

const participantTypes = [
  "students", "teachers", "parents", "staff", "all"
];

const statusVariants = {
  upcoming: "default",
  ongoing: "secondary",
  completed: "outline",
  cancelled: "destructive"
} as const;

const priorityVariants = {
  low: "outline",
  normal: "secondary",
  high: "destructive"
} as const;

export default function EventsPage() {
  const { toast } = useToast();
  const { data: events = [] } = useEvents();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEventMut = useDeleteEvent();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedEvent, setSelectedEvent] = useState<SchoolEvent | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isEditEventOpen, setIsEditEventOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SchoolEvent | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || event.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || event.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const upcomingEvents = events.filter(e => e.status === 'upcoming').length;
  const todayEvents = events.filter(e => e.date === new Date().toISOString().split('T')[0]).length;

  const handleAddEvent = (eventData: Partial<SchoolEvent>) => {
    createEvent.mutate({
      title: eventData.title || '',
      description: eventData.description || '',
      date: eventData.date || '',
      startTime: eventData.startTime || '09:00',
      endTime: eventData.endTime || '17:00',
      location: eventData.location || '',
      category: eventData.category || 'academic',
      priority: eventData.priority || 'normal',
      organizer: eventData.organizer || 'Administration',
      participants: eventData.participants || [],
      maxParticipants: eventData.maxParticipants,
      registrationRequired: eventData.registrationRequired || false,
      status: 'upcoming',
      notificationSent: false,
    });
    setIsAddEventOpen(false);
    toast({
      title: 'Event Created',
      description: `${eventData.title} has been successfully created.`,
    });
  };

  const handleEditEvent = (eventData: Partial<SchoolEvent>) => {
    if (!editingEvent) return;
    updateEvent.mutate({ id: editingEvent.id, ...eventData });
    setIsEditEventOpen(false);
    setEditingEvent(null);
    toast({
      title: 'Event Updated',
      description: `${eventData.title || editingEvent.title} has been successfully updated.`,
    });
  };

  const handleDeleteEvent = (eventId: string) => {
    deleteEventMut.mutate(eventId);
    toast({
      title: 'Event Deleted',
      description: 'Event has been successfully deleted.',
    });
  };

  const sendNotification = (eventId: string) => {
    updateEvent.mutate({ id: eventId, notificationSent: true });
    toast({
      title: 'Notification Sent',
      description: 'Event notification has been sent to all participants.',
    });
  };

  const viewEventDetails = (event: SchoolEvent) => {
    setSelectedEvent(event);
    setIsDetailsDialogOpen(true);
  };

  const editEvent = (event: SchoolEvent) => {
    setEditingEvent(event);
    setIsEditEventOpen(true);
  };

  const getCategoryColor = (category: string) => {
    return eventCategories.find(c => c.value === category)?.color || "bg-gray-500";
  };

  const getEventsForDate = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return events.filter(event => event.date === dateString);
  };

  return (
    <MainLayout 
      title="Events Management" 
      showBreadcrumb={true}
      breadcrumbItems={[
        { label: "Communication", href: "/communication" },
        { label: "Events" }
      ]}
    >
      <div className="space-y-6">
        {/* Header with View Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              onClick={() => setViewMode('list')}
            >
              List View
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'outline'}
              onClick={() => setViewMode('calendar')}
            >
              Calendar View
            </Button>
          </div>
          <Button onClick={() => setIsAddEventOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{events.length}</div>
              <p className="text-xs text-muted-foreground">All events</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingEvents}</div>
              <p className="text-xs text-muted-foreground">Scheduled ahead</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Events</CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayEvents}</div>
              <p className="text-xs text-muted-foreground">Happening today</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Notifications Pending</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {events.filter(e => !e.notificationSent && e.status === 'upcoming').length}
              </div>
              <p className="text-xs text-muted-foreground">Need notifications</p>
            </CardContent>
          </Card>
        </div>

        {viewMode === 'calendar' ? (
          /* Calendar View */
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Event Calendar</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border"
                  modifiers={{
                    hasEvents: (date) => getEventsForDate(date).length > 0
                  }}
                  modifiersStyles={{
                    hasEvents: { backgroundColor: '#dbeafe', fontWeight: 'bold' }
                  }}
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedDate ? format(selectedDate, 'MMM dd, yyyy') : 'Select Date'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDate && (
                  <div className="space-y-3">
                    {getEventsForDate(selectedDate).map(event => (
                      <div key={event.id} className="border rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className={`w-3 h-3 rounded-full ${getCategoryColor(event.category)}`}></div>
                          <h4 className="font-medium text-sm">{event.title}</h4>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">
                          {event.startTime} - {event.endTime}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {event.location}
                        </p>
                        <div className="flex space-x-1 mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewEventDetails(event)}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editEvent(event)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {getEventsForDate(selectedDate).length === 0 && (
                      <p className="text-sm text-muted-foreground">No events on this date</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          /* List View */
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Events</CardTitle>
                  <CardDescription>Manage and view all school events</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground transform -translate-y-1/2" />
                  <Input
                    placeholder="Search events..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-40">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {eventCategories.map(category => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="ongoing">Ongoing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                {filteredEvents.map((event) => (
                  <div key={event.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className={`w-4 h-4 rounded-full ${getCategoryColor(event.category)}`}></div>
                          <h3 className="font-semibold">{event.title}</h3>
                          <Badge variant={statusVariants[event.status]}>
                            {event.status}
                          </Badge>
                          <Badge variant={priorityVariants[event.priority]}>
                            {event.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{event.description}</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-muted-foreground">
                          <div className="flex items-center">
                            <CalendarDays className="h-3 w-3 mr-1" />
                            {format(new Date(event.date), 'MMM dd, yyyy')}
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {event.startTime} - {event.endTime}
                          </div>
                          <div className="flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {event.location}
                          </div>
                          <div className="flex items-center">
                            <Users className="h-3 w-3 mr-1" />
                            {event.participants.join(', ')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {!event.notificationSent && event.status === 'upcoming' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => sendNotification(event.id)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Bell className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewEventDetails(event)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => editEvent(event)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteEvent(event.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add Event Dialog */}
        <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add New Event</DialogTitle>
              <DialogDescription>
                Create a new school event and notify participants.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const participants = Array.from(formData.getAll('participants')) as string[];
              handleAddEvent({
                title: formData.get('title') as string,
                description: formData.get('description') as string,
                date: formData.get('date') as string,
                startTime: formData.get('startTime') as string,
                endTime: formData.get('endTime') as string,
                location: formData.get('location') as string,
                category: formData.get('category') as SchoolEvent['category'],
                priority: formData.get('priority') as SchoolEvent['priority'],
                organizer: formData.get('organizer') as string,
                participants,
                maxParticipants: formData.get('maxParticipants') ? Number(formData.get('maxParticipants')) : undefined,
                registrationRequired: formData.get('registrationRequired') === 'on',
              });
            }}>
              <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="title" className="text-right">Title</Label>
                  <Input id="title" name="title" className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">Description</Label>
                  <Textarea id="description" name="description" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="date" className="text-right">Date</Label>
                  <Input id="date" name="date" type="date" className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="startTime" className="text-right">Start Time</Label>
                  <Input id="startTime" name="startTime" type="time" className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="endTime" className="text-right">End Time</Label>
                  <Input id="endTime" name="endTime" type="time" className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="location" className="text-right">Location</Label>
                  <Input id="location" name="location" className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="category" className="text-right">Category</Label>
                  <Select name="category" required>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {eventCategories.map(category => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="priority" className="text-right">Priority</Label>
                  <Select name="priority" defaultValue="normal" required>
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="organizer" className="text-right">Organizer</Label>
                  <Input id="organizer" name="organizer" className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label className="text-right">Participants</Label>
                  <div className="col-span-3 grid grid-cols-2 gap-2">
                    {participantTypes.map(type => (
                      <div key={type} className="flex items-center space-x-2">
                        <input 
                          type="checkbox" 
                          id={type} 
                          name="participants" 
                          value={type}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor={type} className="text-sm capitalize">{type}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="maxParticipants" className="text-right">Max Participants</Label>
                  <Input id="maxParticipants" name="maxParticipants" type="number" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="registrationRequired" className="text-right">Registration Required</Label>
                  <div className="col-span-3">
                    <input 
                      type="checkbox" 
                      id="registrationRequired" 
                      name="registrationRequired"
                      className="rounded border-gray-300"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Create Event</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Event Details Dialog */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Event Details</DialogTitle>
            </DialogHeader>
            {selectedEvent && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Title</Label>
                    <p className="text-sm">{selectedEvent.title}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Category</Label>
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${getCategoryColor(selectedEvent.category)}`}></div>
                      <p className="text-sm capitalize">{selectedEvent.category}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Date</Label>
                    <p className="text-sm">{format(new Date(selectedEvent.date), 'MMM dd, yyyy')}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Time</Label>
                    <p className="text-sm">{selectedEvent.startTime} - {selectedEvent.endTime}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Location</Label>
                    <p className="text-sm">{selectedEvent.location}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Organizer</Label>
                    <p className="text-sm">{selectedEvent.organizer}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <Badge variant={statusVariants[selectedEvent.status]}>
                      {selectedEvent.status}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Priority</Label>
                    <Badge variant={priorityVariants[selectedEvent.priority]}>
                      {selectedEvent.priority}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-sm">{selectedEvent.description}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Participants</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedEvent.participants.map(participant => (
                      <Badge key={participant} variant="secondary" className="capitalize">
                        {participant}
                      </Badge>
                    ))}
                  </div>
                </div>
                {selectedEvent.maxParticipants && (
                  <div>
                    <Label className="text-sm font-medium">Max Participants</Label>
                    <p className="text-sm">{selectedEvent.maxParticipants}</p>
                  </div>
                )}
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <span>Registration Required:</span>
                    <Badge variant={selectedEvent.registrationRequired ? "default" : "outline"}>
                      {selectedEvent.registrationRequired ? "Yes" : "No"}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span>Notification Sent:</span>
                    <Badge variant={selectedEvent.notificationSent ? "default" : "outline"}>
                      {selectedEvent.notificationSent ? "Yes" : "No"}
                    </Badge>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => setIsDetailsDialogOpen(false)}>
                    Close
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}