import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, Users, Search, Filter, Plus, MoreHorizontal, Reply, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useUsers } from "@/hooks/useUsers";
import { useMessages, useCreateMessage, useUpdateMessage } from "@/hooks/useMessages";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

interface Message {
  id: string;
  subject: string;
  content: string;
  sender: User;
  recipients: User[];
  timestamp: string;
  isRead: boolean;
  isStarred: boolean;
  priority: 'low' | 'normal' | 'high';
  replies?: Message[];
}

interface Conversation {
  id: string;
  participants: User[];
  lastMessage: Message;
  unreadCount: number;
}

const priorityVariants = {
  low: "outline",
  normal: "secondary",
  high: "destructive"
} as const;

export default function MessagingPage() {
  const { toast } = useToast();
  const { data: users = [] } = useUsers();
  const { data: messagesData = [] } = useMessages();
  const createMessage = useCreateMessage();
  const updateMessage = useUpdateMessage();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'inbox' | 'conversations'>('conversations');

  const userMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);

  const messages = useMemo<Message[]>(() =>
    messagesData.map(m => ({
      id: m.id,
      subject: m.subject,
      content: m.content,
      sender: userMap.get(m.sender_id) || { id: m.sender_id, name: 'Unknown', email: '', role: '' },
      recipients: m.recipients.map(id => userMap.get(id)).filter(Boolean) as User[],
      timestamp: m.sent_at || new Date().toISOString(),
      isRead: (m as any).is_read || m.status === 'delivered',
      isStarred: (m as any).is_starred || false,
      priority: m.priority,
    })),
  [messagesData, userMap]);

  const conversations = useMemo<Conversation[]>(() => {
    const map = new Map<string, Conversation>();
    messages.forEach(m => {
      const key = [m.sender.id, ...m.recipients.map(r => r.id)].sort().join('-');
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          id: key,
          participants: [m.sender, ...m.recipients],
          lastMessage: m,
          unreadCount: m.isRead ? 0 : 1,
        });
      } else {
        if (new Date(m.timestamp).getTime() > new Date(existing.lastMessage.timestamp).getTime()) {
          existing.lastMessage = m;
        }
        if (!m.isRead) existing.unreadCount += 1;
      }
    });
    return Array.from(map.values());
  }, [messages]);

  const filteredMessages = messages.filter(message => {
    const matchesSearch = message.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         message.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         message.sender.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === "all" || message.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  const unreadCount = messages.filter(m => !m.isRead).length;
  const starredCount = messages.filter(m => m.isStarred).length;

  const handleSendMessage = (messageData: {
    recipients: string[];
    subject: string;
    content: string;
    priority: 'low' | 'normal' | 'high';
  }) => {
    createMessage.mutate(messageData);
    setIsComposeOpen(false);
    toast({
      title: "Message Sent",
      description: `Message sent to ${messageData.recipients.length} recipient(s).`
    });
  };

  const handleReply = (replyData: { content: string; }) => {
    if (!selectedMessage) return;
    createMessage.mutate({
      recipients: [selectedMessage.sender.id],
      subject: `Re: ${selectedMessage.subject}`,
      content: replyData.content,
      priority: selectedMessage.priority,
    });
    setIsReplyOpen(false);
    toast({
      title: "Reply Sent",
      description: "Your reply has been sent successfully.",
    });
  };

  const toggleStar = (messageId: string, current: boolean) => {
    updateMessage.mutate({ id: messageId, is_starred: !current });
  };

  const markAsRead = (messageId: string) => {
    updateMessage.mutate({ id: messageId, is_read: true, status: 'delivered' });
  };

  const selectMessage = (message: Message) => {
    if (!message.isRead) {
      markAsRead(message.id);
      message = { ...message, isRead: true };
    }
    setSelectedMessage(message);
  };

  return (
    <MainLayout 
      title="Messaging" 
      showBreadcrumb={true}
      breadcrumbItems={[
        { label: "Communication", href: "/communication" },
        { label: "Messages" }
      ]}
    >
      <div className="flex h-[calc(100vh-12rem)] space-x-6">
        {/* Sidebar */}
        <div className="w-80 space-y-4">
          {/* Compose Button */}
          <Button onClick={() => setIsComposeOpen(true)} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Compose Message
          </Button>

          {/* View Mode Toggle */}
          <div className="flex rounded-lg border p-1">
            <Button
              variant={viewMode === 'conversations' ? 'default' : 'ghost'}
              onClick={() => setViewMode('conversations')}
              className="flex-1"
              size="sm"
            >
              Conversations
            </Button>
            <Button
              variant={viewMode === 'inbox' ? 'default' : 'ghost'}
              onClick={() => setViewMode('inbox')}
              className="flex-1"
              size="sm"
            >
              All Messages
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            <Card className="p-3">
              <div className="text-sm font-medium">Unread</div>
              <div className="text-2xl font-bold">{unreadCount}</div>
            </Card>
            <Card className="p-3">
              <div className="text-sm font-medium">Starred</div>
              <div className="text-2xl font-bold">{starredCount}</div>
            </Card>
          </div>

          {/* Search and Filter */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground transform -translate-y-1/2" />
              <Input
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High Priority</SelectItem>
                <SelectItem value="normal">Normal Priority</SelectItem>
                <SelectItem value="low">Low Priority</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Message/Conversation List */}
          <Card className="flex-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {viewMode === 'conversations' ? 'Conversations' : 'Messages'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                {viewMode === 'conversations' ? (
                  <div className="space-y-1">
                    {conversations.map((conversation) => (
                      <div
                        key={conversation.id}
                        className={`p-3 cursor-pointer hover:bg-muted/50 border-b ${
                          selectedConversation?.id === conversation.id ? 'bg-muted' : ''
                        }`}
                        onClick={() => setSelectedConversation(conversation)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex -space-x-2">
                            {conversation.participants.slice(0, 2).map((participant) => (
                              <Avatar key={participant.id} className="w-8 h-8 border-2 border-background">
                                <AvatarImage src={participant.avatar} />
                                <AvatarFallback>{participant.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                              </Avatar>
                            ))}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium truncate">
                                {conversation.participants.map(p => p.name).join(', ')}
                              </p>
                              {conversation.unreadCount > 0 && (
                                <Badge variant="default" className="ml-2">
                                  {conversation.unreadCount}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {conversation.lastMessage.subject}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(conversation.lastMessage.timestamp), 'MMM dd')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`p-3 cursor-pointer hover:bg-muted/50 border-b ${
                          selectedMessage?.id === message.id ? 'bg-muted' : ''
                        } ${!message.isRead ? 'bg-blue-50/50' : ''}`}
                        onClick={() => selectMessage(message)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <p className={`text-sm truncate ${!message.isRead ? 'font-semibold' : 'font-medium'}`}>
                                {message.sender.name}
                              </p>
                              <Badge variant={priorityVariants[message.priority]} className="text-xs">
                                {message.priority}
                              </Badge>
                            </div>
                            <p className={`text-sm truncate ${!message.isRead ? 'font-medium' : ''}`}>
                              {message.subject}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {message.content}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(message.timestamp), 'MMM dd, HH:mm')}
                            </p>
                          </div>
                          <div className="flex items-center space-x-1">
                            {message.isStarred && (
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            )}
                            {!message.isRead && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Message Details */}
        <div className="flex-1">
          {selectedMessage ? (
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage src={selectedMessage.sender.avatar} />
                      <AvatarFallback>
                        {selectedMessage.sender.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{selectedMessage.subject}</CardTitle>
                      <CardDescription>
                        From: {selectedMessage.sender.name} ({selectedMessage.sender.role})
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleStar(selectedMessage.id, selectedMessage.isStarred)}
                    >
                      <Star className={`h-4 w-4 ${selectedMessage.isStarred ? 'text-yellow-500 fill-current' : ''}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsReplyOpen(true)}
                    >
                      <Reply className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <span>To: {selectedMessage.recipients.map(r => r.name).join(', ')}</span>
                  <span>•</span>
                  <span>{format(new Date(selectedMessage.timestamp), 'MMM dd, yyyy HH:mm')}</span>
                  <Badge variant={priorityVariants[selectedMessage.priority]}>
                    {selectedMessage.priority} priority
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap">{selectedMessage.content}</p>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium">Select a message to view</p>
                <p className="text-muted-foreground">Choose a message from the list to read its contents</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Compose Message Dialog */}
      <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Compose New Message</DialogTitle>
            <DialogDescription>
              Send a message to students, teachers, parents, or staff.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const recipients = Array.from(formData.getAll('recipients')) as string[];
            handleSendMessage({
              recipients,
              subject: formData.get('subject') as string,
              content: formData.get('content') as string,
              priority: formData.get('priority') as 'low' | 'normal' | 'high',
            });
          }}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="recipients">Recipients</Label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  {users.map(user => (
                    <div key={user.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={user.id}
                        name="recipients"
                        value={user.id}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor={user.id} className="text-sm">
                        {user.name} ({user.role})
                      </Label>
                    </div>
                  ))}
                </div>
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
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" name="subject" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="content">Message</Label>
                <Textarea 
                  id="content" 
                  name="content" 
                  rows={6}
                  placeholder="Type your message here..." 
                  required 
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">
                <Send className="h-4 w-4 mr-2" />
                Send Message
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reply Dialog */}
      <Dialog open={isReplyOpen} onOpenChange={setIsReplyOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Reply to Message</DialogTitle>
            <DialogDescription>
              {selectedMessage && `Replying to: ${selectedMessage.subject}`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            handleReply({
              content: formData.get('content') as string,
            });
          }}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="replyContent">Your Reply</Label>
                <Textarea 
                  id="replyContent" 
                  name="content" 
                  rows={6}
                  placeholder="Type your reply here..." 
                  required 
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">
                <Reply className="h-4 w-4 mr-2" />
                Send Reply
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}