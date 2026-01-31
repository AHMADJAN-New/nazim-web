import { useState, useMemo } from 'react';
import { Inbox, Search, Mail, MailOpen, Reply, Archive, Trash2, Clock } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { FilterPanel } from '@/components/layout/FilterPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    useWebsiteInbox,
    useWebsiteInboxStats,
    useUpdateWebsiteInboxMessage,
    useDeleteWebsiteInboxMessage,
    type WebsiteInboxMessage,
} from '@/website/hooks/useWebsiteContent';
import { formatDate } from '@/lib/utils';
import { useLanguage } from '@/hooks/useLanguage';

export default function WebsiteInboxPage() {
    const { t } = useLanguage();
    const { data: inboxData, isLoading } = useWebsiteInbox();
    const { data: stats } = useWebsiteInboxStats();
    const updateMessage = useUpdateWebsiteInboxMessage();
    const deleteMessage = useDeleteWebsiteInboxMessage();

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [viewMessage, setViewMessage] = useState<WebsiteInboxMessage | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const messages = inboxData?.data ?? [];
    const statusOptions = [
        { value: 'all', label: t('websiteAdmin.common.all') },
        { value: 'new', label: t('websiteAdmin.inbox.statuses.new') },
        { value: 'read', label: t('websiteAdmin.inbox.statuses.read') },
        { value: 'replied', label: t('websiteAdmin.inbox.statuses.replied') },
        { value: 'archived', label: t('websiteAdmin.inbox.statuses.archived') },
    ];

    const filteredMessages = useMemo(() => {
        return messages.filter((m) => {
            const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.message.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [messages, searchQuery, statusFilter]);

    const handleStatusUpdate = async (id: string, status: string) => {
        await updateMessage.mutateAsync({ id, status });
        if (viewMessage?.id === id) {
            setViewMessage((prev) => prev ? { ...prev, status: status as WebsiteInboxMessage['status'] } : null);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        await deleteMessage.mutateAsync(deleteId);
        setDeleteId(null);
        if (viewMessage?.id === deleteId) setViewMessage(null);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'new': return <Badge variant="default">{t('websiteAdmin.inbox.statuses.new')}</Badge>;
            case 'read': return <Badge variant="secondary">{t('websiteAdmin.inbox.statuses.read')}</Badge>;
            case 'replied':
                return <Badge variant="outline" className="border-green-500 text-green-600">{t('websiteAdmin.inbox.statuses.replied')}</Badge>;
            case 'archived': return <Badge variant="outline">{t('websiteAdmin.inbox.statuses.archived')}</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-64"><LoadingSpinner /></div>;
    }

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
            <PageHeader
                title={t('websiteAdmin.inbox.title')}
                description={t('websiteAdmin.inbox.description')}
                icon={<Inbox className="h-5 w-5" />}
            />

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">{t('websiteAdmin.inbox.stats.new')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{stats?.new ?? 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">{t('websiteAdmin.inbox.stats.read')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.read ?? 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">{t('websiteAdmin.inbox.stats.replied')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats?.replied ?? 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">{t('websiteAdmin.inbox.stats.total')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.total ?? 0}</div>
                    </CardContent>
                </Card>
            </div>

            <FilterPanel title={t('websiteAdmin.common.filters')}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>{t('websiteAdmin.common.search')}</Label>
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder={t('websiteAdmin.inbox.searchPlaceholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>{t('websiteAdmin.common.status')}</Label>
                        <div className="flex flex-wrap gap-2">
                            {statusOptions.map((s) => (
                                <Button
                                    key={s.value}
                                    variant={statusFilter === s.value ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setStatusFilter(s.value)}
                                >
                                    {s.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>
            </FilterPanel>

            {/* Messages List */}
            <div className="space-y-2">
                {filteredMessages.length === 0 ? (
                    <Card>
                        <CardContent className="text-center text-muted-foreground py-12">
                            {t('websiteAdmin.inbox.noResults')}
                        </CardContent>
                    </Card>
                ) : (
                    filteredMessages.map((msg) => (
                        <Card
                            key={msg.id}
                            className={`cursor-pointer hover:bg-muted/50 transition-colors ${msg.status === 'new' ? 'border-l-4 border-l-blue-500' : ''}`}
                            onClick={() => setViewMessage(msg)}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                        {msg.status === 'new' ? (
                                            <Mail className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                                        ) : (
                                            <MailOpen className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`font-medium ${msg.status === 'new' ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                    {msg.name}
                                                </span>
                                                {msg.email && <span className="text-sm text-muted-foreground">&lt;{msg.email}&gt;</span>}
                                            </div>
                                            <div className="font-medium mt-1">{msg.subject || t('websiteAdmin.inbox.noSubject')}</div>
                                            <div className="text-sm text-muted-foreground line-clamp-2 mt-1">{msg.message}</div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2 shrink-0">
                                        {getStatusBadge(msg.status)}
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Clock className="h-3 w-3" />
                                            {formatDate(new Date(msg.created_at))}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* View Message Dialog */}
            <Dialog open={!!viewMessage} onOpenChange={(o) => !o && setViewMessage(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{viewMessage?.subject || t('websiteAdmin.inbox.noSubject')}</DialogTitle>
                    </DialogHeader>
                    {viewMessage && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-medium">{viewMessage.name}</div>
                                    <div className="text-sm text-muted-foreground">{viewMessage.email}</div>
                                    {viewMessage.phone && <div className="text-sm text-muted-foreground">{viewMessage.phone}</div>}
                                </div>
                                {getStatusBadge(viewMessage.status)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                                {t('websiteAdmin.inbox.received')}: {formatDate(new Date(viewMessage.created_at))}
                            </div>
                            <div className="p-4 bg-muted rounded-md whitespace-pre-wrap">{viewMessage.message}</div>
                            <div className="flex gap-2 flex-wrap">
                                {viewMessage.status === 'new' && (
                                    <Button size="sm" onClick={() => handleStatusUpdate(viewMessage.id, 'read')}>
                                        <MailOpen className="h-4 w-4 mr-1" /> {t('websiteAdmin.inbox.actions.markRead')}
                                    </Button>
                                )}
                                {viewMessage.status !== 'replied' && (
                                    <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(viewMessage.id, 'replied')}>
                                        <Reply className="h-4 w-4 mr-1" /> {t('websiteAdmin.inbox.actions.markReplied')}
                                    </Button>
                                )}
                                {viewMessage.status !== 'archived' && (
                                    <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(viewMessage.id, 'archived')}>
                                        <Archive className="h-4 w-4 mr-1" /> {t('websiteAdmin.inbox.actions.archive')}
                                    </Button>
                                )}
                                <Button size="sm" variant="destructive" onClick={() => { setDeleteId(viewMessage.id); setViewMessage(null); }}>
                                    <Trash2 className="h-4 w-4 mr-1" /> {t('websiteAdmin.inbox.actions.delete')}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('websiteAdmin.inbox.deleteTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('websiteAdmin.inbox.deleteDescription')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={deleteMessage.isPending}>{t('common.delete')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
