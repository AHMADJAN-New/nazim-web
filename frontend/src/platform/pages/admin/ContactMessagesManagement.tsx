import {
  Mail,
  Phone,
  MessageSquare,
  Search,
  Filter,
  Eye,
  Reply,
  Archive,
  Trash2,
  RefreshCw,
  Calendar,
  MapPin,
  Users,
  School,
  User,
  AlertCircle,
  CheckCircle,
  Clock,
  Send,
  Edit,
} from 'lucide-react';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/hooks/useLanguage';
import { showToast } from '@/lib/toast';
import { formatDate, formatDateTime } from '@/lib/utils';
import { platformApi } from '@/platform/lib/platformApi';
import { usePlatformAdminPermissions } from '@/platform/hooks/usePlatformAdminPermissions';
import { PageHeader } from '@/components/layout/PageHeader';
import { LoadingSpinner } from '@/components/ui/loading';
import { CalendarFormField } from '@/components/ui/calendar-form-field';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

interface ContactMessage {
  id: string;
  first_name: string;
  last_name: string;
  position?: string | null;
  email: string;
  phone?: string | null;
  whatsapp?: string | null;
  preferred_contact_method?: 'email' | 'phone' | 'whatsapp' | null;
  school_name?: string | null;
  city?: string | null;
  country?: string | null;
  student_count?: number | null;
  number_of_schools?: number | null;
  staff_count?: number | null;
  message: string;
  status: 'new' | 'read' | 'replied' | 'archived';
  urgency?: 'low' | 'medium' | 'high' | null;
  admin_notes?: string | null;
  replied_by?: string | null;
  replied_at?: string | null;
  follow_up_date?: string | null;
  reply_subject?: string | null;
  reply_message?: string | null;
  source?: string | null;
  referral_source?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

interface ContactMessageStats {
  total: number;
  new: number;
  read: number;
  replied: number;
  archived: number;
  today: number;
  this_week: number;
  this_month: number;
}

const replyFormSchema = z.object({
  reply_subject: z.string().min(1, 'Subject is required'),
  reply_message: z.string().min(10, 'Message must be at least 10 characters'),
});

type ReplyFormData = z.infer<typeof replyFormSchema>;

export default function ContactMessagesManagement() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { data: permissions, isLoading: permissionsLoading } = usePlatformAdminPermissions();
  const hasAdminPermission = Array.isArray(permissions) && permissions.includes('subscription.admin');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [page, setPage] = useState(1);

  const {
    register: registerReply,
    handleSubmit: handleSubmitReply,
    formState: { errors: replyErrors },
    reset: resetReply,
    setValue: setReplyValue,
  } = useForm<ReplyFormData>({
    resolver: zodResolver(replyFormSchema),
    defaultValues: {
      reply_subject: '',
      reply_message: '',
    },
  });

  // Fetch contact messages
  const { data: messagesData, isLoading: messagesLoading } = useQuery<{
    data: ContactMessage[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  }>({
    queryKey: ['platform-contact-messages', statusFilter, search, page],
    enabled: !permissionsLoading && hasAdminPermission,
    queryFn: async () => {
      const params: Record<string, string> = {
        page: page.toString(),
        per_page: '20',
      };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (search) {
        params.search = search;
      }
      const response = await platformApi.contactMessages.list(params);
      return response as {
        data: ContactMessage[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
      };
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Fetch stats
  const { data: stats } = useQuery<ContactMessageStats>({
    queryKey: ['platform-contact-messages-stats'],
    enabled: !permissionsLoading && hasAdminPermission,
    queryFn: async () => {
      const response = await platformApi.contactMessages.stats();
      return (response as { data: ContactMessageStats }).data;
    },
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Update message mutation
  const updateMessage = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ContactMessage> }) => {
      return await platformApi.contactMessages.update(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-contact-messages'] });
      queryClient.invalidateQueries({ queryKey: ['platform-contact-messages-stats'] });
      showToast.success('Message updated successfully');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to update message');
    },
  });

  // Reply mutation
  const replyToMessage = useMutation({
    mutationFn: async ({ id, replyData }: { id: string; replyData: ReplyFormData }) => {
      return await platformApi.contactMessages.update(id, {
        reply_subject: replyData.reply_subject,
        reply_message: replyData.reply_message,
        status: 'replied',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-contact-messages'] });
      queryClient.invalidateQueries({ queryKey: ['platform-contact-messages-stats'] });
      showToast.success('Reply sent successfully');
      setReplyDialogOpen(false);
      resetReply();
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to send reply');
    },
  });

  // Delete mutation
  const deleteMessage = useMutation({
    mutationFn: async (id: string) => {
      return await platformApi.contactMessages.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-contact-messages'] });
      queryClient.invalidateQueries({ queryKey: ['platform-contact-messages-stats'] });
      showToast.success('Message deleted successfully');
      if (selectedMessage?.id) {
        setSelectedMessage(null);
        setViewDialogOpen(false);
      }
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to delete message');
    },
  });

  const handleViewMessage = async (message: ContactMessage) => {
    setSelectedMessage(message);
    setViewDialogOpen(true);
    // Mark as read if new
    if (message.status === 'new') {
      updateMessage.mutate({ id: message.id, updates: { status: 'read' } });
    }
  };

  const handleReply = (message: ContactMessage) => {
    setSelectedMessage(message);
    setReplyValue('reply_subject', `Re: Inquiry from ${message.first_name} ${message.last_name}`);
    setReplyDialogOpen(true);
  };

  const onSubmitReply = (data: ReplyFormData) => {
    if (!selectedMessage) return;
    replyToMessage.mutate({ id: selectedMessage.id, replyData: data });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge variant="default" className="bg-blue-500">New</Badge>;
      case 'read':
        return <Badge variant="secondary">Read</Badge>;
      case 'replied':
        return <Badge variant="default" className="bg-green-500">Replied</Badge>;
      case 'archived':
        return <Badge variant="outline">Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getUrgencyBadge = (urgency?: string | null) => {
    switch (urgency) {
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'medium':
        return <Badge variant="default" className="bg-yellow-500">Medium</Badge>;
      case 'low':
        return <Badge variant="secondary">Low</Badge>;
      default:
        return null;
    }
  };

  if (permissionsLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasAdminPermission) {
    return <Navigate to="/platform/dashboard" replace />;
  }

  const messages = messagesData?.data || [];
  const totalPages = messagesData?.last_page || 1;
  const currentPage = messagesData?.current_page || 1;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <PageHeader
        title="Contact Messages"
        description="Manage and respond to contact form submissions from the landing page"
        icon={<Mail className="h-5 w-5" />}
      />

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New Messages</CardTitle>
              <AlertCircle className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">{stats.new}</div>
              <p className="text-xs text-muted-foreground">Require attention</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Replied</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats.replied}</div>
              <p className="text-xs text-muted-foreground">This month: {stats.this_month}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.today}</div>
              <p className="text-xs text-muted-foreground">This week: {stats.this_week}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by name, email, school, city..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="read">Read</SelectItem>
                <SelectItem value="replied">Replied</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Messages Table */}
      <Card>
        <CardHeader>
          <CardTitle>Messages</CardTitle>
          <CardDescription>
            {messagesData?.total || 0} total messages
          </CardDescription>
        </CardHeader>
        <CardContent>
          {messagesLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No messages found
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>School</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Urgency</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {messages.map((message) => (
                      <TableRow 
                        key={message.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleViewMessage(message)}
                      >
                        <TableCell>
                          <div className="font-medium">
                            {message.first_name} {message.last_name}
                          </div>
                          {message.position && (
                            <div className="text-sm text-muted-foreground">{message.position}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <a
                              href={`mailto:${message.email}`}
                              className="text-blue-600 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {message.email}
                            </a>
                          </div>
                          {message.phone && (
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {message.phone}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {message.school_name || '-'}
                          {message.student_count && (
                            <div className="text-sm text-muted-foreground">
                              {message.student_count} students
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {message.city || message.country ? (
                            <div className="flex items-center gap-1 text-sm">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              {[message.city, message.country].filter(Boolean).join(', ') || '-'}
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(message.status)}</TableCell>
                        <TableCell>{getUrgencyBadge(message.urgency)}</TableCell>
                        <TableCell className="text-sm">
                          {formatDate(new Date(message.created_at))}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewMessage(message)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {message.status !== 'replied' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleReply(message)}
                              >
                                <Reply className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this message?')) {
                                  deleteMessage.mutate(message.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* View Message Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Message Details</DialogTitle>
            <DialogDescription>
              Submitted on {selectedMessage && formatDateTime(new Date(selectedMessage.created_at))}
            </DialogDescription>
          </DialogHeader>
          {selectedMessage && (
            <div className="space-y-4">
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  <div className="font-medium">
                    {selectedMessage.first_name} {selectedMessage.last_name}
                  </div>
                </div>
                {selectedMessage.position && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Position</Label>
                    <div>{selectedMessage.position}</div>
                  </div>
                )}
                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <div className="flex items-center gap-2">
                    <a
                      href={`mailto:${selectedMessage.email}`}
                      className="text-blue-600 hover:underline"
                    >
                      {selectedMessage.email}
                    </a>
                  </div>
                </div>
                {selectedMessage.phone && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Phone</Label>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <a
                        href={`tel:${selectedMessage.phone}`}
                        className="text-blue-600 hover:underline"
                      >
                        {selectedMessage.phone}
                      </a>
                    </div>
                  </div>
                )}
                {selectedMessage.whatsapp && (
                  <div>
                    <Label className="text-xs text-muted-foreground">WhatsApp</Label>
                    <div className="flex items-center gap-2">
                      <a
                        href={`https://wa.me/${selectedMessage.whatsapp.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {selectedMessage.whatsapp}
                      </a>
                    </div>
                  </div>
                )}
                {selectedMessage.preferred_contact_method && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Preferred Contact</Label>
                    <div className="capitalize">{selectedMessage.preferred_contact_method}</div>
                  </div>
                )}
                {selectedMessage.school_name && (
                  <div>
                    <Label className="text-xs text-muted-foreground">School Name</Label>
                    <div>{selectedMessage.school_name}</div>
                  </div>
                )}
                {(selectedMessage.city || selectedMessage.country) && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Location</Label>
                    <div>{[selectedMessage.city, selectedMessage.country].filter(Boolean).join(', ')}</div>
                  </div>
                )}
                {selectedMessage.student_count && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Students</Label>
                    <div>{selectedMessage.student_count}</div>
                  </div>
                )}
                {selectedMessage.number_of_schools && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Number of Schools</Label>
                    <div>{selectedMessage.number_of_schools}</div>
                  </div>
                )}
                {selectedMessage.staff_count && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Staff Count</Label>
                    <div>{selectedMessage.staff_count}</div>
                  </div>
                )}
                {selectedMessage.referral_source && (
                  <div>
                    <Label className="text-xs text-muted-foreground">How they heard about us</Label>
                    <div>{selectedMessage.referral_source}</div>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Message</Label>
                <div className="mt-1 p-3 bg-muted rounded-md whitespace-pre-wrap">
                  {selectedMessage.message}
                </div>
              </div>

              {selectedMessage.reply_subject && selectedMessage.reply_message && (
                <div className="border-t pt-4">
                  <Label className="text-xs text-muted-foreground">Reply</Label>
                  <div className="mt-1">
                    <div className="font-medium">{selectedMessage.reply_subject}</div>
                    <div className="mt-2 p-3 bg-muted rounded-md whitespace-pre-wrap">
                      {selectedMessage.reply_message}
                    </div>
                    {selectedMessage.replied_at && (
                      <div className="text-xs text-muted-foreground mt-2">
                        Replied on {formatDateTime(new Date(selectedMessage.replied_at))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 pt-4 border-t">
                <div className="flex-1">
                  <Label>Status</Label>
                  <Select
                    value={selectedMessage.status}
                    onValueChange={(value) => {
                      updateMessage.mutate({
                        id: selectedMessage.id,
                        updates: { status: value as ContactMessage['status'] },
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="read">Read</SelectItem>
                      <SelectItem value="replied">Replied</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label>Urgency</Label>
                  <Select
                    value={selectedMessage.urgency || 'medium'}
                    onValueChange={(value) => {
                      updateMessage.mutate({
                        id: selectedMessage.id,
                        updates: { urgency: value as ContactMessage['urgency'] },
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Admin Notes</Label>
                <Textarea
                  placeholder="Add internal notes..."
                  value={selectedMessage.admin_notes || ''}
                  onChange={(e) => {
                    updateMessage.mutate({
                      id: selectedMessage.id,
                      updates: { admin_notes: e.target.value },
                    });
                  }}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            {selectedMessage && selectedMessage.status !== 'replied' && (
              <Button onClick={() => {
                setViewDialogOpen(false);
                handleReply(selectedMessage);
              }}>
                <Reply className="h-4 w-4 mr-2" />
                Reply
              </Button>
            )}
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reply Dialog */}
      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reply to Message</DialogTitle>
            <DialogDescription>
              Send a reply to {selectedMessage?.first_name} {selectedMessage?.last_name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitReply(onSubmitReply)} className="space-y-4">
            <div>
              <Label htmlFor="reply_subject">Subject</Label>
              <Input
                id="reply_subject"
                {...registerReply('reply_subject')}
                placeholder="Reply subject"
              />
              {replyErrors.reply_subject && (
                <p className="text-sm text-destructive mt-1">{replyErrors.reply_subject.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="reply_message">Message</Label>
              <Textarea
                id="reply_message"
                {...registerReply('reply_message')}
                placeholder="Your reply message..."
                rows={8}
              />
              {replyErrors.reply_message && (
                <p className="text-sm text-destructive mt-1">{replyErrors.reply_message.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setReplyDialogOpen(false);
                  resetReply();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={replyToMessage.isPending}>
                {replyToMessage.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Reply
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

