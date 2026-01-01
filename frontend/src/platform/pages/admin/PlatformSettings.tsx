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
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

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
import { usePlatformAdminPermissions } from '@/platform/hooks/usePlatformAdminPermissions';
import { useLanguage } from '@/hooks/useLanguage';
import { showToast } from '@/lib/toast';
import { LoadingSpinner } from '@/components/ui/loading';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDate, formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { platformApi } from '@/platform/lib/platformApi';
import { TestimonialsManagement } from '@/platform/components/TestimonialsManagement';
import { ContactMessagesManagement } from '@/platform/components/ContactMessagesManagement';

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
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Platform Settings</h1>
          <p className="text-muted-foreground">
            Manage platform users and SaaS configuration
          </p>
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">
            <Users className="mr-2 h-4 w-4" />
            Platform Users
          </TabsTrigger>
          <TabsTrigger value="testimonials">
            <MessageSquare className="mr-2 h-4 w-4" />
            Testimonials
          </TabsTrigger>
          <TabsTrigger value="messages">
            <Mail className="mr-2 h-4 w-4" />
            Contact Messages
          </TabsTrigger>
          <TabsTrigger value="system">
            <Settings className="mr-2 h-4 w-4" />
            System Settings
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {platformUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.full_name}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.phone || '-'}
                        </TableCell>
                        <TableCell>
                          {user.is_active ? (
                            <Badge variant="default" className="bg-green-500">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <XCircle className="mr-1 h-3 w-3" />
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
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
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingUserId(user.id)}
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

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label className="font-medium">Backup & Restore</Label>
                    <p className="text-sm text-muted-foreground">
                      Manage automated backups and restore points
                    </p>
                  </div>
                  <Badge variant="outline">Coming Soon</Badge>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label className="font-medium">System Maintenance</Label>
                    <p className="text-sm text-muted-foreground">
                      Schedule maintenance windows and system updates
                    </p>
                  </div>
                  <Badge variant="outline">Coming Soon</Badge>
                </div>

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
    </div>
  );
}

