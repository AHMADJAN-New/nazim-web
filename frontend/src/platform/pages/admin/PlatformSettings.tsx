import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserPlus,
  Users,
  Shield,
  Settings,
  Mail,
  Key,
  RefreshCw,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MessageSquare,
  Download,
  Database,
  HardDrive,
  Upload,
  RotateCcw,
  History,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, Link } from 'react-router-dom';
import * as z from 'zod';

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
import { LoadingSpinner } from '@/components/ui/loading';
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
import { Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useLanguage } from '@/hooks/useLanguage';
import { showToast } from '@/lib/toast';
import { formatDate, formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ContactMessagesManagement } from '@/platform/components/ContactMessagesManagement';
import { TestimonialsManagement } from '@/platform/components/TestimonialsManagement';
import { usePlatformAdminPermissions } from '@/platform/hooks/usePlatformAdminPermissions';
import { platformApi } from '@/platform/lib/platformApi';

// Validation schema for platform user (password optional for updates)
const platformUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().optional().refine((val) => {
    // Password is required for new users, optional for updates
    // This will be validated in the form submission
    return true;
  }),
  full_name: z.string().min(1, 'Full name is required').max(255, 'Full name must be 255 characters or less'),
  phone: z.string().optional(),
});

type PlatformUserFormData = z.infer<typeof platformUserSchema>;

interface PlatformUser {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  is_active: boolean;
  has_platform_admin: boolean;
  created_at: string;
  updated_at: string;
}

export default function PlatformSettings() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { data: permissions, isLoading: permissionsLoading, error: permissionsError } = usePlatformAdminPermissions();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [deletingBackupFilename, setDeletingBackupFilename] = useState<string | null>(null);
  const [restoringBackupFilename, setRestoringBackupFilename] = useState<string | null>(null);
  const [restoreType, setRestoreType] = useState<'database' | 'all'>('all');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadRestoreType, setUploadRestoreType] = useState<'database' | 'all'>('all');
  const [maintenanceMessage, setMaintenanceMessage] = useState<string>('');
  const [scheduledEndAt, setScheduledEndAt] = useState<string>('');
  const [affectedServices, setAffectedServices] = useState<string>('');
  const [showMaintenanceDialog, setShowMaintenanceDialog] = useState(false);

  const isEditing = !!editingUserId;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<PlatformUserFormData>({
    resolver: zodResolver(platformUserSchema),
    defaultValues: {
      email: '',
      password: '',
      full_name: '',
      phone: '',
    },
  });

  // Reset form when dialog closes
  useEffect(() => {
    if (!isCreateDialogOpen) {
      setEditingUserId(null);
      reset({
        email: '',
        password: '',
        full_name: '',
        phone: '',
      });
    }
  }, [isCreateDialogOpen, reset]);

  // Fetch platform users (users with subscription.admin permission)
  // FIX: Only enable query after we've confirmed permissions are loaded and user has access
  const hasPlatformAdminPermission = Array.isArray(permissions) && permissions.includes('subscription.admin');
  const { data: platformUsers, isLoading: isUsersLoading, error: usersError } = useQuery<PlatformUser[]>({
    queryKey: ['platform-users'],
    queryFn: async () => {
      // Use platform admin API endpoint to get users with subscription.admin permission
      try {
        const users = await platformApi.users.list();
        
        if (!Array.isArray(users)) {
          return [];
        }
        
        // Map to PlatformUser format
        return users.map((user: any) => ({
          id: user.id,
          email: user.email,
          full_name: user.full_name || 'N/A',
          phone: user.phone,
          is_active: user.is_active !== false,
          has_platform_admin: true,
          created_at: user.created_at,
          updated_at: user.updated_at,
        } as PlatformUser));
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Error fetching platform users:', error);
        }
        throw error;
      }
    },
    enabled: hasPlatformAdminPermission && !permissionsLoading,
    staleTime: 5 * 60 * 1000,
  });

  // Get global subscription.admin permission
  // FIX: Only enable query after we've confirmed permissions are loaded and user has access
  const { data: globalPermissions } = useQuery<{ id: number; name: string; organization_id: string | null } | undefined>({
    queryKey: ['platform-global-permissions'],
    queryFn: async () => {
      const allPermissions = await platformApi.permissions.getAll();
      // Find subscription.admin permission with organization_id = null
      return allPermissions.find((p: any) => p.name === 'subscription.admin' && p.organization_id === null) as { id: number; name: string; organization_id: string | null } | undefined;
    },
    enabled: hasPlatformAdminPermission && !permissionsLoading,
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  // Create/Update platform user mutation
  const createPlatformUser = useMutation({
    mutationFn: async (data: PlatformUserFormData) => {
      if (editingUserId) {
        // Update existing user
        const updateData: any = {
          email: data.email,
          full_name: data.full_name,
          phone: data.phone || undefined,
        };
        
        // Update user
        const user = await platformApi.users.update(editingUserId, updateData);
        
        // Only update password if provided
        if (data.password && data.password.trim().length > 0) {
          await platformApi.users.resetPassword(editingUserId, data.password);
        }
        
        return user;
      } else {
        // Create new user (permission is assigned automatically by backend)
        const user = await platformApi.users.create({
          email: data.email,
          password: data.password,
          full_name: data.full_name,
          phone: data.phone || undefined,
        });

        return user;
      }
    },
    onSuccess: () => {
      showToast.success(editingUserId ? 'Platform user updated successfully' : 'Platform user created successfully');
      setIsCreateDialogOpen(false);
      setEditingUserId(null);
      reset();
      queryClient.invalidateQueries({ queryKey: ['platform-users'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || (editingUserId ? 'Failed to update platform user' : 'Failed to create platform user'));
    },
  });

  // Delete platform user mutation
  const deletePlatformUser = useMutation({
    mutationFn: async (userId: string) => {
      // Backend handles permission removal automatically
      await platformApi.users.delete(userId);
    },
    onSuccess: () => {
      showToast.success('Platform user deleted successfully');
      setDeletingUserId(null);
      queryClient.invalidateQueries({ queryKey: ['platform-users'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to delete platform user');
    },
  });

  // Backup queries and mutations
  const { data: backups, isLoading: isBackupsLoading, error: backupsError } = useQuery({
    queryKey: ['platform-backups'],
    queryFn: async () => {
      try {
        return await platformApi.backups.list();
      } catch (error) {
        console.error('Error fetching backups:', error);
        return [];
      }
    },
    enabled: hasPlatformAdminPermission && !permissionsLoading,
    staleTime: 30 * 1000, // 30 seconds
  });

  const createBackup = useMutation({
    mutationFn: async () => {
      return await platformApi.backups.create();
    },
    onSuccess: () => {
      showToast.success('Backup created successfully');
      queryClient.invalidateQueries({ queryKey: ['platform-backups'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to create backup');
    },
  });

  const deleteBackup = useMutation({
    mutationFn: async (filename: string) => {
      return await platformApi.backups.delete(filename);
    },
    onSuccess: () => {
      showToast.success('Backup deleted successfully');
      setDeletingBackupFilename(null);
      queryClient.invalidateQueries({ queryKey: ['platform-backups'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to delete backup');
    },
  });

  const handleDownloadBackup = async (filename: string) => {
    try {
      await platformApi.backups.download(filename);
      showToast.success('Backup download started');
    } catch (error) {
      showToast.error('Failed to download backup');
    }
  };

  const restoreBackup = useMutation({
    mutationFn: async ({ filename, restoreType }: { filename: string; restoreType: 'database' | 'all' }) => {
      return await platformApi.backups.restore(filename, restoreType);
    },
    onSuccess: () => {
      showToast.success('Backup restored successfully. Please refresh the page.');
      setRestoringBackupFilename(null);
      setRestoreType('all');
      queryClient.invalidateQueries({ queryKey: ['platform-backups'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to restore backup');
      setRestoringBackupFilename(null);
      setRestoreType('all');
    },
  });

  const uploadAndRestore = useMutation({
    mutationFn: async ({ file, restoreType }: { file: File; restoreType: 'database' | 'all' }) => {
      return await platformApi.backups.uploadAndRestore(file, restoreType);
    },
    onSuccess: () => {
      showToast.success('Backup uploaded and restored successfully. Please refresh the page.');
      setUploadedFile(null);
      setUploadRestoreType('all');
      queryClient.invalidateQueries({ queryKey: ['platform-backups'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to upload and restore backup');
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/zip' && !file.name.endsWith('.zip')) {
        showToast.error('Please select a ZIP file');
        return;
      }
      setUploadedFile(file);
    }
  };

  // Maintenance mode queries and mutations
  const { data: maintenanceStatus, isLoading: isMaintenanceLoading } = useQuery({
    queryKey: ['maintenance-status'],
    queryFn: async () => {
      try {
        const response = await platformApi.maintenance.getStatus();
        // API returns { success: boolean, data: { ... } }
        // response.data is the inner data object with is_maintenance_mode
        return response.data;
      } catch (error) {
        console.error('Error fetching maintenance status:', error);
        return { is_maintenance_mode: false, message: null, retry_after: null, refresh_after: null };
      }
    },
    enabled: hasPlatformAdminPermission && !permissionsLoading,
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const enableMaintenance = useMutation({
    mutationFn: async (data: { message?: string; scheduled_end_at?: string; affected_services?: string[] }) => {
      return await platformApi.maintenance.enable(data);
    },
    onSuccess: () => {
      showToast.success('Maintenance mode enabled successfully');
      setShowMaintenanceDialog(false);
      setMaintenanceMessage('');
      setScheduledEndAt('');
      setAffectedServices('');
      queryClient.invalidateQueries({ queryKey: ['maintenance-status'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to enable maintenance mode');
    },
  });


  const disableMaintenance = useMutation({
    mutationFn: async () => {
      return await platformApi.maintenance.disable();
    },
    onSuccess: () => {
      showToast.success('Maintenance mode disabled successfully');
      queryClient.invalidateQueries({ queryKey: ['maintenance-status'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to disable maintenance mode');
    },
  });


  // FIX: Add error handling for permissions query
  if (permissionsError) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-8 w-8 mx-auto text-destructive" />
          <div>
            <p className="text-destructive font-medium">Error loading permissions</p>
            <p className="text-sm text-muted-foreground mt-1">
              {permissionsError instanceof Error ? permissionsError.message : 'Unknown error occurred'}
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Wait for permissions to load
  // CRITICAL: Check if permissions are still loading (undefined means not loaded yet)
  if (permissionsLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-2 text-muted-foreground">Loading permissions...</p>
      </div>
    );
  }

  // CRITICAL: If permissions is undefined after loading completes, handle gracefully
  // This shouldn't happen if we're in ProtectedPlatformLayout, but handle it anyway
  if (permissions === undefined || !Array.isArray(permissions)) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-8 w-8 mx-auto text-yellow-500" />
          <div>
            <p className="text-muted-foreground font-medium">Unable to verify permissions</p>
            <p className="text-sm text-muted-foreground mt-1">
              Please refresh the page or contact support if this issue persists
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  // Access control - check for platform admin permission (GLOBAL, not organization-scoped)
  // permissions is now guaranteed to be an array (either empty [] or with permissions)
  // Use the same variable we defined earlier for consistency
  if (!hasPlatformAdminPermission) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center space-y-4">
          <Shield className="h-8 w-8 mx-auto text-muted-foreground" />
          <div>
            <p className="text-muted-foreground font-medium">Access Denied</p>
            <p className="text-sm text-muted-foreground mt-1">
              You need subscription.admin permission to access this page
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/platform/dashboard'}
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const onSubmit = (data: PlatformUserFormData) => {
    // Validate password for new users
    if (!isEditing && (!data.password || data.password.length < 8)) {
      showToast.error('Password is required and must be at least 8 characters');
      return;
    }
    
    // For updates, only include password if provided
    if (isEditing && data.password && data.password.trim().length > 0 && data.password.length < 8) {
      showToast.error('Password must be at least 8 characters');
      return;
    }
    
    createPlatformUser.mutate(data);
  };

  const handleDelete = () => {
    if (deletingUserId) {
      deletePlatformUser.mutate(deletingUserId);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Platform Settings</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Manage platform users and SaaS configuration
          </p>
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 overflow-x-auto">
          <TabsTrigger value="users" className="flex items-center gap-1 sm:gap-2">
            <Users className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Platform Users</span>
            <span className="sm:hidden">Users</span>
          </TabsTrigger>
          <TabsTrigger value="testimonials" className="flex items-center gap-1 sm:gap-2">
            <MessageSquare className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Testimonials</span>
            <span className="sm:hidden">Test</span>
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-1 sm:gap-2">
            <Mail className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Contact Messages</span>
            <span className="sm:hidden">Msgs</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-1 sm:gap-2">
            <Settings className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">System Settings</span>
            <span className="sm:hidden">System</span>
          </TabsTrigger>
          <TabsTrigger value="restore" className="flex items-center gap-1 sm:gap-2">
            <RotateCcw className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Restore</span>
            <span className="sm:hidden">Rest</span>
          </TabsTrigger>
        </TabsList>

        {/* Platform Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Platform Administrators
                  </CardTitle>
                  <CardDescription>
                    Users with platform-wide administration access (subscription.admin permission)
                  </CardDescription>
                </div>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create Platform User
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isUsersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : usersError ? (
                <div className="py-8 text-center">
                  <p className="text-destructive">Error loading platform users</p>
                  {import.meta.env.DEV && (
                    <p className="text-xs mt-2 text-muted-foreground">
                      {usersError instanceof Error ? usersError.message : String(usersError)}
                    </p>
                  )}
                </div>
              ) : !platformUsers || platformUsers.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No platform users found</p>
                  <p className="text-sm mt-1">Create your first platform administrator</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                    <Table className="min-w-[700px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead className="hidden md:table-cell">Email</TableHead>
                          <TableHead className="hidden lg:table-cell">Phone</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="hidden lg:table-cell">Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                  <TableBody>
                    {platformUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          <div>
                            {user.full_name}
                            <div className="md:hidden mt-1 text-xs text-muted-foreground">
                              {user.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{user.email}</TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                          {user.phone || '-'}
                        </TableCell>
                        <TableCell>
                          {user.is_active ? (
                            <Badge variant="default" className="bg-green-500 text-xs">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-xs">
                              <XCircle className="mr-1 h-3 w-3" />
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                          {formatDate(new Date(user.created_at))}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingUserId(user.id);
                                setValue('email', user.email);
                                setValue('full_name', user.full_name);
                                setValue('phone', user.phone || '');
                                setValue('password', ''); // Clear password for edit
                                setIsCreateDialogOpen(true);
                              }}
                              aria-label="Edit user"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingUserId(user.id)}
                              aria-label="Delete user"
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
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Testimonials Tab */}
        <TabsContent value="testimonials" className="space-y-6">
          <TestimonialsManagement />
        </TabsContent>

        {/* Contact Messages Tab */}
        <TabsContent value="messages" className="space-y-6">
          <ContactMessagesManagement />
        </TabsContent>

        {/* System Settings Tab */}
        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                System Configuration
              </CardTitle>
              <CardDescription>
                Configure platform-wide settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border p-4 bg-muted/50">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">System Settings</h4>
                    <p className="text-sm text-muted-foreground">
                      System configuration options will be available here. This includes email settings, 
                      notification preferences, backup configurations, and other platform-wide settings.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label className="font-medium">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Configure email notification settings for platform events
                    </p>
                  </div>
                  <Badge variant="outline">Coming Soon</Badge>
                </div>

                {/* Backup & Restore Section */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Database className="h-5 w-5" />
                          Backup & Restore
                        </CardTitle>
                        <CardDescription>
                          Create and manage database and storage backups
                        </CardDescription>
                      </div>
                      <Button
                        onClick={() => createBackup.mutate()}
                        disabled={createBackup.isPending}
                      >
                        {createBackup.isPending ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <HardDrive className="mr-2 h-4 w-4" />
                            Create Backup
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isBackupsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <LoadingSpinner />
                      </div>
                    ) : backupsError ? (
                      <div className="py-8 text-center">
                        <p className="text-destructive">Error loading backups</p>
                      </div>
                    ) : !backups || backups.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground">
                        <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No backups found</p>
                        <p className="text-sm mt-1">Create your first backup to get started</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Filename</TableHead>
                            <TableHead>Size</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {backups.map((backup) => (
                            <TableRow key={backup.filename}>
                              <TableCell className="font-medium">
                                {backup.filename}
                              </TableCell>
                              <TableCell>{backup.size}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {formatDateTime(new Date(backup.created_at))}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center gap-2 justify-end">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDownloadBackup(backup.filename)}
                                    title="Download backup"
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setDeletingBackupFilename(backup.filename)}
                                    title="Delete backup"
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

                {/* System Maintenance */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      System Maintenance Mode
                    </CardTitle>
                    <CardDescription>
                      Enable or disable maintenance mode for the entire platform
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isMaintenanceLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <LoadingSpinner />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3 flex-1">
                            <div className={cn(
                              "h-3 w-3 rounded-full shrink-0",
                              maintenanceStatus?.is_maintenance_mode ? "bg-yellow-500 animate-pulse" : "bg-green-500"
                            )} />
                            <div className="flex-1">
                              <p className="font-medium">
                                {maintenanceStatus?.is_maintenance_mode ? 'Maintenance Mode Active' : 'System Online'}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {maintenanceStatus?.is_maintenance_mode
                                  ? maintenanceStatus.message || 'System is currently under maintenance'
                                  : 'All systems operational'}
                              </p>
                              {maintenanceStatus?.is_maintenance_mode && maintenanceStatus.scheduled_end_at && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Scheduled to end: {formatDateTime(new Date(maintenanceStatus.scheduled_end_at))}
                                </p>
                              )}
                              {maintenanceStatus?.is_maintenance_mode && maintenanceStatus.affected_services && maintenanceStatus.affected_services.length > 0 && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Affected: {maintenanceStatus.affected_services.join(', ')}
                                </p>
                              )}
                            </div>
                          </div>
                          {/* CRITICAL: Always show disable button when maintenance is active */}
                          {maintenanceStatus?.is_maintenance_mode === true ? (
                            <Button
                              variant="default"
                              onClick={() => disableMaintenance.mutate()}
                              disabled={disableMaintenance.isPending}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {disableMaintenance.isPending ? (
                                <>
                                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                  Disabling...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Disable Maintenance
                                </>
                              )}
                            </Button>
                          ) : (
                            <Button
                              variant="default"
                              onClick={() => setShowMaintenanceDialog(true)}
                              className="bg-yellow-600 hover:bg-yellow-700"
                            >
                              <AlertTriangle className="mr-2 h-4 w-4" />
                              Enable Maintenance
                            </Button>
                          )}
                        </div>

                        {maintenanceStatus?.is_maintenance_mode && (
                          <div className="rounded-lg border p-4 bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900">
                            <div className="flex items-start gap-3">
                              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                              <div className="flex-1">
                                <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                                  Platform in Maintenance Mode
                                </h4>
                                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                  Users will see a maintenance page when trying to access the platform.
                                  Only administrators can access the system during maintenance.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label className="font-medium">API Configuration</Label>
                    <p className="text-sm text-muted-foreground">
                      Manage API keys, rate limits, and access controls
                    </p>
                  </div>
                  <Badge variant="outline">Coming Soon</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Restore Tab */}
        <TabsContent value="restore" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                Restore from Backup
              </CardTitle>
              <CardDescription>
                Restore your database and storage from a previous backup
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border p-4 bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                      Warning: Data Loss Risk
                    </h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Restoring a backup will replace all current data in your database and storage.
                      This action cannot be undone. Please ensure you have a recent backup before proceeding.
                    </p>
                  </div>
                </div>
              </div>

              {/* Restore from Existing Backup */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Restore from Existing Backup</h3>
                {isBackupsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : !backups || backups.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No backups available</p>
                    <p className="text-sm mt-1">Create a backup first in the System Settings tab</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Filename</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {backups.map((backup) => (
                        <TableRow key={backup.filename}>
                          <TableCell className="font-medium">
                            {backup.filename}
                          </TableCell>
                          <TableCell>{backup.size}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDateTime(new Date(backup.created_at))}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => setRestoringBackupFilename(backup.filename)}
                              disabled={restoreBackup.isPending}
                            >
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Restore
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              {/* Upload and Restore */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Upload and Restore Backup</h3>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="upload-restore-type">{t('platform.restoreType.label')}</Label>
                    <Select
                      value={uploadRestoreType}
                      onValueChange={(value: 'database' | 'all') => setUploadRestoreType(value)}
                    >
                      <SelectTrigger id="upload-restore-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('platform.restoreType.databaseAndFiles')}</SelectItem>
                        <SelectItem value="database">{t('platform.restoreType.databaseOnly')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      {uploadRestoreType === 'all'
                        ? t('platform.restoreType.databaseAndFilesDescription')
                        : t('platform.restoreType.databaseOnlyDescription')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Input
                      type="file"
                      accept=".zip"
                      onChange={handleFileUpload}
                      disabled={uploadAndRestore.isPending}
                      className="flex-1"
                    />
                    <Button
                      onClick={() => {
                        if (uploadedFile) {
                          uploadAndRestore.mutate({ file: uploadedFile, restoreType: uploadRestoreType });
                        } else {
                          showToast.error('Please select a backup file first');
                        }
                      }}
                      disabled={!uploadedFile || uploadAndRestore.isPending}
                    >
                      {uploadAndRestore.isPending ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Restoring...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload & Restore
                        </>
                      )}
                    </Button>
                  </div>
                  {uploadedFile && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {uploadedFile.name} ({(uploadedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maintenance History Tab */}
      </Tabs>

      {/* Create/Edit Platform User Dialog */}
      <Dialog 
        open={isCreateDialogOpen} 
        onOpenChange={setIsCreateDialogOpen}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingUserId ? 'Edit Platform User' : 'Create Platform User'}
            </DialogTitle>
            <DialogDescription>
              {editingUserId
                ? 'Update platform administrator details'
                : 'Create a new platform administrator with subscription.admin permission'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="full_name"
                  {...register('full_name')}
                  placeholder="John Doe"
                />
                {errors.full_name && (
                  <p className="text-sm text-destructive">{errors.full_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="admin@example.com"
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  {isEditing ? 'New Password (leave blank to keep current)' : 'Password'} 
                  {!isEditing && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id="password"
                  type="password"
                  {...register('password')}
                  placeholder={isEditing ? 'Leave blank to keep current password' : 'Minimum 8 characters'}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone (Optional)</Label>
                <Input
                  id="phone"
                  {...register('phone')}
                  placeholder="+1234567890"
                />
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone.message}</p>
                )}
              </div>

              {!isEditing && (
                <div className="rounded-lg border p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                  <div className="flex items-start gap-2">
                    <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Platform Administrator Access
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                        This user will automatically receive the subscription.admin permission, 
                        granting them full platform administration access.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setEditingUserId(null);
                  reset({
                    email: '',
                    password: '',
                    full_name: '',
                    phone: '',
                  });
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createPlatformUser.isPending}
              >
                {createPlatformUser.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    {isEditing ? 'Updating...' : 'Creating...'}
                  </>
                ) : isEditing ? (
                  'Update User'
                ) : (
                  'Create Platform User'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingUserId} onOpenChange={(open) => !open && setDeletingUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Platform User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this platform administrator? This will remove their
              subscription.admin permission and delete their user account. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletePlatformUser.isPending}
            >
              {deletePlatformUser.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete User'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Backup Confirmation Dialog */}
      <AlertDialog open={!!deletingBackupFilename} onOpenChange={(open) => !open && setDeletingBackupFilename(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Backup</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this backup file? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingBackupFilename) {
                  deleteBackup.mutate(deletingBackupFilename);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteBackup.isPending}
            >
              {deleteBackup.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Backup'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Backup Confirmation Dialog */}
      <AlertDialog
        open={!!restoringBackupFilename}
        onOpenChange={(open) => {
          if (!open) {
            setRestoringBackupFilename(null);
            setRestoreType('all');
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Restore Backup - Warning
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="restore-type">{t('platform.restoreType.label')}</Label>
                <Select
                  value={restoreType}
                  onValueChange={(value: 'database' | 'all') => setRestoreType(value)}
                >
                  <SelectTrigger id="restore-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('platform.restoreType.databaseAndFiles')}</SelectItem>
                    <SelectItem value="database">{t('platform.restoreType.databaseOnly')}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {restoreType === 'all'
                    ? t('platform.restoreType.databaseAndFilesDescription')
                    : t('platform.restoreType.databaseOnlyDescription')}
                </p>
              </div>
              <p className="font-semibold text-foreground">
                Are you sure you want to restore this backup?
              </p>
              <p className="text-yellow-600 dark:text-yellow-400 font-medium">
                This action is irreversible and cannot be undone!
              </p>
              <p className="text-sm mt-2">
                Backup to restore: <span className="font-mono">{restoringBackupFilename}</span>
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (restoringBackupFilename) {
                  restoreBackup.mutate({ filename: restoringBackupFilename, restoreType });
                }
              }}
              className="bg-yellow-600 text-white hover:bg-yellow-700"
              disabled={restoreBackup.isPending}
            >
              {restoreBackup.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Yes, Restore Backup
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Enable Maintenance Mode Dialog */}
      <Dialog open={showMaintenanceDialog} onOpenChange={setShowMaintenanceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Enable Maintenance Mode
            </DialogTitle>
            <DialogDescription>
              Put the platform in maintenance mode. Users will be unable to access the system.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="maintenance-message">
                Maintenance Message (Optional)
              </Label>
              <Input
                id="maintenance-message"
                value={maintenanceMessage}
                onChange={(e) => setMaintenanceMessage(e.target.value)}
                placeholder="We'll be back soon. Performing scheduled maintenance."
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                This message will be displayed to users trying to access the platform.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduled-end">
                Scheduled End Time (Optional)
              </Label>
              <Input
                id="scheduled-end"
                type="datetime-local"
                value={scheduledEndAt}
                onChange={(e) => setScheduledEndAt(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                When you expect maintenance to be completed. Users will see this estimated time.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="affected-services">
                Affected Services (Optional)
              </Label>
              <Input
                id="affected-services"
                value={affectedServices}
                onChange={(e) => setAffectedServices(e.target.value)}
                placeholder="Student Portal, Finance Module, Library System (comma-separated)"
              />
              <p className="text-xs text-muted-foreground">
                List the services that will be affected, separated by commas.
              </p>
            </div>

            <div className="rounded-lg border p-4 bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                    Warning
                  </h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    All users (except administrators) will be immediately logged out and unable to access the platform until maintenance mode is disabled.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowMaintenanceDialog(false);
                setMaintenanceMessage('');
                setScheduledEndAt('');
                setAffectedServices('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                const data: { message?: string; scheduled_end_at?: string; affected_services?: string[] } = {};
                if (maintenanceMessage) data.message = maintenanceMessage;
                if (scheduledEndAt) data.scheduled_end_at = new Date(scheduledEndAt).toISOString();
                if (affectedServices) data.affected_services = affectedServices.split(',').map(s => s.trim()).filter(Boolean);
                enableMaintenance.mutate(data);
              }}
              disabled={enableMaintenance.isPending}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              {enableMaintenance.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Enabling...
                </>
              ) : (
                <>
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Enable Maintenance Mode
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

