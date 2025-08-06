import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useRoleRequests } from '@/hooks/useRoleRequests';
import { useUserRole } from '@/hooks/useUserRole';
import { AlertCircle, Check, X, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export const RoleRequestManager: React.FC = () => {
  const { requests, loading, approveRequest, rejectRequest } = useRoleRequests();
  const { role: currentUserRole } = useUserRole();
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  const isAdmin = currentUserRole === 'super_admin' || currentUserRole === 'admin';

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>Access denied. Only administrators can manage role requests.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleApprove = async (requestId: string) => {
    try {
      await approveRequest(requestId);
    } catch (error) {
      console.error('Failed to approve request:', error);
    }
  };

  const handleReject = async () => {
    if (!selectedRequestId || !rejectionReason.trim()) return;
    
    try {
      await rejectRequest(selectedRequestId, rejectionReason);
      setSelectedRequestId(null);
      setRejectionReason('');
    } catch (error) {
      console.error('Failed to reject request:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="text-green-600 border-green-600">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="text-red-600 border-red-600">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      'super_admin': 'bg-red-100 text-red-800 border-red-200',
      'admin': 'bg-purple-100 text-purple-800 border-purple-200',
      'teacher': 'bg-blue-100 text-blue-800 border-blue-200',
      'staff': 'bg-green-100 text-green-800 border-green-200',
      'student': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    
    return (
      <Badge variant="outline" className={colors[role as keyof typeof colors] || colors.student}>
        {role.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Loading role requests...</div>
        </CardContent>
      </Card>
    );
  }

  const pendingRequests = requests.filter(req => req.status === 'pending');
  const recentRequests = requests.filter(req => req.status !== 'pending').slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            Pending Role Requests ({pendingRequests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No pending requests</p>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div key={request.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span className="font-medium">
                          {request.profiles?.full_name || 'Unknown User'}
                        </span>
                        <span className="text-muted-foreground">
                          ({request.profiles?.email})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Role change:</span>
                        {getRoleBadge(request.existing_role || 'none')}
                        <span className="text-muted-foreground">→</span>
                        {getRoleBadge(request.requested_role)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        Requested on {format(new Date(request.requested_at), 'PPp')}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(request.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Approve
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => setSelectedRequestId(request.id)}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Reject
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Reject Role Request</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                              Please provide a reason for rejecting this role request:
                            </p>
                            <Textarea
                              placeholder="Enter rejection reason..."
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              rows={3}
                            />
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setSelectedRequestId(null);
                                  setRejectionReason('');
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={handleReject}
                                disabled={!rejectionReason.trim()}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Reject Request
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                  {request.justification && (
                    <div className="border-t pt-3">
                      <p className="text-sm">
                        <span className="font-medium">Justification:</span> {request.justification}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Processed Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {recentRequests.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No processed requests</p>
          ) : (
            <div className="space-y-3">
              {recentRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {request.profiles?.full_name || 'Unknown User'}
                      </span>
                      {getRoleBadge(request.existing_role || 'none')}
                      <span className="text-muted-foreground">→</span>
                      {getRoleBadge(request.requested_role)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {request.reviewed_at && format(new Date(request.reviewed_at), 'PPp')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(request.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};