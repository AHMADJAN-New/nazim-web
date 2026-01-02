import { useQuery } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { platformApi } from '@/platform/lib/platformApi';
import { LoadingSpinner } from '@/components/ui/loading';
import { usePlatformAdminPermissions } from '@/platform/hooks/usePlatformAdminPermissions';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils';
import { Clock, AlertTriangle, CheckCircle, XCircle, History } from 'lucide-react';

interface MaintenanceHistoryItem {
  id: string;
  message: string;
  affected_services: string[];
  started_at: string;
  scheduled_end_at: string | null;
  actual_end_at: string | null;
  duration_minutes: number | null;
  status: string;
  started_by: {
    name: string;
    email: string;
  } | null;
  ended_by: {
    name: string;
    email: string;
  } | null;
}

interface MaintenanceHistoryContentProps {
  maintenanceHistory: MaintenanceHistoryItem[] | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  isFetching: boolean;
}

export function MaintenanceHistoryContent({
  maintenanceHistory,
  isLoading,
  error,
  refetch,
  isFetching,
}: MaintenanceHistoryContentProps) {
  const { t } = useLanguage();

  // Manual refetch handler
  const handleManualRefetch = async () => {
    try {
      await refetch();
    } catch (err) {
      // Errors are handled by React Query.
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">
            <Clock className="mr-1 h-3 w-3" />
            Active
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
            <CheckCircle className="mr-1 h-3 w-3" />
            Completed
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Maintenance Events</CardTitle>
              <CardDescription>
                Complete history of all maintenance mode activations and deactivations
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefetch}
              disabled={isFetching}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              {isFetching ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
              <p className="text-destructive font-medium">Error loading maintenance history</p>
              <p className="text-sm text-muted-foreground mt-1">
                {error instanceof Error ? error.message : 'Unknown error occurred'}
              </p>
            </div>
          ) : !maintenanceHistory || maintenanceHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <History className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground font-medium">No maintenance history</p>
              <p className="text-sm text-muted-foreground mt-1">
                Maintenance events will appear here once maintenance mode is used
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Scheduled End</TableHead>
                    <TableHead>Actual End</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Started By</TableHead>
                    <TableHead>Ended By</TableHead>
                    <TableHead>Affected Services</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {maintenanceHistory.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell className="max-w-xs">
                        <p className="truncate" title={log.message}>
                          {log.message || 'No message'}
                        </p>
                      </TableCell>
                      <TableCell>
                        {formatDateTime(new Date(log.started_at))}
                      </TableCell>
                      <TableCell>
                        {log.scheduled_end_at
                          ? formatDateTime(new Date(log.scheduled_end_at))
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {log.actual_end_at
                          ? formatDateTime(new Date(log.actual_end_at))
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {log.duration_minutes !== null
                          ? `${log.duration_minutes} min`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {log.started_by ? (
                          <div>
                            <p className="text-sm font-medium">{log.started_by.name}</p>
                            <p className="text-xs text-muted-foreground">{log.started_by.email}</p>
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {log.ended_by ? (
                          <div>
                            <p className="text-sm font-medium">{log.ended_by.name}</p>
                            <p className="text-xs text-muted-foreground">{log.ended_by.email}</p>
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {log.affected_services && log.affected_services.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {log.affected_services.map((service, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {service}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          '-'
                        )}
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
  );
}

// Keep default export for backward compatibility (if route still exists)
export default function MaintenanceHistory() {
  const { data: permissions, isLoading: permissionsLoading } = usePlatformAdminPermissions();

  // Access control - check for platform admin permission (GLOBAL, not organization-scoped)
  const hasPlatformAdmin = Array.isArray(permissions) && permissions.includes('subscription.admin');

  const canFetch = !permissionsLoading && hasPlatformAdmin;

  const {
    data: maintenanceHistory,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery<MaintenanceHistoryItem[]>({
    queryKey: ['platform-maintenance-history'],
    queryFn: async () => {
      const response = await platformApi.maintenance.history();
      // API returns { success: boolean, data: [...] }
      return response.data || [];
    },
    enabled: canFetch,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Wait for permissions to load
  if (permissionsLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasPlatformAdmin) {
    return <Navigate to="/platform/dashboard" replace />;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <History className="h-8 w-8" />
          Maintenance History
        </h1>
        <p className="text-muted-foreground mt-2">
          View all maintenance mode events and their details
        </p>
      </div>
      <MaintenanceHistoryContent
        maintenanceHistory={maintenanceHistory}
        isLoading={isLoading}
        error={error}
        refetch={refetch}
        isFetching={isFetching}
      />
    </div>
  );
}

