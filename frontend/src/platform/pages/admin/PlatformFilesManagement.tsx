import {
  Building2,
  Download,
  Eye,
  FileUp,
  FileText,
  FolderOpen,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  Upload,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Organization } from '@/types/domain/organization';
import { showToast } from '@/lib/toast';
import { formatDate } from '@/lib/utils';
import { platformApi, type PlatformFile } from '@/platform/lib/platformApi';
import { usePlatformAdminPermissions } from '@/platform/hooks/usePlatformAdminPermissions';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePlatformOrganizations } from '@/platform/hooks/usePlatformAdmin';

const PLATFORM_FILE_CATEGORIES: { value: string; label: string }[] = [
  { value: 'contract_template', label: 'Contract Template' },
  { value: 'signed_contract', label: 'Signed Contract' },
  { value: 'license_scan', label: 'License Scan' },
  { value: 'receipt', label: 'Receipt' },
  { value: 'business_document', label: 'Business Document' },
  { value: 'other', label: 'Other' },
];

export interface OrgDocument {
  id: string;
  document_category: string;
  title: string;
  notes: string | null;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  uploaded_by_name: string | null;
  created_at: string | null;
}

const DOCUMENT_CATEGORY_LABELS: Record<string, string> = {
  signed_order_form: 'Signed order form',
  contract: 'Contract',
  signed_contract: 'Signed contract',
  order_form_template: 'Order form template',
  identity_document: 'Identity document',
  payment_receipt: 'Payment receipt',
  supporting_document: 'Supporting document',
  other: 'Other',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PlatformFilesManagement() {
  const queryClient = useQueryClient();
  const { data: permissions, isLoading: permissionsLoading } = usePlatformAdminPermissions();
  const hasAdminPermission = Array.isArray(permissions) && permissions.includes('subscription.admin');

  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [filesOrgFilter, setFilesOrgFilter] = useState<string>('');
  const [uploadOrganizationId, setUploadOrganizationId] = useState<string>('');
  const [uploadCategory, setUploadCategory] = useState<string>('contract_template');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [previewDoc, setPreviewDoc] = useState<OrgDocument | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [orgSearchFilter, setOrgSearchFilter] = useState('');

  const { data: organizations = [] } = usePlatformOrganizations();

  const filteredOrganizations = useMemo(() => {
    const q = orgSearchFilter.trim().toLowerCase();
    if (!q) return organizations;
    return organizations.filter((org: Organization) => {
      const name = (org.name ?? '').toLowerCase();
      const slug = (org.slug ?? '').toLowerCase();
      const email = (org.email ?? '').toLowerCase();
      const city = (org.city ?? '').toLowerCase();
      const country = (org.country ?? '').toLowerCase();
      const address = (org.streetAddress ?? '').toLowerCase();
      return [name, slug, email, city, country, address].some((s) => s && s.includes(q));
    });
  }, [organizations, orgSearchFilter]);

  const { data: platformFilesResponse, isLoading: filesLoading } = useQuery({
    queryKey: ['platform-files', filesOrgFilter || undefined, categoryFilter || undefined],
    enabled: !permissionsLoading && hasAdminPermission,
    queryFn: async () => {
      const params: { organization_id?: string; category?: string } = {};
      if (filesOrgFilter) params.organization_id = filesOrgFilter;
      if (categoryFilter) params.category = categoryFilter;
      const res = await platformApi.platformFiles.list(
        Object.keys(params).length ? params : undefined
      );
      return res;
    },
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: orderFormResponse, isLoading: orderFormLoading } = useQuery({
    queryKey: ['platform-order-form-docs', selectedOrgId],
    enabled: !permissionsLoading && hasAdminPermission && !!selectedOrgId,
    queryFn: async () => {
      const res = await platformApi.orderForms.get(selectedOrgId);
      return res;
    },
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!uploadFile) throw new Error('Select a file');
      const form = new FormData();
      if (uploadOrganizationId) {
        form.append('organization_id', uploadOrganizationId);
      }
      form.append('category', uploadCategory);
      form.append('title', uploadTitle || uploadFile.name);
      form.append('notes', uploadNotes);
      form.append('file', uploadFile);
      return platformApi.platformFiles.upload(form);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['platform-files'] });
      setUploadTitle('');
      setUploadNotes('');
      setUploadFile(null);
      showToast.success('File uploaded successfully');
    },
    onError: (err: Error) => {
      showToast.error(err.message || 'Upload failed');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => platformApi.platformFiles.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['platform-files'] });
      showToast.success('File deleted');
    },
    onError: (err: Error) => {
      showToast.error(err.message || 'Delete failed');
    },
  });

  const handleDownloadPlatformFile = async (file: PlatformFile) => {
    try {
      const { blob, filename } = await platformApi.platformFiles.download(file.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || file.file_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      showToast.error((e as Error).message || 'Download failed');
    }
  };

  const handleDownloadOrgDocument = async (documentId: string) => {
    if (!selectedOrgId) return;
    try {
      const { blob, filename } = await platformApi.orderForms.downloadDocument(
        selectedOrgId,
        documentId
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'document';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      showToast.error((e as Error).message || 'Download failed');
    }
  };

  const handleOpenPreview = useCallback(
    async (doc: OrgDocument) => {
      if (!selectedOrgId) return;
      setPreviewDoc(doc);
      setPreviewBlobUrl(null);
      setPreviewLoading(true);
      try {
        const { blob } = await platformApi.orderForms.downloadDocument(
          selectedOrgId,
          doc.id
        );
        const url = window.URL.createObjectURL(blob);
        setPreviewBlobUrl(url);
      } catch (e) {
        showToast.error((e as Error).message || 'Failed to load preview');
        setPreviewDoc(null);
      } finally {
        setPreviewLoading(false);
      }
    },
    [selectedOrgId]
  );

  const handleClosePreview = useCallback(() => {
    if (previewBlobUrl) {
      window.URL.revokeObjectURL(previewBlobUrl);
    }
    setPreviewBlobUrl(null);
    setPreviewDoc(null);
  }, [previewBlobUrl]);

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

  const platformFiles: PlatformFile[] =
    (platformFilesResponse as { data?: PlatformFile[] })?.data ?? [];
  const orgDocuments: OrgDocument[] =
    (orderFormResponse as { data?: { documents?: OrgDocument[] } })?.data?.documents ?? [];

  return (
    <div className="container mx-auto max-w-7xl overflow-x-hidden p-4 md:p-6 space-y-6">
      <header className="border-b pb-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Platform Files</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Manage contract templates, licenses, and business documents. Browse and preview organization order-form attachments.
          </p>
        </div>
      </header>

      <Tabs defaultValue="platform" className="space-y-6">
        <TabsList className="inline-flex h-11 w-full max-w-md rounded-lg bg-muted/60 p-1">
          <TabsTrigger
            value="platform"
            className="flex flex-1 items-center justify-center gap-2 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Platform files</span>
          </TabsTrigger>
          <TabsTrigger
            value="orgs"
            className="flex flex-1 items-center justify-center gap-2 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Organizations</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="platform" className="space-y-6 mt-0">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2 overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-muted-foreground" />
                  Files
                </CardTitle>
                <CardDescription>
                  Filter and manage uploaded templates and business files.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1.5 min-w-[160px]">
                    <Label className="text-xs">Organization</Label>
                    <Select value={filesOrgFilter || 'all'} onValueChange={(v) => setFilesOrgFilter(v === 'all' ? '' : v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All organizations</SelectItem>
                        {organizations.map((org: Organization) => (
                          <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 min-w-[160px]">
                    <Label className="text-xs">Category</Label>
                    <Select value={categoryFilter || 'all'} onValueChange={(v) => setCategoryFilter(v === 'all' ? '' : v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All categories</SelectItem>
                        {PLATFORM_FILE_CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {filesLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                    <RefreshCw className="h-8 w-8 animate-spin" />
                    <span className="text-sm">Loading files…</span>
                  </div>
                ) : platformFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-xl border border-dashed bg-muted/20">
                    <FolderOpen className="h-12 w-12 text-muted-foreground/60" />
                    <p className="text-sm font-medium text-foreground">No files yet</p>
                    <p className="text-xs text-muted-foreground text-center max-w-xs">Upload a file in the panel on the right to get started.</p>
                  </div>
                ) : (
                  <div className="rounded-lg border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-[140px]">Organization</TableHead>
                          <TableHead className="w-[120px]">Category</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead className="hidden md:table-cell max-w-[140px]">Notes</TableHead>
                          <TableHead className="w-[72px]">Size</TableHead>
                          <TableHead className="w-[100px]">Date</TableHead>
                          <TableHead className="w-[100px] text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {platformFiles.map((f) => (
                          <TableRow key={f.id} className="hover:bg-muted/50">
                            <TableCell className="text-muted-foreground">{f.organization?.name ?? '—'}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="font-normal">
                                {PLATFORM_FILE_CATEGORIES.find((c) => c.value === f.category)?.label ?? f.category}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{f.title}</TableCell>
                            <TableCell className="hidden md:table-cell text-muted-foreground truncate max-w-[140px]" title={f.notes ?? undefined}>{f.notes ?? '—'}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">{formatFileSize(f.file_size)}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">{f.created_at ? formatDate(f.created_at) : '—'}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownloadPlatformFile(f)} aria-label="Download">
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(f.id)} disabled={deleteMutation.isPending} aria-label="Delete">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-primary/5 lg:col-span-1 h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  Upload new file
                </CardTitle>
                <CardDescription>
                  Organization is optional. Use &quot;Platform only&quot; for templates and licenses.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs">Organization (optional)</Label>
                  <Select value={uploadOrganizationId || 'none'} onValueChange={(v) => setUploadOrganizationId(v === 'none' ? '' : v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Platform only" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Platform only</SelectItem>
                      {organizations.map((org: Organization) => (
                        <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Category</Label>
                  <Select value={uploadCategory} onValueChange={setUploadCategory}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATFORM_FILE_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Title</Label>
                  <Input value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} placeholder="File title" className="h-9" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Notes</Label>
                  <Input value={uploadNotes} onChange={(e) => setUploadNotes(e.target.value)} placeholder="Optional" className="h-9" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">File</Label>
                  <Input type="file" onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)} className="h-9 text-sm file:mr-2 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1 file:text-primary-foreground file:text-sm" />
                </div>
                <Button className="w-full" onClick={() => uploadMutation.mutate()} disabled={!uploadFile || uploadMutation.isPending}>
                  {uploadMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                  {uploadMutation.isPending ? 'Uploading…' : 'Upload'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="orgs" className="mt-0">
          <div className="grid gap-6 xl:grid-cols-[1fr,minmax(380px,420px)]">
            {/* Left: Organization list */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      Organizations
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Search and select an organization to view its order-form documents.
                    </CardDescription>
                  </div>
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      id="org-search"
                      type="search"
                      placeholder="Search name, email, location…"
                      value={orgSearchFilter}
                      onChange={(e) => setOrgSearchFilter(e.target.value)}
                      className="pl-9 h-9 bg-muted/40"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    {filteredOrganizations.length === organizations.length
                      ? `${organizations.length} organization${organizations.length !== 1 ? 's' : ''}`
                      : `${filteredOrganizations.length} of ${organizations.length} shown`}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-0 flex flex-col min-h-0">
                {filteredOrganizations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4 rounded-xl border border-dashed bg-muted/10">
                    <div className="rounded-full bg-muted/50 p-4">
                      <Building2 className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {organizations.length === 0 ? 'No organizations' : 'No matches'}
                      </p>
                      <p className="text-xs text-muted-foreground max-w-xs">
                        {organizations.length === 0
                          ? 'There are no organizations in the system yet.'
                          : 'Try a different search term or clear the filter.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border overflow-hidden flex flex-col min-h-0">
                    <div className="overflow-x-auto overflow-y-auto max-h-[50vh] xl:max-h-[58vh]">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-b">
                          <TableHead className="font-medium">Organization</TableHead>
                          <TableHead className="hidden md:table-cell w-[100px] text-muted-foreground font-normal">Slug</TableHead>
                          <TableHead className="hidden lg:table-cell max-w-[160px] text-muted-foreground font-normal">Contact</TableHead>
                          <TableHead className="hidden xl:table-cell w-[90px] text-muted-foreground font-normal">Location</TableHead>
                          <TableHead className="w-[44px]" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrganizations.map((org: Organization) => {
                          const isSelected = selectedOrgId === org.id;
                          return (
                            <TableRow
                              key={org.id}
                              className={`cursor-pointer transition-colors ${isSelected ? 'bg-primary/10 hover:bg-primary/15' : 'hover:bg-muted/50'}`}
                              onClick={() => setSelectedOrgId(isSelected ? '' : org.id)}
                            >
                              <TableCell className="py-3">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-medium text-muted-foreground">
                                    {(org.name ?? '?').charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-medium text-foreground">{org.name ?? '—'}</p>
                                    {org.email && (
                                      <p className="text-xs text-muted-foreground lg:hidden truncate max-w-[200px]">{org.email}</p>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="hidden md:table-cell text-muted-foreground text-sm font-mono">{org.slug ?? '—'}</TableCell>
                              <TableCell className="hidden lg:table-cell text-muted-foreground text-sm truncate max-w-[160px]" title={org.email ?? undefined}>
                                {org.email ?? '—'}
                              </TableCell>
                              <TableCell className="hidden xl:table-cell text-muted-foreground text-sm">
                                {[org.city, org.country].filter(Boolean).join(', ') || '—'}
                              </TableCell>
                              <TableCell className="py-3 text-right">
                                <Button
                                  variant={isSelected ? 'secondary' : 'ghost'}
                                  size="sm"
                                  className="h-8 shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedOrgId(isSelected ? '' : org.id);
                                  }}
                                >
                                  <FileText className="h-4 w-4 sm:mr-1.5" />
                                  <span className="hidden sm:inline">Documents</span>
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right: Documents panel */}
            <Card className={`overflow-hidden transition-all ${selectedOrgId ? 'ring-2 ring-primary/20' : ''}`}>
              <CardHeader className="pb-3">
                {selectedOrgId ? (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <FileText className="h-5 w-5 text-primary" />
                          Order-form documents
                        </CardTitle>
                        <CardDescription className="mt-1 flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-foreground">
                            {organizations.find((o: Organization) => o.id === selectedOrgId)?.name ?? 'Organization'}
                          </span>
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-muted-foreground text-xs"
                            onClick={() => setSelectedOrgId('')}
                          >
                            Change organization
                          </Button>
                        </CardDescription>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <CardTitle className="text-lg flex items-center gap-2 text-muted-foreground">
                      <FileText className="h-5 w-5" />
                      Documents
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Select an organization from the list to view contracts, receipts, and other attachments.
                    </CardDescription>
                  </>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                {!selectedOrgId ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-4 rounded-xl border border-dashed bg-muted/10 min-h-[280px]">
                    <div className="rounded-full bg-muted/50 p-4">
                      <FileText className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <div className="text-center space-y-1 px-4">
                      <p className="text-sm font-medium text-foreground">No organization selected</p>
                      <p className="text-xs text-muted-foreground max-w-xs">
                        Click an organization in the list or use &quot;Documents&quot; to view its order-form files.
                      </p>
                    </div>
                  </div>
                ) : orderFormLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground min-h-[200px]">
                    <RefreshCw className="h-8 w-8 animate-spin" />
                    <span className="text-sm">Loading documents…</span>
                  </div>
                ) : orgDocuments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-4 rounded-xl border border-dashed bg-muted/10 min-h-[200px]">
                    <div className="rounded-full bg-muted/50 p-3">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">No documents</p>
                    <p className="text-xs text-muted-foreground text-center max-w-xs">
                      This organization has no order-form attachments yet.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="font-medium">Type</TableHead>
                          <TableHead className="font-medium">Title</TableHead>
                          <TableHead className="w-[70px] text-muted-foreground font-normal">Size</TableHead>
                          <TableHead className="w-[90px] text-right font-normal">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orgDocuments.map((doc) => (
                          <TableRow key={doc.id} className="hover:bg-muted/50">
                            <TableCell>
                              <Badge variant="secondary" className="font-normal text-xs">
                                {DOCUMENT_CATEGORY_LABELS[doc.document_category] ?? doc.document_category}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <p className="font-medium truncate max-w-[180px]" title={doc.title || doc.file_name}>
                                {doc.title || doc.file_name}
                              </p>
                              {doc.created_at && (
                                <p className="text-xs text-muted-foreground">{formatDate(doc.created_at)}</p>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {doc.file_size != null ? formatFileSize(doc.file_size) : '—'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenPreview(doc)} aria-label="Preview" title="Preview">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownloadOrgDocument(doc.id)} aria-label="Download">
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && handleClosePreview()}>
        <DialogContent
          className="max-w-5xl w-[95vw] h-[90vh] max-h-[90vh] overflow-hidden flex flex-col gap-3 p-4 sm:p-6"
          aria-describedby={previewDoc ? 'preview-details' : undefined}
        >
          {previewDoc && (
            <>
              <DialogHeader className="flex-shrink-0 space-y-1">
                <DialogTitle className="pr-8 text-lg truncate" title={previewDoc.title || previewDoc.file_name}>
                  {previewDoc.title || previewDoc.file_name}
                </DialogTitle>
                <DialogDescription id="preview-details" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="font-normal text-xs">
                    {DOCUMENT_CATEGORY_LABELS[previewDoc.document_category] ?? previewDoc.document_category}
                  </Badge>
                  {previewDoc.file_name && <span className="truncate" title={previewDoc.file_name}>{previewDoc.file_name}</span>}
                  <span>·</span>
                  <span>{previewDoc.file_size != null ? formatFileSize(previewDoc.file_size) : '—'}</span>
                  <span>·</span>
                  <span>{previewDoc.created_at ? formatDate(previewDoc.created_at) : '—'}{previewDoc.uploaded_by_name ? ` · ${previewDoc.uploaded_by_name}` : ''}</span>
                  {previewDoc.notes && (
                    <>
                      <span className="w-full block mt-1 text-foreground/80" title={previewDoc.notes}>
                        {previewDoc.notes.length > 80 ? `${previewDoc.notes.slice(0, 80)}…` : previewDoc.notes}
                      </span>
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 min-h-0 rounded-lg border bg-muted/20 overflow-hidden flex flex-col">
                {previewLoading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : previewBlobUrl ? (
                  (() => {
                    const mime = previewDoc.mime_type ?? '';
                    const isPdf = mime === 'application/pdf' || /\.pdf$/i.test(previewDoc.file_name);
                    const isImage =
                      mime.startsWith('image/') ||
                      /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(previewDoc.file_name);
                    if (isPdf) {
                      return (
                        <div className="flex-1 min-h-0 w-full relative rounded-md overflow-hidden">
                          <iframe
                            src={previewBlobUrl}
                            title={previewDoc.file_name}
                            className="absolute inset-0 w-full h-full rounded-md border-0"
                          />
                        </div>
                      );
                    }
                    if (isImage) {
                      return (
                        <div className="flex-1 min-h-0 overflow-auto flex items-center justify-center p-2">
                          <img
                            src={previewBlobUrl}
                            alt={previewDoc.title || previewDoc.file_name}
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                      );
                    }
                    return (
                      <div className="flex-1 flex items-center justify-center text-center p-6 text-muted-foreground">
                        <div>
                          <p>Preview not available for this file type.</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3"
                            onClick={() => previewDoc && handleDownloadOrgDocument(previewDoc.id)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download file
                          </Button>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-muted-foreground">Loading preview…</p>
                  </div>
                )}
              </div>
              <DialogFooter className="flex-shrink-0 gap-2 sm:gap-0">
                <Button variant="outline" onClick={handleClosePreview}>
                  Close
                </Button>
                <Button onClick={() => previewDoc && handleDownloadOrgDocument(previewDoc.id)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
