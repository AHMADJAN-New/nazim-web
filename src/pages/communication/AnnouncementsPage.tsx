import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Megaphone, Users, Calendar, Plus, Search, Filter, Edit, Trash2, Eye, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  targetAudience: string[];
  publishDate: string;
  expiryDate?: string;
  author: string;
  status: 'draft' | 'published' | 'expired';
  notificationSent: boolean;
}

const mockAnnouncements: Announcement[] = [
  {
    id: "1",
    title: "School Reopening After Winter Break",
    content: "School will reopen on January 15, 2024. All students are expected to attend classes regularly. Please bring updated notebooks and uniforms.",
    priority: "high",
    targetAudience: ["students", "parents"],
    publishDate: "2024-01-01",
    expiryDate: "2024-01-20",
    author: "Principal Office",
    status: "published",
    notificationSent: true
  },
  {
    id: "2",
    title: "Parent-Teacher Meeting Schedule",
    content: "Monthly parent-teacher meeting is scheduled for February 15, 2024. Please confirm your attendance by replying to this announcement.",
    priority: "normal",
    targetAudience: ["parents", "teachers"],
    publishDate: "2024-02-01",
    expiryDate: "2024-02-16",
    author: "Academic Office",
    status: "published",
    notificationSent: false
  },
  {
    id: "3",
    title: "Sports Day Registration Open",
    content: "Registration for Annual Sports Day is now open. Students can register for various events through their class teachers.",
    priority: "normal",
    targetAudience: ["students", "teachers"],
    publishDate: "2024-02-10",
    author: "Sports Department",
    status: "draft",
    notificationSent: false
  }
];

const priorityVariants = {
  low: "outline",
  normal: "secondary",
  high: "default",
  urgent: "destructive"
} as const;

const statusVariants = {
  draft: "outline",
  published: "default",
  expired: "secondary"
} as const;

export default function AnnouncementsPage() {
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>(mockAnnouncements);
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isAddAnnouncementOpen, setIsAddAnnouncementOpen] = useState(false);

  const filteredAnnouncements = announcements.filter(announcement => {
    const matchesSearch = announcement.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         announcement.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === "all" || announcement.priority === priorityFilter;
    const matchesStatus = statusFilter === "all" || announcement.status === statusFilter;
    return matchesSearch && matchesPriority && matchesStatus;
  });

  const publishedCount = announcements.filter(a => a.status === 'published').length;
  const draftCount = announcements.filter(a => a.status === 'draft').length;
  const pendingNotifications = announcements.filter(a => !a.notificationSent && a.status === 'published').length;

  const handleAddAnnouncement = (announcementData: Partial<Announcement>) => {
    const newAnnouncement: Announcement = {
      id: `${announcements.length + 1}`,
      title: announcementData.title || "",
      content: announcementData.content || "",
      priority: announcementData.priority || "normal",
      targetAudience: announcementData.targetAudience || [],
      publishDate: announcementData.publishDate || new Date().toISOString().split('T')[0],
      expiryDate: announcementData.expiryDate,
      author: "Admin",
      status: "draft",
      notificationSent: false
    };

    setAnnouncements([newAnnouncement, ...announcements]);
    setIsAddAnnouncementOpen(false);
    toast({
      title: "Announcement Created",
      description: `${newAnnouncement.title} has been created as draft.`
    });
  };

  const publishAnnouncement = (announcementId: string) => {
    setAnnouncements(prev => prev.map(announcement => 
      announcement.id === announcementId 
        ? { ...announcement, status: 'published' as const }
        : announcement
    ));
    toast({
      title: "Announcement Published",
      description: "Announcement is now visible to the target audience."
    });
  };

  const sendNotification = (announcementId: string) => {
    setAnnouncements(prev => prev.map(announcement => 
      announcement.id === announcementId 
        ? { ...announcement, notificationSent: true }
        : announcement
    ));
    toast({
      title: "Notification Sent",
      description: "Announcement notification has been sent to all target users."
    });
  };

  const deleteAnnouncement = (announcementId: string) => {
    setAnnouncements(prev => prev.filter(a => a.id !== announcementId));
    toast({
      title: "Announcement Deleted",
      description: "Announcement has been successfully deleted."
    });
  };

  const viewAnnouncementDetails = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setIsDetailsDialogOpen(true);
  };

  return (
    <MainLayout 
      title="Announcements" 
      showBreadcrumb={true}
      breadcrumbItems={[
        { label: "Communication", href: "/communication" },
        { label: "Announcements" }
      ]}
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Announcements</CardTitle>
              <Megaphone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{announcements.length}</div>
              <p className="text-xs text-muted-foreground">All announcements</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Published</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{publishedCount}</div>
              <p className="text-xs text-muted-foreground">Active announcements</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Drafts</CardTitle>
              <Edit className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{draftCount}</div>
              <p className="text-xs text-muted-foreground">Pending publication</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Notifications</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingNotifications}</div>
              <p className="text-xs text-muted-foreground">Need notifications</p>
            </CardContent>
          </Card>
        </div>

        {/* Announcements List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Announcements</CardTitle>
                <CardDescription>Manage and publish school announcements</CardDescription>
              </div>
              <Button onClick={() => setIsAddAnnouncementOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Announcement
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground transform -translate-y-1/2" />
                <Input
                  placeholder="Search announcements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              {filteredAnnouncements.map((announcement) => (
                <div key={announcement.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold">{announcement.title}</h3>
                        <Badge variant={priorityVariants[announcement.priority]}>
                          {announcement.priority}
                        </Badge>
                        <Badge variant={statusVariants[announcement.status]}>
                          {announcement.status}
                        </Badge>
                        {!announcement.notificationSent && announcement.status === 'published' && (
                          <Badge variant="outline" className="text-orange-600">
                            Notification Pending
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {announcement.content}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span>By: {announcement.author}</span>
                        <span>Published: {format(new Date(announcement.publishDate), 'MMM dd, yyyy')}</span>
                        <span>Audience: {announcement.targetAudience.join(', ')}</span>
                        {announcement.expiryDate && (
                          <span>Expires: {format(new Date(announcement.expiryDate), 'MMM dd, yyyy')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {announcement.status === 'draft' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => publishAnnouncement(announcement.id)}
                          className="text-green-600 hover:text-green-700"
                        >
                          Publish
                        </Button>
                      )}
                      {!announcement.notificationSent && announcement.status === 'published' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => sendNotification(announcement.id)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Bell className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => viewAnnouncementDetails(announcement)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteAnnouncement(announcement.id)}
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

        {/* Add Announcement Dialog */}
        <Dialog open={isAddAnnouncementOpen} onOpenChange={setIsAddAnnouncementOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Announcement</DialogTitle>
              <DialogDescription>
                Create a new announcement for students, teachers, parents, or staff.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const targetAudience = Array.from(formData.getAll('targetAudience')) as string[];
              handleAddAnnouncement({
                title: formData.get('title') as string,
                content: formData.get('content') as string,
                priority: formData.get('priority') as Announcement['priority'],
                targetAudience,
                publishDate: formData.get('publishDate') as string,
                expiryDate: formData.get('expiryDate') as string || undefined,
              });
            }}>
              <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
                <div className="grid gap-2">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" name="title" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea 
                    id="content" 
                    name="content" 
                    rows={4}
                    placeholder="Enter announcement content..." 
                    required 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select name="priority" defaultValue="normal" required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low Priority</SelectItem>
                      <SelectItem value="normal">Normal Priority</SelectItem>
                      <SelectItem value="high">High Priority</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Target Audience</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {["students", "teachers", "parents", "staff"].map(audience => (
                      <div key={audience} className="flex items-center space-x-2">
                        <input 
                          type="checkbox" 
                          id={audience} 
                          name="targetAudience" 
                          value={audience}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor={audience} className="text-sm capitalize">{audience}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="publishDate">Publish Date</Label>
                  <Input 
                    id="publishDate" 
                    name="publishDate" 
                    type="date" 
                    defaultValue={new Date().toISOString().split('T')[0]}
                    required 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="expiryDate">Expiry Date (Optional)</Label>
                  <Input id="expiryDate" name="expiryDate" type="date" />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Create Announcement</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Announcement Details Dialog */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Announcement Details</DialogTitle>
            </DialogHeader>
            {selectedAnnouncement && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{selectedAnnouncement.title}</h3>
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge variant={priorityVariants[selectedAnnouncement.priority]}>
                      {selectedAnnouncement.priority}
                    </Badge>
                    <Badge variant={statusVariants[selectedAnnouncement.status]}>
                      {selectedAnnouncement.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Content</Label>
                  <p className="text-sm mt-1">{selectedAnnouncement.content}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Author</Label>
                    <p className="text-sm">{selectedAnnouncement.author}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Publish Date</Label>
                    <p className="text-sm">{format(new Date(selectedAnnouncement.publishDate), 'MMM dd, yyyy')}</p>
                  </div>
                  {selectedAnnouncement.expiryDate && (
                    <div>
                      <Label className="text-sm font-medium">Expiry Date</Label>
                      <p className="text-sm">{format(new Date(selectedAnnouncement.expiryDate), 'MMM dd, yyyy')}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-sm font-medium">Notification Status</Label>
                    <p className="text-sm">{selectedAnnouncement.notificationSent ? 'Sent' : 'Pending'}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Target Audience</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedAnnouncement.targetAudience.map(audience => (
                      <Badge key={audience} variant="secondary" className="capitalize">
                        {audience}
                      </Badge>
                    ))}
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