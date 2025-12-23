import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  UserPlus,
  Edit,
  Trash2,
  Shield,
  Mail,
  Phone,
  User,
  CheckCircle,
  XCircle,
  Key,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Checkbox } from '@/components/ui/checkbox';
import { useEventUsers, useCreateEventUser, useUpdateEventUser, useDeleteEventUser } from '@/hooks/useEventUsers';
import { eventsApi, permissionsApi } from '@/lib/api/client';
import { usePermissions, useUserPermissionsForUser } from '@/hooks/usePermissions';
import { useHasPermission } from '@/hooks/usePermissions';
import { formatDateTime } from '@/lib/utils';
import { showToast } from '@/lib/toast';
import { useLanguage } from '@/hooks/useLanguage';
import type { CreateEventUserRequest, UpdateEventUserRequest, EventUser } from '@/types/events';

export default function EventUsersPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const hasEventUpdatePermission = useHasPermission('events.update');
  const { data: permissions = [] } = usePermissions();

  // If no eventId, show events list to select an event
  useEffect(() => {
    if (!eventId && location.pathname !== '/events') {
      navigate('/events');
    }
  }, [eventId, navigate, location.pathname]);

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventsApi.get(eventId!),
    enabled: !!eventId,
  });

  const { data: eventUsers = [], isLoading: usersLoading } = useEventUsers(eventId!);
  const createMutation = useCreateEventUser();
  const updateMutation = useUpdateEventUser();
  const deleteMutation = useDeleteEventUser();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<EventUser | null>(null);
  const [formData, setFormData] = useState<CreateEventUserRequest>({
    email: '',
    full_name: '',
    phone: '',
    password: '',
    permissions: [],
  });
  const [editFormData, setEditFormData] = useState<UpdateEventUserRequest>({
    full_name: '',
    phone: '',
    password: '',
    is_active: true,
    permissions: [],
  });

  // Filter permissions to show all event-related permissions
  const eventPermissions = permissions.filter(p => 
    p.name.startsWith('events.') || 
    p.name.startsWith('event_checkins.') || 
    p.name.startsWith('event_guests.')
  );

  // Group permissions by resource
  const permissionGroups = eventPermissions.reduce((acc, perm) => {
    const resource = perm.resource || perm.name.split('.')[0];
    if (!acc[resource]) {
      acc[resource] = [];
    }
    acc[resource].push(perm);
    return acc;
  }, {} as Record<string, typeof eventPermissions>);

  const handleCreate = async () => {
    if (!formData.email || !formData.full_name || !formData.password || formData.permissions.length === 0) {
      showToast.error(t('events.users.fillAllFields') || 'Please fill all required fields');
      return;
    }

    try {
      await createMutation.mutateAsync({
        eventId: eventId!,
        data: formData,
      });
      setShowCreateDialog(false);
      setFormData({
        email: '',
        full_name: '',
        phone: '',
        password: '',
        permissions: [],
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleEdit = async () => {
    if (!editFormData.full_name || !editFormData.permissions || editFormData.permissions.length === 0) {
      showToast.error(t('events.users.fillAllFields') || 'Please fill all required fields');
      return;
    }

    try {
      // Don't send password if it's empty (keep old password)
      const updateData: UpdateEventUserRequest = {
        full_name: editFormData.full_name,
        phone: editFormData.phone,
        is_active: editFormData.is_active,
        permissions: editFormData.permissions,
      };
      
      // Only include password if it's not empty
      if (editFormData.password && editFormData.password.trim() !== '') {
        updateData.password = editFormData.password;
      }

      await updateMutation.mutateAsync({
        eventId: eventId!,
        userId: selectedUser!.id,
        data: updateData,
      });
      setShowEditDialog(false);
      setSelectedUser(null);
      setEditFormData({
        full_name: '',
        phone: '',
        password: '',
        is_active: true,
        permissions: [],
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;

    try {
      await deleteMutation.mutateAsync({
        eventId: eventId!,
        userId: selectedUser.id,
      });
      setShowDeleteDialog(false);
      setSelectedUser(null);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const openEditDialog = async (user: EventUser) => {
    setSelectedUser(user);
    setEditFormData({
      full_name: user.full_name,
      phone: user.phone || '',
      password: '',
      is_active: user.is_active,
      permissions: [],
    });
    
    // Fetch user's current permissions
    try {
      const response = await permissionsApi.userPermissionsForUser(user.id);
      const data = response as {
        all_permissions: string[];
      };
      // Filter to only events.read
      const userEventPermissions = (data.all_permissions || []).filter(p => p === 'events.read');
      setEditFormData(prev => ({
        ...prev,
        permissions: userEventPermissions,
      }));
    } catch (error) {
      // If fetching fails, continue with empty permissions
      console.error('Failed to fetch user permissions:', error);
    }
    
    setShowEditDialog(true);
  };

  const openDeleteDialog = (user: EventUser) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  const togglePermission = (permissionName: string, isCreate: boolean) => {
    if (isCreate) {
      setFormData(prev => ({
        ...prev,
        permissions: prev.permissions.includes(permissionName)
          ? prev.permissions.filter(p => p !== permissionName)
          : [...prev.permissions, permissionName],
      }));
    } else {
      // For edit form
      setEditFormData(prev => ({
        ...prev,
        permissions: (prev.permissions || []).includes(permissionName)
          ? (prev.permissions || []).filter(p => p !== permissionName)
          : [...(prev.permissions || []), permissionName],
      }));
    }
  };

  // If no eventId, show message to select an event
  if (!eventId) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="text-center py-20">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Select an Event</h2>
          <p className="text-muted-foreground mb-4">
            Please select an event from the list to manage its users.
          </p>
          <Button onClick={() => navigate('/events')}>
            Go to Events
          </Button>
        </div>
      </div>
    );
  }

  if (eventLoading || usersLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="text-center py-20 text-muted-foreground">
          Event not found
        </div>
      </div>
    );
  }

  if (!hasEventUpdatePermission) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="text-center py-20 text-muted-foreground">
          You do not have permission to manage event users
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/events/${eventId}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Event Users</h1>
            <p className="text-muted-foreground mt-1">{event.title}</p>
          </div>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Create Event User
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900">About Event Users</h3>
              <p className="text-sm text-blue-800 mt-1">
                Event users are locked to this specific event and can only access event-related features.
                They will be automatically deactivated when the event is completed.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      {eventUsers.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Event Users</h3>
              <p className="text-muted-foreground mb-4">
                Create event-specific users who can only access this event.
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Create First Event User
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {eventUsers.map((user) => (
            <Card key={user.id} className={user.is_active ? '' : 'opacity-60'}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{user.full_name}</CardTitle>
                    <CardDescription className="mt-1 flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      {user.email}
                    </CardDescription>
                  </div>
                  <Badge variant={user.is_active ? 'default' : 'secondary'}>
                    {user.is_active ? (
                      <CheckCircle className="h-3 w-3 mr-1" />
                    ) : (
                      <XCircle className="h-3 w-3 mr-1" />
                    )}
                    {user.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {user.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      {user.phone}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    Created: {formatDateTime(user.created_at)}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(user)}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteDialog(user)}
                      className="flex-1 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Deactivate
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Event User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="John Doe"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+1234567890"
                />
              </div>
              <div>
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Minimum 8 characters"
                />
              </div>
            </div>
            <div>
              <Label>Permissions *</Label>
              <div className="mt-2 space-y-3 max-h-64 overflow-y-auto border rounded-md p-4">
                {Object.entries(permissionGroups).map(([resource, perms]) => (
                  <div key={resource} className="space-y-2">
                    <h4 className="font-semibold text-sm capitalize">{resource.replace('_', ' ')}</h4>
                    <div className="grid grid-cols-2 gap-2 ml-4">
                      {perms.map((perm) => (
                        <div key={perm.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`perm-${perm.id}`}
                            checked={formData.permissions.includes(perm.name)}
                            onCheckedChange={() => togglePermission(perm.name, true)}
                          />
                          <label
                            htmlFor={`perm-${perm.id}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {perm.action || perm.name.split('.')[1] || perm.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {formData.permissions.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Selected: {formData.permissions.length} permission(s)
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Event User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_full_name">Full Name *</Label>
              <Input
                id="edit_full_name"
                value={editFormData.full_name}
                onChange={(e) => setEditFormData(prev => ({ ...prev, full_name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit_phone">Phone</Label>
              <Input
                id="edit_phone"
                value={editFormData.phone}
                onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit_password">New Password (leave blank to keep current)</Label>
              <Input
                id="edit_password"
                type="password"
                value={editFormData.password}
                onChange={(e) => setEditFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Leave blank to keep current password"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit_is_active"
                checked={editFormData.is_active}
                onCheckedChange={(checked) => setEditFormData(prev => ({ ...prev, is_active: checked as boolean }))}
              />
              <label htmlFor="edit_is_active" className="text-sm font-normal cursor-pointer">
                Active
              </label>
            </div>
            <div>
              <Label>Permissions *</Label>
              <div className="mt-2 space-y-3 max-h-64 overflow-y-auto border rounded-md p-4">
                {Object.entries(permissionGroups).map(([resource, perms]) => (
                  <div key={resource} className="space-y-2">
                    <h4 className="font-semibold text-sm capitalize">{resource.replace('_', ' ')}</h4>
                    <div className="grid grid-cols-2 gap-2 ml-4">
                      {perms.map((perm) => (
                        <div key={perm.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`edit-perm-${perm.id}`}
                            checked={(editFormData.permissions || []).includes(perm.name)}
                            onCheckedChange={() => togglePermission(perm.name, false)}
                          />
                          <label
                            htmlFor={`edit-perm-${perm.id}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {perm.action || perm.name.split('.')[1] || perm.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {(editFormData.permissions || []).length > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Selected: {(editFormData.permissions || []).length} permission(s)
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Updating...' : 'Update User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Event User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate {selectedUser?.full_name}? They will no longer be able to access the event.
              This action can be reversed by editing the user.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deactivating...' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

