import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { UserIcon, ShieldIcon, BookOpenIcon, UsersIcon, WrenchIcon } from 'lucide-react';

interface DemoAccount {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'super_admin':
    case 'admin':
      return <ShieldIcon className="h-4 w-4" />;
    case 'teacher':
      return <BookOpenIcon className="h-4 w-4" />;
    case 'student':
      return <UserIcon className="h-4 w-4" />;
    case 'parent':
      return <UsersIcon className="h-4 w-4" />;
    case 'staff':
      return <WrenchIcon className="h-4 w-4" />;
    default:
      return <UserIcon className="h-4 w-4" />;
  }
};

const getRoleColor = (role: string) => {
  switch (role) {
    case 'super_admin':
      return 'bg-red-500 text-white';
    case 'admin':
      return 'bg-blue-500 text-white';
    case 'teacher':
      return 'bg-green-500 text-white';
    case 'student':
      return 'bg-purple-500 text-white';
    case 'parent':
      return 'bg-orange-500 text-white';
    case 'staff':
      return 'bg-gray-500 text-white';
    default:
      return 'bg-gray-400 text-white';
  }
};

export function DemoAccountsTab() {
  const [accounts, setAccounts] = useState<DemoAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingIn, setLoggingIn] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDemoAccounts();
  }, []);

  const fetchDemoAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role')
        .order('role', { ascending: true })
        .order('email', { ascending: true });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching demo accounts:', error);
      toast.error('Failed to load demo accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (account: DemoAccount) => {
    setLoggingIn(account.id);
    try {
      // First try to sign in with the demo password
      const { error } = await supabase.auth.signInWithPassword({
        email: account.email,
        password: 'admin123', // Default demo password
      });

      if (error) {
        throw error;
      }

      // Log the demo login event
      try {
        await supabase.rpc('log_auth_event', {
          event_type: 'demo_login',
          event_data: { 
            email: account.email, 
            role: account.role,
            account_id: account.id,
            development_mode: true
          },
          error_message: null,
          user_email: account.email
        });
      } catch {
        // Silent fail for logging
      }

      toast.success(`Logged in as ${account.full_name} (${account.role})`);
      navigate('/redirect');
    } catch (error: any) {
      console.error('Demo login error:', error);
      toast.error(`Failed to login as ${account.full_name}: ${error.message}`);
    } finally {
      setLoggingIn(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <WrenchIcon className="h-5 w-5" />
            Development Mode - Demo Accounts
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Click any button below to instantly login as that user for testing purposes.
            All accounts use the password "admin123".
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {getRoleIcon(account.role)}
                    <div>
                      <p className="font-medium">{account.full_name}</p>
                      <p className="text-sm text-muted-foreground">{account.email}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getRoleColor(account.role)}>
                    {account.role.replace('_', ' ').toUpperCase()}
                  </Badge>
                  <Button
                    size="sm"
                    onClick={() => handleDemoLogin(account)}
                    disabled={loggingIn === account.id}
                    className="min-w-[100px]"
                  >
                    {loggingIn === account.id ? 'Logging in...' : 'Login as User'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {accounts.length === 0 && (
            <p className="text-center text-muted-foreground py-4">
              No demo accounts available
            </p>
          )}
        </CardContent>
      </Card>
      
      <div className="text-xs text-muted-foreground bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <strong>⚠️ Development Mode Only:</strong> This tab is only visible in development. 
        It provides instant access to all user accounts for testing purposes. 
        Real authentication and role restrictions remain fully intact for production use.
      </div>
    </div>
  );
}