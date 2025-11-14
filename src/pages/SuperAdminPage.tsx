import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PasswordManagement } from '@/components/admin/PasswordManagement';
import { DemoAccountTester } from '@/components/admin/DemoAccountTester';
import { AuthMonitoringDashboard } from '@/components/admin/AuthMonitoringDashboard';
import { RoleRequestManager } from '@/components/admin/RoleRequestManager';
import { SecurityMonitoringDashboard } from '@/components/admin/SecurityMonitoringDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, School, Users, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/ui/loading';

interface School {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  principal_name: string;
  is_active: boolean;
  max_students: number;
  created_at: string;
}

interface PendingRegistration {
  id: string;
  full_name: string;
  email: string;
  requested_role: string;
  requested_at: string;
  school: {
    name: string;
  };
}

export default function SuperAdminPage() {
  const { user } = useAuth();
  const [schools, setSchools] = useState<School[]>([]);
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistration[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [newSchool, setNewSchool] = useState({
    name: '',
    code: '',
    address: '',
    phone: '',
    email: '',
    principal_name: '',
    max_students: 500
  });

  useEffect(() => {
    fetchSchools();
    fetchPendingRegistrations();
  }, []);

  const fetchSchools = async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSchools(data || []);
    } catch (error) {
      console.error('Error fetching schools:', error);
      toast.error('Failed to fetch schools');
    }
  };

  const fetchPendingRegistrations = async () => {
    try {
      const { data, error } = await supabase
        .from('pending_registrations')
        .select(`
          *,
          school:schools(name)
        `)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });

      if (error) throw error;
      setPendingRegistrations(data || []);
    } catch (error) {
      console.error('Error fetching pending registrations:', error);
      toast.error('Failed to fetch pending registrations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('schools')
        .insert([newSchool]);

      if (error) throw error;

      toast.success('School created successfully');
      setIsCreateDialogOpen(false);
      setNewSchool({
        name: '',
        code: '',
        address: '',
        phone: '',
        email: '',
        principal_name: '',
        max_students: 500
      });
      fetchSchools();
    } catch (error) {
      console.error('Error creating school:', error);
      toast.error('Failed to create school');
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
    } catch (error) {
      console.error('Error approving registration:', error);
      toast.error('Failed to approve registration');
    }
  };

  const handleRejectRegistration = async (registrationId: string) => {
    try {
      const { error } = await supabase.rpc('reject_registration', {
        registration_id: registrationId,
        approver_id: user?.id,
        reason: 'Rejected by Super Admin'
      });

      if (error) throw error;

      toast.success('Registration rejected');
      fetchPendingRegistrations();
    } catch (error) {
      console.error('Error rejecting registration:', error);
      toast.error('Failed to reject registration');
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create School
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New School</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateSchool} className="space-y-4">
              <div>
                <Label htmlFor="name">School Name</Label>
                <Input
                  id="name"
                  value={newSchool.name}
                  onChange={(e) => setNewSchool({ ...newSchool, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="code">School Code</Label>
                <Input
                  id="code"
                  value={newSchool.code}
                  onChange={(e) => setNewSchool({ ...newSchool, code: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newSchool.email}
                  onChange={(e) => setNewSchool({ ...newSchool, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="principal">Principal Name</Label>
                <Input
                  id="principal"
                  value={newSchool.principal_name}
                  onChange={(e) => setNewSchool({ ...newSchool, principal_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={newSchool.address}
                  onChange={(e) => setNewSchool({ ...newSchool, address: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={newSchool.phone}
                  onChange={(e) => setNewSchool({ ...newSchool, phone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="maxStudents">Max Students</Label>
                <Input
                  id="maxStudents"
                  type="number"
                  value={newSchool.max_students}
                  onChange={(e) => setNewSchool({ ...newSchool, max_students: parseInt(e.target.value) })}
                />
              </div>
              <Button type="submit" className="w-full">Create School</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <School className="h-5 w-5" />
              Schools ({schools.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {schools.map((school) => (
                <div key={school.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{school.name}</h3>
                      <p className="text-sm text-muted-foreground">Code: {school.code}</p>
                      <p className="text-sm text-muted-foreground">Principal: {school.principal_name}</p>
                    </div>
                    <Badge variant={school.is_active ? "default" : "secondary"}>
                      {school.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Pending Registrations ({pendingRegistrations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingRegistrations.map((registration) => (
                <div key={registration.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{registration.full_name}</h3>
                      <p className="text-sm text-muted-foreground">{registration.email}</p>
                      <p className="text-sm text-muted-foreground">
                        Role: {registration.requested_role}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        School: {registration.school?.name}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApproveRegistration(registration.id)}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRejectRegistration(registration.id)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {pendingRegistrations.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  No pending registrations
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Authentication Management Section */}
      <div className="mt-8 space-y-6">
        <AuthMonitoringDashboard />
        <PasswordManagement />
        <DemoAccountTester />
      </div>
    </div>
  );
}