import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Shield, Users, RefreshCw, CheckCircle, XCircle, Plus, Trash2 } from 'lucide-react';

interface UpdateResult {
  email: string;
  success: boolean;
  error?: string;
}

interface DemoAccount {
  id: string;
  email: string;
  role: string;
  full_name: string | null;
  description: string | null;
}

export function PasswordManagement() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<UpdateResult[]>([]);
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);
  const [newAccount, setNewAccount] = useState({
    email: '',
    role: '',
    full_name: '',
    description: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDemoAccounts();
  }, []);

  const fetchDemoAccounts = async () => {
    const { data, error } = await supabase
      .from('demo_accounts')
      .select('*')
      .order('role', { ascending: true });

    if (error) {
      console.error('Error fetching demo accounts:', error);
      toast.error('Failed to load demo accounts');
    } else {
      setDemoAccounts(data || []);
    }
  };

  const updateDemoPasswords = async () => {
    setLoading(true);
    setResults([]);
    
    try {
      const { data, error } = await supabase.functions.invoke('update-demo-passwords');
      
      if (error) throw error;
      
      setResults(data.results || []);
      toast.success(data.message || 'Demo passwords updated successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update demo passwords');
      console.error('Error updating demo passwords:', error);
    } finally {
      setLoading(false);
    }
  };

  const addDemoAccount = async () => {
    if (!newAccount.email || !newAccount.role) {
      toast.error('Email and role are required');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('demo_accounts').insert(newAccount);
    if (error) {
      console.error('Error adding demo account:', error);
      toast.error('Failed to add demo account');
    } else {
      toast.success('Demo account added');
      setNewAccount({ email: '', role: '', full_name: '', description: '' });
      fetchDemoAccounts();
    }
    setSaving(false);
  };

  const removeDemoAccount = async (id: string) => {
    const { error } = await supabase.from('demo_accounts').delete().eq('id', id);
    if (error) {
      console.error('Error removing demo account:', error);
      toast.error('Failed to remove demo account');
    } else {
      toast.success('Demo account removed');
      setDemoAccounts(demoAccounts.filter(a => a.id !== id));
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Password Management
        </CardTitle>
        <CardDescription>
          Manage demo account passwords and view password security status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <h3 className="font-medium">Demo Account Passwords</h3>
              <p className="text-sm text-muted-foreground">
                Update all demo accounts to use password: <code className="px-1 py-0.5 bg-muted rounded text-xs">admin123</code>
              </p>
            </div>
          </div>
          <Button 
            onClick={updateDemoPasswords} 
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Updating...' : 'Update Passwords'}
          </Button>
        </div>

        <div className="space-y-4">
          <h4 className="font-medium">Demo Accounts</h4>
          <div className="grid gap-3">
            {demoAccounts.map((account) => {
              const result = results.find(r => r.email === account.email);
              return (
                <div key={account.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{account.email}</span>
                      <Badge variant="secondary">{account.role}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{account.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {result && (
                      <>
                        {result.success ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-sm">Updated</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-red-600">
                            <XCircle className="h-4 w-4" />
                            <span className="text-sm">Failed</span>
                          </div>
                        )}
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDemoAccount(account.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium">Add Demo Account</h4>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              placeholder="Email"
              value={newAccount.email}
              onChange={(e) => setNewAccount({ ...newAccount, email: e.target.value })}
            />
            <Input
              placeholder="Role"
              value={newAccount.role}
              onChange={(e) => setNewAccount({ ...newAccount, role: e.target.value })}
            />
            <Input
              placeholder="Full name"
              value={newAccount.full_name}
              onChange={(e) => setNewAccount({ ...newAccount, full_name: e.target.value })}
            />
            <Input
              placeholder="Description"
              value={newAccount.description}
              onChange={(e) => setNewAccount({ ...newAccount, description: e.target.value })}
            />
          </div>
          <Button onClick={addDemoAccount} disabled={saving} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {saving ? 'Adding...' : 'Add Account'}
          </Button>
        </div>

        {results.length > 0 && (
          <div className="mt-6 p-4 bg-muted/30 rounded-lg">
            <h4 className="font-medium mb-2">Update Results</h4>
            <div className="text-sm space-y-1">
              {results.map((result, index) => (
                <div key={index} className={`flex items-center gap-2 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                  {result.success ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  <span>{result.email}: {result.success ? 'Success' : result.error}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Security Information</h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• All password changes are logged for security auditing</li>
            <li>• Users can reset their passwords using the "Forgot Password" feature</li>
            <li>• New passwords must meet security requirements (8+ chars, mixed case, numbers, symbols)</li>
            <li>• Password reset links expire after 1 hour for security</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}