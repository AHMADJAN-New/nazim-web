import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface PendingRegistration {
  id: string;
  full_name: string;
  email: string;
  requested_role: string;
  status: string;
  requested_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  school: {
    name: string;
  };
}

export default function PendingApprovalPage() {
  const { user, signOut } = useAuth();
  const [registration, setRegistration] = useState<PendingRegistration | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRegistrationStatus();
  }, [user]);

  const fetchRegistrationStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('pending_registrations')
        .select(`
          *,
          school:schools(name)
        `)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setRegistration(data);
    } catch (error) {
      console.error('Error fetching registration status:', error);
      toast.error('Failed to fetch registration status');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchRegistrationStatus();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending Review</Badge>;
      case 'approved':
        return <Badge variant="default">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!registration) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-6">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Registration Not Found</h2>
            <p className="text-muted-foreground mb-4">
              We couldn't find your registration. Please contact support.
            </p>
            <Button onClick={() => signOut()}>Sign Out</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {getStatusIcon(registration.status)}
          </div>
          <CardTitle>Registration Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            {getStatusBadge(registration.status)}
          </div>

          <div className="space-y-3">
            <div>
              <h3 className="font-semibold">Registration Details</h3>
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Name:</strong> {registration.full_name}</p>
                <p><strong>Email:</strong> {registration.email}</p>
                <p><strong>Role:</strong> {registration.requested_role}</p>
                <p><strong>School:</strong> {registration.school?.name}</p>
                <p><strong>Submitted:</strong> {new Date(registration.requested_at).toLocaleDateString()}</p>
              </div>
            </div>

            {registration.status === 'pending' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <h4 className="font-medium text-yellow-800">Awaiting Approval</h4>
                </div>
                <p className="text-sm text-yellow-700">
                  Your registration is being reviewed by the school administrator. 
                  You will receive email notification once it's processed.
                </p>
              </div>
            )}

            {registration.status === 'approved' && registration.reviewed_at && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <h4 className="font-medium text-green-800">Registration Approved</h4>
                </div>
                <p className="text-sm text-green-700 mb-2">
                  Your registration was approved on {new Date(registration.reviewed_at).toLocaleDateString()}.
                </p>
                <p className="text-sm text-green-700">
                  Please refresh the page or sign out and sign back in to access your account.
                </p>
              </div>
            )}

            {registration.status === 'rejected' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <h4 className="font-medium text-red-800">Registration Rejected</h4>
                </div>
                {registration.rejection_reason && (
                  <p className="text-sm text-red-700 mb-2">
                    <strong>Reason:</strong> {registration.rejection_reason}
                  </p>
                )}
                <p className="text-sm text-red-700">
                  Please contact the school administrator for more information.
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => signOut()}
            >
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}