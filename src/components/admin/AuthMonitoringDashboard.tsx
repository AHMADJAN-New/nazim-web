import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Shield, 
  Users,
  RefreshCw,
  TrendingUp,
  Activity
} from 'lucide-react';

interface AuthEvent {
  id: string;
  event_type: string;
  event_data: any;
  error_message: string | null;
  user_email: string | null;
  resolved: boolean;
  created_at: string;
}

interface AuthStats {
  total_events: number;
  failed_logins: number;
  registration_errors: number;
  resolved_issues: number;
  recent_errors: number;
}

export function AuthMonitoringDashboard() {
  const [events, setEvents] = useState<AuthEvent[]>([]);
  const [stats, setStats] = useState<AuthStats>({
    total_events: 0,
    failed_logins: 0,
    registration_errors: 0,
    resolved_issues: 0,
    recent_errors: 0
  });
  const [loading, setLoading] = useState(false);

  const fetchAuthEvents = async () => {
    setLoading(true);
    try {
      // Fetch recent auth events
      const { data: eventsData, error: eventsError } = await supabase
        .from('auth_monitoring')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (eventsError) throw eventsError;
      setEvents(eventsData || []);

      // Calculate stats
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const recentEvents = (eventsData || []).filter(
        event => new Date(event.created_at) > last24Hours
      );

      const newStats: AuthStats = {
        total_events: eventsData?.length || 0,
        failed_logins: recentEvents.filter(e => 
          e.event_type.includes('login_failed') || 
          e.error_message?.includes('Invalid credentials')
        ).length,
        registration_errors: recentEvents.filter(e => 
          e.event_type.includes('registration_error')
        ).length,
        resolved_issues: (eventsData || []).filter(e => e.resolved).length,
        recent_errors: recentEvents.filter(e => e.error_message).length
      };

      setStats(newStats);
    } catch (error: any) {
      toast.error('Failed to fetch auth monitoring data');
      console.error('Error fetching auth events:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsResolved = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('auth_monitoring')
        .update({ resolved: true })
        .eq('id', eventId);

      if (error) throw error;
      
      toast.success('Event marked as resolved');
      fetchAuthEvents();
    } catch (error: any) {
      toast.error('Failed to mark event as resolved');
    }
  };

  const testAuthSystem = async () => {
    setLoading(true);
    try {
      // Test login with invalid credentials to generate monitoring event
      await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'invalid'
      });
    } catch (error) {
      // Expected to fail
    }

    // Log a test event
    try {
      await supabase.rpc('log_auth_event', {
        event_type: 'auth_system_test',
        event_data: { test_time: new Date().toISOString() },
        error_message: null,
        user_email: 'system@test.com'
      });
      
      toast.success('Auth system test completed');
      setTimeout(fetchAuthEvents, 1000);
    } catch (error: any) {
      toast.error('Auth system test failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuthEvents();
    
    // Set up real-time subscription for auth events
    const channel = supabase
      .channel('auth_monitoring')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'auth_monitoring' },
        () => fetchAuthEvents()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getEventTypeColor = (eventType: string) => {
    if (eventType.includes('error') || eventType.includes('failed')) return 'destructive';
    if (eventType.includes('success') || eventType.includes('created')) return 'default';
    if (eventType.includes('test')) return 'secondary';
    return 'outline';
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <Activity className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Total Events</p>
              <p className="text-2xl font-bold">{stats.total_events}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <XCircle className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Failed Logins (24h)</p>
              <p className="text-2xl font-bold">{stats.failed_logins}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Registration Errors</p>
              <p className="text-2xl font-bold">{stats.registration_errors}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Resolved Issues</p>
              <p className="text-2xl font-bold">{stats.resolved_issues}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Authentication Monitoring Dashboard
              </CardTitle>
              <CardDescription>
                Real-time monitoring of authentication events and system health
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={testAuthSystem}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <TrendingUp className="h-4 w-4" />
                Test System
              </Button>
              <Button
                onClick={fetchAuthEvents}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4" />
              <p>No authentication events recorded yet.</p>
              <p className="text-sm">Events will appear here as users interact with the system.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getEventTypeColor(event.event_type)}>
                        {event.event_type.replace(/_/g, ' ').toUpperCase()}
                      </Badge>
                      {event.user_email && (
                        <span className="text-sm text-muted-foreground">{event.user_email}</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {new Date(event.created_at).toLocaleString()}
                      </span>
                    </div>
                    
                    {event.error_message && (
                      <p className="text-sm text-red-600 mt-1">{event.error_message}</p>
                    )}
                    
                    {event.event_data && Object.keys(event.event_data).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-muted-foreground cursor-pointer">
                          Event Data
                        </summary>
                        <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                          {JSON.stringify(event.event_data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {event.resolved ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Resolved
                      </Badge>
                    ) : event.error_message ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markAsResolved(event.id)}
                      >
                        Mark Resolved
                      </Button>
                    ) : (
                      <Badge variant="secondary">
                        <Activity className="h-3 w-3 mr-1" />
                        Info
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}