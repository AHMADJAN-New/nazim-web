import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";

const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const getCorsHeaders = (origin: string) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
});


interface HealthCheck {
  name: string;
  status: 'passed' | 'failed' | 'warning';
  details: string;
  critical: boolean;
}

interface HealthIssue {
  type: string;
  severity: 'critical' | 'warning';
  message: string;
  recommendation: string;
}

interface HealthReport {
  timestamp: string;
  checks: HealthCheck[];
  issues: HealthIssue[];
  summary: {
    total_checks: number;
    passed: number;
    failed: number;
    critical_issues: number;
  };
}

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get('origin') || '';
  if (!allowedOrigins.includes(origin)) {
    return new Response('Origin not allowed', { status: 403 });
  }

  const corsHeaders = getCorsHeaders(origin);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting authentication health check...');

    const healthReport: HealthReport = {
      timestamp: new Date().toISOString(),
      checks: [],
      issues: [],
      summary: {
        total_checks: 0,
        passed: 0,
        failed: 0,
        critical_issues: 0,
      },
    };

    // Check 1: Verify all demo accounts exist in auth.users
    const demoEmails = [
      'super.admin@greenvalley.edu',
      'admin@greenvalley.edu',
      'teacher@greenvalley.edu',
      'student@greenvalley.edu',
      'parent@greenvalley.edu',
      'staff@greenvalley.edu',
      'pending@greenvalley.edu'
    ];

    const { data: users } = await supabase.auth.admin.listUsers();
    const foundEmails = new Set(users.users.map(u => u.email));
    
    const missingDemoAccounts = demoEmails.filter(email => !foundEmails.has(email));
    
    healthReport.checks.push({
      name: 'Demo accounts existence',
      status: missingDemoAccounts.length === 0 ? 'passed' : 'failed',
      details: missingDemoAccounts.length === 0 
        ? 'All demo accounts exist in auth.users'
        : `Missing accounts: ${missingDemoAccounts.join(', ')}`,
      critical: missingDemoAccounts.length > 0
    });

    if (missingDemoAccounts.length > 0) {
      healthReport.issues.push({
        type: 'missing_demo_accounts',
        severity: 'critical',
        message: `Missing demo accounts: ${missingDemoAccounts.join(', ')}`,
        recommendation: 'Run the update-demo-passwords function to create missing accounts'
      });
    }

    // Check 2: Verify all demo accounts have corresponding profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('email')
      .in('email', demoEmails);
    
    const foundProfileEmails = new Set(profiles?.map((p) => p.email) || []);
    const missingProfiles = demoEmails.filter(
      (email) => !foundProfileEmails.has(email),
    );


    healthReport.checks.push({
      name: 'Demo profiles existence',
      status: missingProfiles.length === 0 ? 'passed' : 'failed',
      details: missingProfiles.length === 0
        ? 'All demo accounts have profiles'
        : `Missing profiles: ${missingProfiles.join(', ')}`,
      critical: missingProfiles.length > 0
    });

    if (missingProfiles.length > 0) {
      healthReport.issues.push({
        type: 'missing_profiles',
        severity: 'critical',
        message: `Missing profiles for: ${missingProfiles.join(', ')}`,
        recommendation: 'Run database migration to create missing profiles'
      });
    }

    // Check 3: Verify trigger exists
    const { data: triggers } = await supabase
      .from('information_schema.triggers')
      .select('trigger_name')
      .eq('event_object_schema', 'auth')
      .eq('event_object_table', 'users')
      .eq('trigger_name', 'on_auth_user_created');

    const triggerExists = triggers && triggers.length > 0;
    
    healthReport.checks.push({
      name: 'Auth trigger existence',
      status: triggerExists ? 'passed' : 'failed',
      details: triggerExists 
        ? 'on_auth_user_created trigger exists'
        : 'on_auth_user_created trigger is missing',
      critical: !triggerExists
    });

    if (!triggerExists) {
      healthReport.issues.push({
        type: 'missing_trigger',
        severity: 'critical',
        message: 'Auth trigger on_auth_user_created is missing',
        recommendation: 'Run database migration to create the missing trigger'
      });
    }

    // Check 4: Check for recent authentication errors
    const { data: recentErrors } = await supabase
      .from('auth_monitoring')
      .select('*')
      .not('error_message', 'is', null)
      .eq('resolved', false)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    const errorCount = recentErrors?.length || 0;

    healthReport.checks.push({
      name: 'Recent authentication errors',
      status: errorCount === 0 ? 'passed' : 'warning',
      details: errorCount === 0 
        ? 'No unresolved auth errors in last 24 hours'
        : `${errorCount} unresolved auth errors in last 24 hours`,
      critical: errorCount > 10
    });

    if (errorCount > 0) {
      healthReport.issues.push({
        type: 'unresolved_auth_errors',
        severity: errorCount > 10 ? 'critical' : 'warning',
        message: `${errorCount} unresolved authentication errors in the last 24 hours`,
        recommendation: 'Review auth monitoring dashboard and resolve pending issues'
      });
    }

    // Calculate summary
    healthReport.summary.total_checks = healthReport.checks.length;
    healthReport.summary.passed = healthReport.checks.filter(c => c.status === 'passed').length;
    healthReport.summary.failed = healthReport.checks.filter(c => c.status === 'failed').length;
    healthReport.summary.critical_issues = healthReport.issues.filter(i => i.severity === 'critical').length;

    // Log the health report
    await supabase.rpc('log_auth_event', {
      event_type: 'auth_health_check',
      event_data: healthReport,
      error_message: healthReport.summary.critical_issues > 0 ? 'Critical authentication issues detected' : null,
      user_email: 'system@monitor.com'
    });

    console.log('Authentication health check completed:', healthReport.summary);

    return new Response(JSON.stringify({
      status: 'success',
      health_report: healthReport,
      message: `Health check completed. ${healthReport.summary.critical_issues} critical issues found.`
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error: unknown) {
    console.error('Error in auth health monitor:', error);

    const message = error instanceof Error ? error.message : String(error);

    return new Response(
      JSON.stringify({
        status: 'error',
        error: message,
        message: 'Health check failed',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      },
    );
  }
};

serve(handler);
