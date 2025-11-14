import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Users, Clock, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/ui/loading';

interface PendingRegistration {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  requested_role: string;
  requested_at: string;
  additional_info: any;
}

interface SchoolUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
}

export default function SchoolAdminPage() {
  const { user } = useAuth();
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistration[]>([]);
  const [schoolUsers, setSchoolUsers] = useState<SchoolUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchPendingRegistrations();
    fetchSchoolUsers();
  }, []);

  const fetchPendingRegistrations = async () => {
    try {
      const { data, error } = await supabase
        .from('pending_registrations')
        .select('*')
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });

      if (error) throw error;
      setPendingRegistrations(data || []);
    } catch (error) {
      console.error('Error fetching pending registrations:', error);
      toast.error('Failed to fetch pending registrations');
    }
  };

  const fetchSchoolUsers = async () => {
    try {
      // Get school_id from school_admins table
      const { data: adminData, error: adminError } = await supabase
        .from('school_admins')
        .select('school_id')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .maybeSingle();

      if (adminError) throw adminError;
      
      if (!adminData) {
        console.log('No school admin data found for user');
        setSchoolUsers([]);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('school_id', adminData.school_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSchoolUsers(data || []);
    } catch (error) {
      console.error('Error fetching school users:', error);
      toast.error('Failed to fetch school users');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRegistration = async (registrationId: string) => {
    try {
      const { error } = await supabase.rpc('approve_registration', {
        registration_id: registrationId,
        approver_id: user?.id
      });

      if (error) throw error;

      toast.success('Registration approved successfully');
      fetchPendingRegistrations();
      fetchSchoolUsers();
    } catch (error) {
      console.error('Error approving registration:', error);
      toast.error('Failed to approve registration');
    }
  };

  const handleRejectRegistration = async () => {
    if (!selectedRegistration) return;

    try {
      const { error } = await supabase.rpc('reject_registration', {
        registration_id: selectedRegistration,
        approver_id: user?.id,
        reason: rejectionReason
      });

      if (error) throw error;

      toast.success('Registration rejected');
      setRejectDialogOpen(false);
      setSelectedRegistration(null);
      setRejectionReason('');
      fetchPendingRegistrations();
    } catch (error) {
      console.error('Error rejecting registration:', error);
      toast.error('Failed to reject registration');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'teacher': return 'default';
      case 'student': return 'secondary';
      case 'parent': return 'outline';
      case 'staff': return 'destructive';
      default: return 'default';
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">School Admin Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Approvals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {pendingRegistrations.length}
            </div>
            <p className="text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {schoolUsers.length}
            </div>
            <p className="text-muted-foreground">Approved members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {['teacher', 'student', 'parent', 'staff'].map(role => {
                const count = schoolUsers.filter(user => user.role === role).length;
                return (
                  <div key={role} className="flex justify-between">
                    <span className="capitalize">{role}s:</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Pending Registrations</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingRegistrations.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No pending registrations
              </p>
            ) : (
              <div className="space-y-4">
                {pendingRegistrations.map((registration) => (
                  <div key={registration.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold">{registration.full_name}</h3>
                        <p className="text-sm text-muted-foreground">{registration.email}</p>
                        {registration.phone && (
                          <p className="text-sm text-muted-foreground">{registration.phone}</p>
                        )}
                      </div>
                      <Badge variant={getRoleBadgeColor(registration.requested_role)}>
                        {registration.requested_role}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      Requested: {new Date(registration.requested_at).toLocaleDateString()}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApproveRegistration(registration.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setSelectedRegistration(registration.id);
                          setRejectDialogOpen(true);
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>School Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {schoolUsers.map((user) => (
                <div key={user.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{user.full_name}</h3>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Joined: {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={getRoleBadgeColor(user.role)}>
                      {user.role}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Registration</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Rejection Reason</Label>
              <Textarea
                id="reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide a reason for rejection..."
                required
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleRejectRegistration}>
                Reject Registration
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}