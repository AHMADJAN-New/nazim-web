import {
  AlertCircle,
  Bug,
  Eye,
  Filter,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { PageHeader } from '@/components/layout/PageHeader';
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
import { LoadingSpinner } from '@/components/ui/loading';
import { useLanguage } from '@/hooks/useLanguage';
import { showToast } from '@/lib/toast';
import { formatDateTime } from '@/lib/utils';
import { usePlatformAdminPermissions } from '@/platform/hooks/usePlatformAdminPermissions';
import { platformApi } from '@/platform/lib/platformApi';

export interface ClientErrorReport {
  id: string;
  client_error_id?: string | null;
  message: string;
  stack?: string | null;
  component_stack?: string | null;
  url?: string | null;
  user_agent?: string | null;
  level: string;
  user_id?: string | null;
  organization_id?: string | null;
  school_id?: string | null;
  user_reported: boolean;
  user_note?: string | null;
  status: 'new' | 'read' | 'resolved' | 'ignored';
  admin_notes?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  ip_address?: string | null;
  created_at: string;
  updated_at: string;
}

interface ClientErrorReportStats {
  total: number;
  new: number;
  read: number;
  resolved: number;
  ignored: number;
  user_reported: number;
  today: number;
}

function truncate(text: string, max = 80): string {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function pagePath(url?: string | null): string {
  if (!url) return '—';
  try {
    const u = new URL(url);
    return `${u.pathname}${u.search}` || url;
  } catch {
    return url;
  }
}

export default function ErrorReportsManagement() {
  const { t, isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const { data: permissions, isLoading: permissionsLoading } = usePlatformAdminPermissions();
  const hasAdminPermission = Array.isArray(permissions) && permissions.includes('subscription.admin');

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [userReportedFilter, setUserReportedFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ClientErrorReport | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  const { data: listData, isLoading } = useQuery({
    queryKey: ['platform-error-reports', statusFilter, userReportedFilter, search, page],
    enabled: !permissionsLoading && hasAdminPermission,
    queryFn: async () => {
      return platformApi.errorReports.list({
        status: statusFilter === 'all' ? undefined : statusFilter,
        user_reported: userReportedFilter === 'all' ? undefined : userReportedFilter,
        search: search.trim() || undefined,
        page,
        per_page: 20,
      });
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: stats } = useQuery<ClientErrorReportStats>({
    queryKey: ['platform-error-reports-stats'],
    enabled: !permissionsLoading && hasAdminPermission,
    queryFn: async () => {
      const response = await platformApi.errorReports.stats();
      const raw = (response as { data?: Partial<ClientErrorReportStats> })?.data
        ?? (response as Partial<ClientErrorReportStats>);
      return {
        total: Number(raw?.total ?? 0),
        new: Number(raw?.new ?? 0),
        read: Number(raw?.read ?? 0),
        resolved: Number(raw?.resolved ?? 0),
        ignored: Number(raw?.ignored ?? 0),
        user_reported: Number(raw?.user_reported ?? 0),
        today: Number(raw?.today ?? 0),
      };
    },
    staleTime: 30 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: { status?: ClientErrorReport['status']; admin_notes?: string };
    }) => platformApi.errorReports.update(id, updates),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['platform-error-reports'] });
      queryClient.invalidateQueries({ queryKey: ['platform-error-reports-stats'] });
      const data = (res as { data?: ClientErrorReport }).data;
      if (data) {
        setSelected(data);
        setAdminNotes(data.admin_notes || '');
      }
      showToast.success(t('toast.saved') || 'Updated');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to update');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => platformApi.errorReports.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-error-reports'] });
      queryClient.invalidateQueries({ queryKey: ['platform-error-reports-stats'] });
      setViewOpen(false);
      setSelected(null);
      showToast.success(t('toast.deleted') || 'Deleted');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to delete');
    },
  });

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

  const reports = listData?.data ?? [];
  const total = listData?.total ?? 0;
  const lastPage = listData?.last_page ?? 1;

  const statusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge className="bg-blue-500">New</Badge>;
      case 'read':
        return <Badge variant="secondary">Read</Badge>;
      case 'resolved':
        return <Badge className="bg-green-600">Resolved</Badge>;
      case 'ignored':
        return <Badge variant="outline">Ignored</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const openDetail = (report: ClientErrorReport) => {
    setSelected(report);
    setAdminNotes(report.admin_notes || '');
    setViewOpen(true);
    if (report.status === 'new') {
      updateMutation.mutate({ id: report.id, updates: { status: 'read' } });
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      <PageHeader
        title="Error Reports"
        description="Client-side crashes and user-submitted bug reports from the app"
        icon={<Bug className="h-5 w-5" />}
      />

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
        {[
          { label: 'Total', value: stats?.total ?? 0 },
          { label: 'New', value: stats?.new ?? 0 },
          { label: 'Read', value: stats?.read ?? 0 },
          { label: 'Resolved', value: stats?.resolved ?? 0 },
          { label: 'Ignored', value: stats?.ignored ?? 0 },
          { label: 'User reported', value: stats?.user_reported ?? 0 },
          { label: 'Today', value: stats?.today ?? 0 },
        ].map((s) => (
          <Card key={s.label} className="overflow-hidden">
            <CardHeader className="p-3 pb-1">
              <CardDescription className="text-xs">{s.label}</CardDescription>
              <CardTitle className="text-xl">{s.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-3 md:items-end">
            <div className="flex-1 space-y-1">
              <Label className="flex items-center gap-1 text-xs">
                <Search className="h-3 w-3" /> Search
              </Label>
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Message, URL, note…"
              />
            </div>
            <div className="w-full md:w-40 space-y-1">
              <Label className="flex items-center gap-1 text-xs">
                <Filter className="h-3 w-3" /> Status
              </Label>
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="ignored">Ignored</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-44 space-y-1">
              <Label className="text-xs">User reported</Label>
              <Select
                value={userReportedFilter}
                onValueChange={(v) => {
                  setUserReportedFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <AlertCircle className="h-8 w-8" />
              <p>No error reports found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Page</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Reported</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatDateTime(report.created_at)}
                        </TableCell>
                        <TableCell className="max-w-[240px] text-sm" title={report.message}>
                          {truncate(report.message)}
                        </TableCell>
                        <TableCell className="max-w-[180px] text-xs font-mono" title={report.url || ''}>
                          {truncate(pagePath(report.url), 40)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{report.level}</Badge>
                        </TableCell>
                        <TableCell>
                          {report.user_reported ? (
                            <Badge className="bg-amber-500">Yes</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">No</span>
                          )}
                        </TableCell>
                        <TableCell>{statusBadge(report.status)}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => openDetail(report)} aria-label="View">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
                <span>
                  {total} total · page {page} of {lastPage}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= lastPage}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Error report</DialogTitle>
            <DialogDescription>
              {selected?.client_error_id ? `Client ID: ${selected.client_error_id}` : selected?.id}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-2">
                {statusBadge(selected.status)}
                <Badge variant="outline">{selected.level}</Badge>
                {selected.user_reported && <Badge className="bg-amber-500">User reported</Badge>}
              </div>
              <div>
                <Label>Message</Label>
                <p className="mt-1 whitespace-pre-wrap break-words">{selected.message}</p>
              </div>
              <div>
                <Label>URL</Label>
                <p className="mt-1 font-mono text-xs break-all">{selected.url || '—'}</p>
              </div>
              {selected.user_note && (
                <div>
                  <Label>User note</Label>
                  <p className="mt-1 whitespace-pre-wrap">{selected.user_note}</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Organization</Label>
                  <p className="font-mono text-xs mt-1">{selected.organization_id || '—'}</p>
                </div>
                <div>
                  <Label>User</Label>
                  <p className="font-mono text-xs mt-1">{selected.user_id || '—'}</p>
                </div>
                <div>
                  <Label>School</Label>
                  <p className="font-mono text-xs mt-1">{selected.school_id || '—'}</p>
                </div>
                <div>
                  <Label>IP</Label>
                  <p className="font-mono text-xs mt-1">{selected.ip_address || '—'}</p>
                </div>
              </div>
              {selected.stack && (
                <div>
                  <Label>Stack</Label>
                  <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto max-h-40 whitespace-pre-wrap">
                    {selected.stack}
                  </pre>
                </div>
              )}
              {selected.component_stack && (
                <div>
                  <Label>Component stack</Label>
                  <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto max-h-40 whitespace-pre-wrap">
                    {selected.component_stack}
                  </pre>
                </div>
              )}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={selected.status}
                  onValueChange={(v) =>
                    updateMutation.mutate({
                      id: selected.id,
                      updates: { status: v as ClientErrorReport['status'] },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="read">Read</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="ignored">Ignored</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Admin notes</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                />
                <Button
                  size="sm"
                  onClick={() =>
                    updateMutation.mutate({
                      id: selected.id,
                      updates: { admin_notes: adminNotes },
                    })
                  }
                  disabled={updateMutation.isPending}
                >
                  Save notes
                </Button>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => selected && deleteMutation.mutate(selected.id)}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
            <Button variant="outline" onClick={() => setViewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
