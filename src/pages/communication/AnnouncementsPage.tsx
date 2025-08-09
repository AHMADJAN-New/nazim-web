import { useState, useMemo } from "react";
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
import { useCommunications, useCreateCommunication, useUpdateCommunication, useDeleteCommunication } from "@/hooks/useCommunications";

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
  const { data: communications = [] } = useCommunications();
  const createCommunication = useCreateCommunication();
  const updateCommunication = useUpdateCommunication();
  const deleteCommunication = useDeleteCommunication();
  const announcements = useMemo<Announcement[]>(() =>
    communications.map(c => ({
      id: c.id,
      title: c.title,
      content: c.content,
      priority: (c.priority as Announcement['priority']) || 'normal',
      targetAudience: c.target_audience || [],
      publishDate: c.published_date ? c.published_date.split('T')[0] : '',
      expiryDate: c.expires_at ? c.expires_at.split('T')[0] : undefined,
      author: c.created_by || 'Admin',
      status: !c.published_date
        ? 'draft'
        : c.expires_at && new Date(c.expires_at) < new Date()
          ? 'expired'
          : 'published',
      notificationSent: !!c.published_date,
    })),
  [communications]);
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
    createCommunication.mutate({
      title: announcementData.title || '',
      content: announcementData.content || '',
      priority: announcementData.priority || 'normal',
      target_audience: announcementData.targetAudience || [],
      branch_id: '660e8400-e29b-41d4-a716-446655440001',
      created_by: 'aa0e8400-e29b-41d4-a716-446655440001',
      published_date: null,
      expires_at: announcementData.expiryDate ? new Date(announcementData.expiryDate).toISOString() : null,
      type: 'announcement',
    });
    setIsAddAnnouncementOpen(false);
    toast({
      title: "Announcement Created",
      description: `${announcementData.title} has been created as draft.`,
    });
  };

  const publishAnnouncement = (announcementId: string) => {
    updateCommunication.mutate({ id: announcementId, published_date: new Date().toISOString() });
    toast({
      title: "Announcement Published",
      description: "Announcement is now visible to the target audience.",
    });
  };

  const sendNotification = (announcementId: string) => {
    updateCommunication.mutate({ id: announcementId });
    toast({
      title: "Notification Sent",
      description: "Announcement notification has been sent to all target users.",
    });
  };

  const deleteAnnouncement = (announcementId: string) => {
    deleteCommunication.mutate(announcementId);
    toast({
      title: "Announcement Deleted",
      description: "Announcement has been successfully deleted.",
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