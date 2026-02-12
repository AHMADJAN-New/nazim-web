import {
  Package,
  Upload,
  Plus,
  Edit,
  Trash2,
  Download,
  Loader2,
  CheckCircle,
  XCircle,
  Archive,
  FileText,
  Copy,
  ExternalLink,
  RefreshCw,
  HardDrive,
} from 'lucide-react';
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Progress } from '@/components/ui/progress';

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/hooks/useLanguage';
import { showToast } from '@/lib/toast';
import { platformApi } from '@/platform/lib/platformApi';

// ── Types ────────────────────────────────────────────────────────────────

interface DesktopRelease {
  id: string;
  version: string;
  display_name: string;
  release_notes: string | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  file_hash: string | null;
  status: 'draft' | 'published' | 'archived';
  is_latest: boolean;
  download_count: number;
  download_url: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

interface DesktopPrerequisite {
  id: string;
  name: string;
  version: string | null;
  description: string | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  file_hash: string | null;
  install_order: number;
  is_required: boolean;
  is_active: boolean;
  download_count: number;
  download_url: string | null;
  created_at: string;
  updated_at: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function formatBytes(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
  return (bytes / 1073741824).toFixed(2) + ' GB';
}

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusBadge(status: string, isLatest: boolean) {
  if (status === 'published' && isLatest) {
    return <Badge className="bg-green-600 text-white">Latest</Badge>;
  }
  if (status === 'published') {
    return <Badge className="bg-blue-600 text-white">Published</Badge>;
  }
  if (status === 'archived') {
    return <Badge variant="secondary">Archived</Badge>;
  }
  return <Badge variant="outline">Draft</Badge>;
}

// ── XHR upload with progress ────────────────────────────────────────────

interface UploadProgress {
  percent: number;
  loaded: number;
  total: number;
}

function uploadWithProgress(
  url: string,
  formData: FormData,
  onProgress: (p: UploadProgress) => void,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);

    // Add auth token (stored as 'api_token' by the API client)
    const token = localStorage.getItem('api_token');
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('Accept', 'application/json');

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        onProgress({ percent: Math.round((e.loaded / e.total) * 100), loaded: e.loaded, total: e.total });
      }
    });
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          resolve(null);
        }
      } else {
        let msg = 'Upload failed';
        if (xhr.status === 413) {
          msg = 'File too large. Server allows up to 500 MB; ensure Nginx and PHP upload limits are at least 512M.';
        } else {
          try { msg = JSON.parse(xhr.responseText)?.message || JSON.parse(xhr.responseText)?.error || msg; } catch { /* empty */ }
        }
        reject(new Error(msg));
      }
    });
    xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

    xhr.send(formData);
  });
}

// ── Upload Progress Bar component ───────────────────────────────────────

function UploadProgressBar({ progress, fileName }: { progress: UploadProgress | null; fileName?: string }) {
  if (!progress) return null;
  return (
    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground truncate max-w-[200px]">
          {fileName ? `Uploading ${fileName}...` : 'Uploading...'}
        </span>
        <span className="font-mono font-medium text-primary">{progress.percent}%</span>
      </div>
      <Progress value={progress.percent} className="h-2" />
      <div className="text-[10px] text-muted-foreground text-right">
        {formatBytes(progress.loaded)} / {formatBytes(progress.total)}
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────

export default function DesktopReleasesManagement() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('releases');

  // ── Upload progress state ──
  const [releaseUploadProgress, setReleaseUploadProgress] = useState<UploadProgress | null>(null);
  const [prereqUploadProgress, setPrereqUploadProgress] = useState<UploadProgress | null>(null);
  const [replaceReleaseProgress, setReplaceReleaseProgress] = useState<{ id: string; progress: UploadProgress } | null>(null);
  const [replacePrereqProgress, setReplacePrereqProgress] = useState<{ id: string; progress: UploadProgress } | null>(null);

  // ── Release state ──
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [editingRelease, setEditingRelease] = useState<DesktopRelease | null>(null);
  const [releaseForm, setReleaseForm] = useState({
    version: '',
    display_name: '',
    release_notes: '',
    status: 'draft' as 'draft' | 'published',
  });
  const [releaseFile, setReleaseFile] = useState<File | null>(null);
  const releaseFileRef = useRef<HTMLInputElement>(null);
  const replaceFileRef = useRef<HTMLInputElement>(null);

  // ── Prerequisite state ──
  const [prereqDialogOpen, setPrereqDialogOpen] = useState(false);
  const [editingPrereq, setEditingPrereq] = useState<DesktopPrerequisite | null>(null);
  const [prereqForm, setPrereqForm] = useState({
    name: '',
    version: '',
    description: '',
    install_order: 0,
    is_required: true,
    is_active: true,
  });
  const [prereqFile, setPrereqFile] = useState<File | null>(null);
  const prereqFileRef = useRef<HTMLInputElement>(null);
  const replacePrereqFileRef = useRef<HTMLInputElement>(null);

  // ── Queries ──

  const { data: releasesData, isLoading: releasesLoading } = useQuery({
    queryKey: ['platform-desktop-releases'],
    queryFn: async () => {
      const resp = await platformApi.desktopReleases.list();
      return (resp as { data: DesktopRelease[] }).data;
    },
  });

  const { data: prereqsData, isLoading: prereqsLoading } = useQuery({
    queryKey: ['platform-desktop-prerequisites'],
    queryFn: async () => {
      const resp = await platformApi.desktopPrerequisites.list();
      return (resp as { data: DesktopPrerequisite[] }).data;
    },
  });

  const releases = releasesData ?? [];
  const prerequisites = prereqsData ?? [];

  const { data: updatesFileStatus, refetch: refetchUpdatesFile } = useQuery({
    queryKey: ['platform-desktop-releases-updates-file'],
    queryFn: async () => {
      const r = await platformApi.desktopReleases.hasUpdatesFile();
      return r as { has_override: boolean };
    },
  });
  const hasUpdatesOverride = updatesFileStatus?.has_override ?? false;

  const uploadUpdatesFileMutation = useMutation({
    mutationFn: (file: File) => platformApi.desktopReleases.uploadUpdatesFile(file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['platform-desktop-releases-updates-file'] });
      refetchUpdatesFile();
      showToast.success('Updates file uploaded and is now served');
    },
    onError: (e: Error) => showToast.error(e?.message ?? 'Upload failed'),
  });
  const deleteUpdatesFileMutation = useMutation({
    mutationFn: () => platformApi.desktopReleases.deleteUpdatesFile(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['platform-desktop-releases-updates-file'] });
      refetchUpdatesFile();
      showToast.success('Override removed; auto-generated content will be served again');
    },
    onError: (e: Error) => showToast.error(e?.message ?? 'Remove failed'),
  });

  const updatesFileInputRef = useRef<HTMLInputElement>(null);

  // Desktop config (friendly download URL, updates.txt URL) — public API
  const apiBase = import.meta.env.VITE_API_BASE_URL
    ? (String(import.meta.env.VITE_API_BASE_URL).startsWith('http')
        ? String(import.meta.env.VITE_API_BASE_URL)
        : `${window.location.origin}${String(import.meta.env.VITE_API_BASE_URL)}`)
    : `${window.location.origin}/api`;
  const { data: desktopConfig } = useQuery({
    queryKey: ['desktop-config'],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/desktop/config`);
      if (!res.ok) throw new Error('Failed to load desktop config');
      return res.json() as Promise<{
        download_path: string;
        download_filename: string;
        friendly_download_url: string;
        updater_config_url: string;
      }>;
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── Release Mutations ──

  const createReleaseMutation = useMutation({
    retry: false, // Large file uploads: avoid retrying on 413/network so progress does not reset
    mutationFn: async (data: { version: string; display_name: string; release_notes?: string; file: File; status?: 'draft' | 'published' }) => {
      const formData = new FormData();
      formData.append('version', data.version);
      formData.append('display_name', data.display_name);
      if (data.release_notes) formData.append('release_notes', data.release_notes);
      formData.append('file', data.file);
      if (data.status) formData.append('status', data.status);
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
      return uploadWithProgress(
        `${baseUrl}/platform/desktop-releases`,
        formData,
        (p) => setReleaseUploadProgress(p),
      );
    },
    onSuccess: () => {
      setReleaseUploadProgress(null);
      queryClient.invalidateQueries({ queryKey: ['platform-desktop-releases'] });
      showToast.success('Release created successfully');
      closeReleaseDialog();
    },
    onError: (err: any) => {
      setReleaseUploadProgress(null);
      showToast.error(err?.message || 'Failed to create release');
    },
  });

  const updateReleaseMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      platformApi.desktopReleases.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-desktop-releases'] });
      showToast.success('Release updated successfully');
      closeReleaseDialog();
    },
    onError: (err: any) => {
      showToast.error(err?.message || 'Failed to update release');
    },
  });

  const replaceReleaseFileMutation = useMutation({
    retry: false, // Large file uploads: avoid retrying on 413/network so progress does not reset
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
      return uploadWithProgress(
        `${baseUrl}/platform/desktop-releases/${id}/replace-file`,
        formData,
        (p) => setReplaceReleaseProgress({ id, progress: p }),
      );
    },
    onSuccess: () => {
      setReplaceReleaseProgress(null);
      queryClient.invalidateQueries({ queryKey: ['platform-desktop-releases'] });
      showToast.success('File replaced successfully');
    },
    onError: (err: any) => {
      setReplaceReleaseProgress(null);
      showToast.error(err?.message || 'Failed to replace file');
    },
  });

  const deleteReleaseMutation = useMutation({
    mutationFn: (id: string) => platformApi.desktopReleases.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-desktop-releases'] });
      showToast.success('Release deleted');
    },
    onError: (err: any) => {
      showToast.error(err?.message || 'Failed to delete release');
    },
  });

  // ── Prerequisite Mutations ──

  const createPrereqMutation = useMutation({
    retry: false, // Large file uploads: avoid retrying on 413/network so progress does not reset
    mutationFn: async (data: { name: string; version?: string; description?: string; file: File; install_order?: number; is_required?: boolean; is_active?: boolean }) => {
      const formData = new FormData();
      formData.append('name', data.name);
      if (data.version) formData.append('version', data.version);
      if (data.description) formData.append('description', data.description);
      formData.append('file', data.file);
      if (data.install_order !== undefined) formData.append('install_order', String(data.install_order));
      if (data.is_required !== undefined) formData.append('is_required', data.is_required ? '1' : '0');
      if (data.is_active !== undefined) formData.append('is_active', data.is_active ? '1' : '0');
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
      return uploadWithProgress(
        `${baseUrl}/platform/desktop-prerequisites`,
        formData,
        (p) => setPrereqUploadProgress(p),
      );
    },
    onSuccess: () => {
      setPrereqUploadProgress(null);
      queryClient.invalidateQueries({ queryKey: ['platform-desktop-prerequisites'] });
      showToast.success('Prerequisite created');
      closePrereqDialog();
    },
    onError: (err: any) => {
      setPrereqUploadProgress(null);
      showToast.error(err?.message || 'Failed to create prerequisite');
    },
  });

  const updatePrereqMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      platformApi.desktopPrerequisites.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-desktop-prerequisites'] });
      showToast.success('Prerequisite updated');
      closePrereqDialog();
    },
    onError: (err: any) => {
      showToast.error(err?.message || 'Failed to update prerequisite');
    },
  });

  const replacePrereqFileMutation = useMutation({
    retry: false, // Large file uploads: avoid retrying on 413/network so progress does not reset
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
      return uploadWithProgress(
        `${baseUrl}/platform/desktop-prerequisites/${id}/replace-file`,
        formData,
        (p) => setReplacePrereqProgress({ id, progress: p }),
      );
    },
    onSuccess: () => {
      setReplacePrereqProgress(null);
      queryClient.invalidateQueries({ queryKey: ['platform-desktop-prerequisites'] });
      showToast.success('File replaced');
    },
    onError: (err: any) => {
      setReplacePrereqProgress(null);
      showToast.error(err?.message || 'Failed to replace file');
    },
  });

  const deletePrereqMutation = useMutation({
    mutationFn: (id: string) => platformApi.desktopPrerequisites.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-desktop-prerequisites'] });
      showToast.success('Prerequisite deleted');
    },
    onError: (err: any) => {
      showToast.error(err?.message || 'Failed to delete prerequisite');
    },
  });

  // ── Dialog helpers ──

  function openNewRelease() {
    setEditingRelease(null);
    setReleaseForm({ version: '', display_name: '', release_notes: '', status: 'draft' });
    setReleaseFile(null);
    setReleaseDialogOpen(true);
  }

  function openEditRelease(r: DesktopRelease) {
    setEditingRelease(r);
    setReleaseForm({
      version: r.version,
      display_name: r.display_name,
      release_notes: r.release_notes || '',
      status: r.status === 'archived' ? 'draft' : (r.status as 'draft' | 'published'),
    });
    setReleaseFile(null);
    setReleaseDialogOpen(true);
  }

  function closeReleaseDialog() {
    setReleaseDialogOpen(false);
    setEditingRelease(null);
    setReleaseFile(null);
  }

  function openNewPrereq() {
    setEditingPrereq(null);
    setPrereqForm({ name: '', version: '', description: '', install_order: 0, is_required: true, is_active: true });
    setPrereqFile(null);
    setPrereqDialogOpen(true);
  }

  function openEditPrereq(p: DesktopPrerequisite) {
    setEditingPrereq(p);
    setPrereqForm({
      name: p.name,
      version: p.version || '',
      description: p.description || '',
      install_order: p.install_order,
      is_required: p.is_required,
      is_active: p.is_active,
    });
    setPrereqFile(null);
    setPrereqDialogOpen(true);
  }

  function closePrereqDialog() {
    setPrereqDialogOpen(false);
    setEditingPrereq(null);
    setPrereqFile(null);
  }

  // ── Submit handlers ──

  function handleReleaseSubmit() {
    if (editingRelease) {
      updateReleaseMutation.mutate({
        id: editingRelease.id,
        data: {
          version: releaseForm.version,
          display_name: releaseForm.display_name,
          release_notes: releaseForm.release_notes || undefined,
          status: releaseForm.status,
        },
      });
    } else {
      if (!releaseFile) {
        showToast.error('Please select a file');
        return;
      }
      createReleaseMutation.mutate({
        version: releaseForm.version,
        display_name: releaseForm.display_name,
        release_notes: releaseForm.release_notes || undefined,
        file: releaseFile,
        status: releaseForm.status,
      });
    }
  }

  function handlePrereqSubmit() {
    if (editingPrereq) {
      updatePrereqMutation.mutate({
        id: editingPrereq.id,
        data: {
          name: prereqForm.name,
          version: prereqForm.version || undefined,
          description: prereqForm.description || undefined,
          install_order: prereqForm.install_order,
          is_required: prereqForm.is_required,
          is_active: prereqForm.is_active,
        },
      });
    } else {
      if (!prereqFile) {
        showToast.error('Please select a file');
        return;
      }
      createPrereqMutation.mutate({
        name: prereqForm.name,
        version: prereqForm.version || undefined,
        description: prereqForm.description || undefined,
        file: prereqFile,
        install_order: prereqForm.install_order,
        is_required: prereqForm.is_required,
        is_active: prereqForm.is_active,
      });
    }
  }

  const updaterConfigUrl = desktopConfig?.updater_config_url ?? `${window.location.origin}/api/desktop/updates.txt`;
  const friendlyDownloadUrl = desktopConfig?.friendly_download_url ?? null;

  const isMutating =
    createReleaseMutation.isPending ||
    updateReleaseMutation.isPending ||
    createPrereqMutation.isPending ||
    updatePrereqMutation.isPending;

  // ── Render ──

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6" />
            Nazim Desktop Releases
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage desktop application releases, prerequisites, and updates
          </p>
        </div>
      </div>

      {/* Updater & download URLs */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Updater config (updates.txt) &amp; download URL
          </CardTitle>
          <CardDescription>
            The <code className="text-xs bg-white/80 px-1 rounded">updates.txt</code> file is generated automatically when someone requests it; it always reflects the current latest published release. To change the download path or filename (e.g. <code className="text-xs bg-white/80 px-1 rounded">/downloads/Nazim.exe</code>), set <code className="text-xs bg-white/80 px-1 rounded">DESKTOP_DOWNLOAD_PATH</code> and <code className="text-xs bg-white/80 px-1 rounded">DESKTOP_DOWNLOAD_FILENAME</code> in the backend <code className="text-xs bg-white/80 px-1 rounded">.env</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-blue-800">Updater config URL (updates.txt)</span>
            <div className="flex items-center gap-2 flex-wrap">
              <code className="bg-white text-xs px-2 py-1.5 rounded border text-blue-900 break-all flex-1 min-w-0">
                {updaterConfigUrl}
              </code>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => {
                  navigator.clipboard.writeText(updaterConfigUrl);
                  showToast.success('Updater config URL copied');
                }}
              >
                <Copy className="h-3.5 w-3.5 mr-1" />
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => window.open(updaterConfigUrl, '_blank')}
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                View
              </Button>
            </div>
          </div>
          {friendlyDownloadUrl && (
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-blue-800">Friendly download URL (used in updates.txt; points to latest release)</span>
              <div className="flex items-center gap-2 flex-wrap">
                <code className="bg-white text-xs px-2 py-1.5 rounded border text-blue-900 break-all flex-1 min-w-0">
                  {friendlyDownloadUrl}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => {
                    navigator.clipboard.writeText(friendlyDownloadUrl);
                    showToast.success('Download URL copied');
                  }}
                >
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  Copy
                </Button>
              </div>
            </div>
          )}
          <div className="space-y-1.5 pt-2 border-t border-blue-200/60">
            <span className="text-xs font-medium text-blue-800">Upload custom updates.txt (override)</span>
            <p className="text-xs text-blue-600">
              Upload a .txt file to serve it at the updater config URL instead of the auto-generated content. Use this if you need exact control (e.g. custom [Update] section with MD5, Flags, RegistryKey). Remove the override to use auto-generated content again.
            </p>
            {hasUpdatesOverride ? (
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="bg-green-100 text-green-800">Custom file active</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteUpdatesFileMutation.mutate()}
                  disabled={deleteUpdatesFileMutation.isPending}
                >
                  {deleteUpdatesFileMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                  Remove override
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="file"
                  ref={updatesFileInputRef}
                  accept=".txt"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadUpdatesFileMutation.mutate(f);
                    e.target.value = '';
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updatesFileInputRef.current?.click()}
                  disabled={uploadUpdatesFileMutation.isPending}
                >
                  {uploadUpdatesFileMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
                  Upload updates.txt
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="releases" className="flex items-center gap-1.5">
            <Package className="h-4 w-4" />
            Releases
            {releases.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">{releases.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="prerequisites" className="flex items-center gap-1.5">
            <HardDrive className="h-4 w-4" />
            Prerequisites
            {prerequisites.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">{prerequisites.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ═══════ Releases Tab ═══════ */}
        <TabsContent value="releases" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Upload and manage Nazim Desktop installer packages. Publishing a release marks it as the latest version and updates the updater config.
            </p>
            <Button onClick={openNewRelease} className="shrink-0">
              <Plus className="h-4 w-4 mr-1" />
              Upload Release
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {releasesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : releases.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>No releases uploaded yet</p>
                  <Button variant="outline" className="mt-3" onClick={openNewRelease}>
                    <Upload className="h-4 w-4 mr-1" />
                    Upload First Release
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Version</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>File</TableHead>
                      <TableHead className="text-right">Downloads</TableHead>
                      <TableHead>Published</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {releases.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono font-medium">{r.version}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{r.display_name}</TableCell>
                        <TableCell>{statusBadge(r.status, r.is_latest)}</TableCell>
                        <TableCell>
                          <div className="text-xs text-muted-foreground">
                            {r.file_name && <div className="truncate max-w-[150px]">{r.file_name}</div>}
                            <div>{formatBytes(r.file_size)}</div>
                          </div>
                          {replaceReleaseProgress?.id === r.id && (
                            <div className="mt-1">
                              <div className="flex items-center gap-1.5 text-[10px]">
                                <span className="text-muted-foreground">Replacing...</span>
                                <span className="font-mono font-medium text-primary">{replaceReleaseProgress.progress.percent}%</span>
                              </div>
                              <Progress value={replaceReleaseProgress.progress.percent} className="h-1.5 mt-0.5" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono">{r.download_count}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDate(r.published_at)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 flex-wrap">
                            {r.download_url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Copy download link"
                                onClick={() => {
                                  navigator.clipboard.writeText(r.download_url!);
                                  showToast.success('Download link copied');
                                }}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            )}
                            {r.status === 'draft' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Publish"
                                onClick={() => updateReleaseMutation.mutate({ id: r.id, data: { status: 'published' } })}
                              >
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                            {r.status === 'published' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Archive"
                                onClick={() => updateReleaseMutation.mutate({ id: r.id, data: { status: 'archived' } })}
                              >
                                <Archive className="h-4 w-4 text-orange-500" />
                              </Button>
                            )}
                            <input
                              type="file"
                              ref={replaceFileRef}
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) replaceReleaseFileMutation.mutate({ id: r.id, file: f });
                                e.target.value = '';
                              }}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Replace File"
                              onClick={() => replaceFileRef.current?.click()}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" title="Edit" onClick={() => openEditRelease(r)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Delete"
                              onClick={() => {
                                if (confirm('Delete this release?')) deleteReleaseMutation.mutate(r.id);
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════ Prerequisites Tab ═══════ */}
        <TabsContent value="prerequisites" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Manage prerequisite software packages that users need to install alongside Nazim Desktop.
            </p>
            <Button onClick={openNewPrereq} className="shrink-0">
              <Plus className="h-4 w-4 mr-1" />
              Add Prerequisite
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {prereqsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : prerequisites.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <HardDrive className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>No prerequisites added yet</p>
                  <Button variant="outline" className="mt-3" onClick={openNewPrereq}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add First Prerequisite
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Order</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>File</TableHead>
                      <TableHead>Required</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead className="text-right">Downloads</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prerequisites.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono">{p.install_order}</TableCell>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-muted-foreground">{p.version || '—'}</TableCell>
                        <TableCell>
                          <div className="text-xs text-muted-foreground">
                            {p.file_name && <div className="truncate max-w-[150px]">{p.file_name}</div>}
                            <div>{formatBytes(p.file_size)}</div>
                          </div>
                          {replacePrereqProgress?.id === p.id && (
                            <div className="mt-1">
                              <div className="flex items-center gap-1.5 text-[10px]">
                                <span className="text-muted-foreground">Replacing...</span>
                                <span className="font-mono font-medium text-primary">{replacePrereqProgress.progress.percent}%</span>
                              </div>
                              <Progress value={replacePrereqProgress.progress.percent} className="h-1.5 mt-0.5" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {p.is_required
                            ? <CheckCircle className="h-4 w-4 text-green-600" />
                            : <XCircle className="h-4 w-4 text-muted-foreground" />}
                        </TableCell>
                        <TableCell>
                          <Badge variant={p.is_active ? 'default' : 'secondary'}>
                            {p.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">{p.download_count}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              title={p.is_active ? 'Deactivate' : 'Activate'}
                              onClick={() => updatePrereqMutation.mutate({ id: p.id, data: { is_active: !p.is_active } })}
                            >
                              {p.is_active
                                ? <XCircle className="h-4 w-4 text-orange-500" />
                                : <CheckCircle className="h-4 w-4 text-green-600" />}
                            </Button>
                            <input
                              type="file"
                              ref={replacePrereqFileRef}
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) replacePrereqFileMutation.mutate({ id: p.id, file: f });
                                e.target.value = '';
                              }}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Replace File"
                              onClick={() => replacePrereqFileRef.current?.click()}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" title="Edit" onClick={() => openEditPrereq(p)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Delete"
                              onClick={() => {
                                if (confirm('Delete this prerequisite?')) deletePrereqMutation.mutate(p.id);
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
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ═══════ Release Dialog ═══════ */}
      <Dialog open={releaseDialogOpen} onOpenChange={setReleaseDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRelease ? 'Edit Release' : 'Upload New Release'}</DialogTitle>
            <DialogDescription>
              {editingRelease
                ? 'Update release metadata. Use the Replace File button in the table to swap the installer file.'
                : 'Upload a new Nazim Desktop installer package.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Version *</Label>
                <Input
                  placeholder="e.g. 2.1.0"
                  value={releaseForm.version}
                  onChange={(e) => setReleaseForm({ ...releaseForm, version: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={releaseForm.status}
                  onValueChange={(v) => setReleaseForm({ ...releaseForm, status: v as 'draft' | 'published' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published (Latest)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Display Name *</Label>
              <Input
                placeholder="e.g. Nazim Desktop v2.1.0"
                value={releaseForm.display_name}
                onChange={(e) => setReleaseForm({ ...releaseForm, display_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Release Notes</Label>
              <Textarea
                placeholder="What's new in this release..."
                rows={4}
                value={releaseForm.release_notes}
                onChange={(e) => setReleaseForm({ ...releaseForm, release_notes: e.target.value })}
              />
            </div>

            {!editingRelease && (
              <div className="space-y-2">
                <Label>Installer File *</Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  <input
                    type="file"
                    ref={releaseFileRef}
                    className="hidden"
                    accept=".exe,.msi,.msix"
                    onChange={(e) => setReleaseFile(e.target.files?.[0] || null)}
                  />
                  {releaseFile ? (
                    <div className="flex items-center gap-2 justify-center">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <span className="text-sm font-medium">{releaseFile.name}</span>
                      <span className="text-xs text-muted-foreground">({formatBytes(releaseFile.size)})</span>
                    </div>
                  ) : (
                    <Button variant="outline" onClick={() => releaseFileRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-1" />
                      Select File
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {releaseUploadProgress && (
              <UploadProgressBar progress={releaseUploadProgress} fileName={releaseFile?.name} />
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeReleaseDialog} disabled={!!releaseUploadProgress}>Cancel</Button>
            <Button
              onClick={handleReleaseSubmit}
              disabled={isMutating || !!releaseUploadProgress || !releaseForm.version || !releaseForm.display_name || (!editingRelease && !releaseFile)}
            >
              {(isMutating || !!releaseUploadProgress) && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingRelease ? 'Save Changes' : 'Upload Release'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════ Prerequisite Dialog ═══════ */}
      <Dialog open={prereqDialogOpen} onOpenChange={setPrereqDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPrereq ? 'Edit Prerequisite' : 'Add Prerequisite'}</DialogTitle>
            <DialogDescription>
              {editingPrereq
                ? 'Update prerequisite info. Use the Replace File button in the table to swap the file.'
                : 'Upload a prerequisite package file.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  placeholder="e.g. .NET 8 Runtime"
                  value={prereqForm.name}
                  onChange={(e) => setPrereqForm({ ...prereqForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Version</Label>
                <Input
                  placeholder="e.g. 8.0.4"
                  value={prereqForm.version}
                  onChange={(e) => setPrereqForm({ ...prereqForm, version: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Brief description of this prerequisite..."
                rows={2}
                value={prereqForm.description}
                onChange={(e) => setPrereqForm({ ...prereqForm, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Install Order</Label>
                <Input
                  type="number"
                  min={0}
                  value={prereqForm.install_order}
                  onChange={(e) => setPrereqForm({ ...prereqForm, install_order: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2 flex flex-col">
                <Label>Required</Label>
                <div className="flex items-center h-9">
                  <Switch
                    checked={prereqForm.is_required}
                    onCheckedChange={(v) => setPrereqForm({ ...prereqForm, is_required: v })}
                  />
                </div>
              </div>
              <div className="space-y-2 flex flex-col">
                <Label>Active</Label>
                <div className="flex items-center h-9">
                  <Switch
                    checked={prereqForm.is_active}
                    onCheckedChange={(v) => setPrereqForm({ ...prereqForm, is_active: v })}
                  />
                </div>
              </div>
            </div>

            {!editingPrereq && (
              <div className="space-y-2">
                <Label>Prerequisite File *</Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  <input
                    type="file"
                    ref={prereqFileRef}
                    className="hidden"
                    onChange={(e) => setPrereqFile(e.target.files?.[0] || null)}
                  />
                  {prereqFile ? (
                    <div className="flex items-center gap-2 justify-center">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <span className="text-sm font-medium">{prereqFile.name}</span>
                      <span className="text-xs text-muted-foreground">({formatBytes(prereqFile.size)})</span>
                    </div>
                  ) : (
                    <Button variant="outline" onClick={() => prereqFileRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-1" />
                      Select File
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {prereqUploadProgress && (
              <UploadProgressBar progress={prereqUploadProgress} fileName={prereqFile?.name} />
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closePrereqDialog} disabled={!!prereqUploadProgress}>Cancel</Button>
            <Button
              onClick={handlePrereqSubmit}
              disabled={isMutating || !!prereqUploadProgress || !prereqForm.name || (!editingPrereq && !prereqFile)}
            >
              {(isMutating || !!prereqUploadProgress) && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingPrereq ? 'Save Changes' : 'Add Prerequisite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
