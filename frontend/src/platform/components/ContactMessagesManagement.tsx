import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Mail,
  Search,
  Filter,
  Eye,
  Reply,
  Archive,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Clock,
  MessageSquare,
  User,
  Building2,
  Users,
  Phone,
  Calendar,
  FileText,
  XCircle,
} from 'lucide-react';

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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { platformApi } from '@/platform/lib/platformApi';
import { showToast } from '@/lib/toast';
import { LoadingSpinner } from '@/components/ui/loading';
import { formatDate, formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface ContactMessage {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  school_name?: string | null;
  student_count?: number | null;
  message: string;
  status: 'new' | 'read' | 'replied' | 'archived';
  admin_notes?: string | null;
  replied_by?: string | null;
  replied_at?: string | null;
  reply_subject?: string | null;
  reply_message?: string | null;
  source: string;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

interface MessageStats {
  total: number;
  new: number;
  read: number;
  replied: number;
  archived: number;
  today: number;
  this_week: number;
  this_month: number;
}

export function ContactMessagesManagement() {
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingMessage, setViewingMessage] = useState<ContactMessage | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isReplyDialogOpen, setIsReplyDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [replySubject, setReplySubject] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  // Fetch messages
  const { data: messagesData, isLoading } = useQuery({
    queryKey: ['platform-contact-messages', selectedStatus, searchQuery],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (selectedStatus !== 'all') {
        params.status = selectedStatus;
      }
      if (searchQuery) {
        params.search = searchQuery;
      }
      return await platformApi.contactMessages.list(params);
    },
  });

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ['platform-contact-messages-stats'],
    queryFn: async () => {
      const response = await platformApi.contactMessages.stats();
      return response.data;
    },
  });

  // Update message
  const updateMessage = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ContactMessage> }) => {
      return await platformApi.contactMessages.update(id, data);
    },
    onSuccess: () => {
      showToast.success('Message updated successfully');
      queryClient.invalidateQueries({ queryKey: ['platform-contact-messages'] });
      queryClient.invalidateQueries({ queryKey: ['platform-contact-messages-stats'] });
      setIsViewDialogOpen(false);
      setIsReplyDialogOpen(false);
      setViewingMessage(null);
      setReplySubject('');
      setReplyMessage('');
      setAdminNotes('');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to update message');
    },
  });

  // Delete message
  const deleteMessage = useMutation({
    mutationFn: async (id: string) => {
      return await platformApi.contactMessages.delete(id);
    },
    onSuccess: () => {
      showToast.success('Message deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['platform-contact-messages'] });
      queryClient.invalidateQueries({ queryKey: ['platform-contact-messages-stats'] });
      setDeletingId(null);
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to delete message');
    },
  });

  // Fetch single message
  const { data: messageDetail } = useQuery({
    queryKey: ['platform-contact-message', viewingMessage?.id],
    queryFn: async () => {
      if (!viewingMessage?.id) return null;
      const response = await platformApi.contactMessages.get(viewingMessage.id);
      return response.data;
    },
    enabled: !!viewingMessage?.id && isViewDialogOpen,
  });

  const handleView = (message: ContactMessage) => {
    setViewingMessage(message);
    setIsViewDialogOpen(true);
  };

  const handleReply = () => {
    if (!viewingMessage) return;
    setReplySubject(`Re: Your inquiry from ${viewingMessage.first_name} ${viewingMessage.last_name}`);
    setIsReplyDialogOpen(true);
  };

  const handleSendReply = () => {
    if (!viewingMessage) return;
    updateMessage.mutate({
      id: viewingMessage.id,
      data: {
        reply_subject: replySubject,
        reply_message: replyMessage,
        status: 'replied',
      },
    });
  };

  const handleStatusChange = (messageId: string, newStatus: string) => {
    updateMessage.mutate({
      id: messageId,
      data: { status: newStatus as ContactMessage['status'] },
    });
  };

  const handleDelete = () => {
    if (deletingId) {
      deleteMessage.mutate(deletingId);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      new: { variant: 'default', label: 'New' },
      read: { variant: 'secondary', label: 'Read' },
      replied: { variant: 'default', label: 'Replied' },
      archived: { variant: 'outline', label: 'Archived' },
    };
    const config = variants[status] || { variant: 'secondary' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const messages = messagesData?.data || [];
  const stats = statsData || {
    total: 0,
    new: 0,
    read: 0,
    replied: 0,
    archived: 0,
    today: 0,
    this_week: 0,
    this_month: 0,
  };

  if (isLoading) {
    return <LoadingSpinner size="lg" />;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.new}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.this_week}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.this_month}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Messages Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Contact Messages
              </CardTitle>
              <CardDescription>
                Manage messages from the landing page contact form
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, school, or message..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
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

          {messages.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>School</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages.map((message) => (
                    <TableRow
                      key={message.id}
                      className={cn(
                        message.status === 'new' && 'bg-primary/5',
                        'cursor-pointer hover:bg-muted/50'
                      )}
                      onClick={() => handleView(message)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div>{message.first_name} {message.last_name}</div>
                            {message.phone && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {message.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {message.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        {message.school_name ? (
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span>{message.school_name}</span>
                            {message.student_count && (
                              <Badge variant="outline" className="ml-2">
                                <Users className="h-3 w-3 mr-1" />
                                {message.student_count}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate text-sm">
                          {message.message}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(message.status)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{formatDate(message.created_at)}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatDateTime(message.created_at)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(message)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {message.status !== 'replied' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                handleView(message);
                                handleReply();
                              }}
                            >
                              <Reply className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingId(message.id)}
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
          ) : (
            <div className="text-center py-12">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No messages found.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Message Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contact Message
            </DialogTitle>
            <DialogDescription>
              Message from {messageDetail?.first_name} {messageDetail?.last_name}
            </DialogDescription>
          </DialogHeader>

          {messageDetail && (
            <div className="space-y-6">
              {/* Message Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  <div className="font-medium">{messageDetail.first_name} {messageDetail.last_name}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <div className="font-medium">{messageDetail.email}</div>
                </div>
                {messageDetail.phone && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Phone</Label>
                    <div className="font-medium">{messageDetail.phone}</div>
                  </div>
                )}
                {messageDetail.school_name && (
                  <div>
                    <Label className="text-xs text-muted-foreground">School</Label>
                    <div className="font-medium">{messageDetail.school_name}</div>
                    {messageDetail.student_count && (
                      <div className="text-sm text-muted-foreground">
                        {messageDetail.student_count} students
                      </div>
                    )}
                  </div>
                )}
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div>{getStatusBadge(messageDetail.status)}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Date</Label>
                  <div className="font-medium">{formatDateTime(messageDetail.created_at)}</div>
                </div>
              </div>

              {/* Message Content */}
              <div>
                <Label className="text-xs text-muted-foreground">Message</Label>
                <div className="mt-2 p-4 bg-muted rounded-lg">
                  <p className="whitespace-pre-wrap">{messageDetail.message}</p>
                </div>
              </div>

              {/* Admin Notes */}
              <div>
                <Label htmlFor="admin_notes">Admin Notes</Label>
                <Textarea
                  id="admin_notes"
                  value={adminNotes || messageDetail.admin_notes || ''}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add internal notes about this message..."
                  rows={3}
                />
              </div>

              {/* Reply Section */}
              {messageDetail.replied_at && (
                <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-900 dark:text-green-100">Replied</span>
                    <span className="text-xs text-green-700 dark:text-green-300">
                      {formatDateTime(messageDetail.replied_at)}
                    </span>
                  </div>
                  {messageDetail.reply_subject && (
                    <div className="mb-2">
                      <Label className="text-xs text-muted-foreground">Subject</Label>
                      <div className="font-medium">{messageDetail.reply_subject}</div>
                    </div>
                  )}
                  {messageDetail.reply_message && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Reply</Label>
                      <div className="mt-1 p-3 bg-white dark:bg-gray-900 rounded border">
                        <p className="whitespace-pre-wrap text-sm">{messageDetail.reply_message}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex gap-2">
                  <Select
                    value={messageDetail.status}
                    onValueChange={(value) => handleStatusChange(messageDetail.id, value)}
                  >
                    <SelectTrigger className="w-[150px]">
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
                <div className="flex gap-2">
                  {messageDetail.status !== 'replied' && (
                    <Button onClick={handleReply}>
                      <Reply className="mr-2 h-4 w-4" />
                      Reply
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => {
                      updateMessage.mutate({
                        id: messageDetail.id,
                        data: { admin_notes: adminNotes || messageDetail.admin_notes },
                      });
                    }}
                    disabled={updateMessage.isPending}
                  >
                    {updateMessage.isPending ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Notes'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reply Dialog */}
      <Dialog open={isReplyDialogOpen} onOpenChange={setIsReplyDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reply to Message</DialogTitle>
            <DialogDescription>
              Send a reply to {viewingMessage?.first_name} {viewingMessage?.last_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="reply_subject">Subject</Label>
              <Input
                id="reply_subject"
                value={replySubject}
                onChange={(e) => setReplySubject(e.target.value)}
                placeholder="Reply subject..."
              />
            </div>
            <div>
              <Label htmlFor="reply_message">Message</Label>
              <Textarea
                id="reply_message"
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="Your reply message..."
                rows={8}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReplyDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendReply}
              disabled={!replyMessage || updateMessage.isPending}
            >
              {updateMessage.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Reply className="mr-2 h-4 w-4" />
                  Send Reply
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this contact message? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMessage.isPending}
            >
              {deleteMessage.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

