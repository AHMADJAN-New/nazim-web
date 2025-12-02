import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, Users, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface SecurityAlert {
  id: string;
  event_type: string;
  event_data: any;
  error_message?: string;
  user_email?: string;
  created_at: string;
  resolved: boolean;
}

interface SecurityMetrics {
  totalEvents: number;
  errorEvents: number;
  failedLogins: number;
  registrationErrors: number;
  resolvedEvents: number;
}

export const SecurityMonitoringDashboard: React.FC = () => {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    totalEvents: 0,
    errorEvents: 0,
    failedLogins: 0,
    registrationErrors: 0,
    resolvedEvents: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const fetchSecurityData = async () => {
    try {
      // TODO: Migrate to Laravel API endpoint for security monitoring
      // For now, return empty array
      const events: SecurityAlert[] = [];

      setAlerts(events || []);

      // Calculate metrics
      const totalEvents = events?.length || 0;
      const errorEvents = events?.filter(e => e.error_message).length || 0;
      const failedLogins = events?.filter(e => e.event_type.includes('login_failed')).length || 0;
      const registrationErrors = events?.filter(e => e.event_type.includes('registration_error')).length || 0;
      const resolvedEvents = events?.filter(e => e.resolved).length || 0;

      setMetrics({
        totalEvents,
        errorEvents,
        failedLogins,
        registrationErrors,
        resolvedEvents
      });
    } catch (error) {
      console.error('Error fetching security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventSeverity = (event: SecurityAlert) => {
    if (event.error_message) return 'high';
    if (event.event_type.includes('failed') || event.event_type.includes('error')) return 'medium';
    return 'low';
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'medium':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Medium</Badge>;
      default:
        return <Badge variant="outline">Low</Badge>;
    }
  };

  const getEventIcon = (eventType: string) => {
    if (eventType.includes('login') || eventType.includes('auth')) {
      return <Shield className="h-4 w-4" />;
    }
    if (eventType.includes('registration')) {
      return <Users className="h-4 w-4" />;
    }
    return <AlertCircle className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">Loading security monitoring data...</div>
      </div>
    );
  }

  const criticalAlerts = alerts.filter(alert => 
    getEventSeverity(alert) === 'high' && !alert.resolved
  );

  return (
    <div className="space-y-6">
      {/* Security Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalEvents}</div>
            <p className="text-xs text-muted-foreground">Last 50 events</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Logins</CardTitle>
            <Shield className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics.failedLogins}</div>
            <p className="text-xs text-muted-foreground">Authentication failures</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Events</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{metrics.errorEvents}</div>
            <p className="text-xs text-muted-foreground">Events with errors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reg. Errors</CardTitle>
            <Users className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{metrics.registrationErrors}</div>
            <p className="text-xs text-muted-foreground">Registration issues</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <Clock className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.resolvedEvents}</div>
            <p className="text-xs text-muted-foreground">Handled events</p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Critical Security Alerts ({criticalAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {criticalAlerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className="border-l-4 border-red-500 pl-4 py-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {getEventIcon(alert.event_type)}
                        <span className="font-medium">{alert.event_type.replace('_', ' ').toUpperCase()}</span>
                        {getSeverityBadge(getEventSeverity(alert))}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {alert.user_email && `User: ${alert.user_email}`}
                      </p>
                      {alert.error_message && (
                        <p className="text-sm text-red-600 font-mono bg-red-50 p-2 rounded">
                          {alert.error_message}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(alert.created_at), 'MMM dd, HH:mm')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Security Events */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Security Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {alerts.slice(0, 10).map((alert) => (
              <div key={alert.id} className="flex items-start justify-between p-3 border rounded-lg">
                <div className="flex items-start gap-3">
                  {getEventIcon(alert.event_type)}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{alert.event_type.replace('_', ' ')}</span>
                      {getSeverityBadge(getEventSeverity(alert))}
                      {alert.resolved && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Resolved
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {alert.user_email || 'System event'}
                    </p>
                    {alert.error_message && (
                      <p className="text-xs text-red-600 bg-red-50 p-1 rounded font-mono">
                        {alert.error_message.substring(0, 100)}...
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(alert.created_at), 'MMM dd, HH:mm')}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};