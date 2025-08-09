import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { TestTube, CheckCircle, XCircle, Play } from 'lucide-react';

interface DemoAccount {
  id: string;
  email: string;
  role: string;
}

export function DemoAccountTester() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<Array<{email: string, success: boolean, error?: string}>>([]);
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);

  useEffect(() => {
    fetchDemoAccounts();
  }, []);

  const fetchDemoAccounts = async () => {
    const { data, error } = await supabase
      .from('demo_accounts')
      .select('id, email, role')
      .order('role', { ascending: true });

    if (error) {
      console.error('Error fetching demo accounts:', error);
      toast.error('Failed to load demo accounts');
    } else {
      setDemoAccounts(data || []);
    }
  };

  const testDemoLogin = async () => {
    setTesting(true);
    setResults([]);
    const testResults = [];
    
    // First update passwords
    try {
      await supabase.functions.invoke('update-demo-passwords');
      toast.success('Demo passwords updated!');
    } catch (error) {
      toast.error('Failed to update demo passwords');
      setTesting(false);
      return;
    }

    // Then test each account
    for (const account of demoAccounts) {
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: account.email,
          password: 'admin123',
        });

        if (error) {
          testResults.push({ email: account.email, success: false, error: error.message });
        } else {
          testResults.push({ email: account.email, success: true });
          // Sign out immediately after successful test
          await supabase.auth.signOut();
        }
      } catch (error: any) {
        testResults.push({ email: account.email, success: false, error: error.message });
      }
    }
    
    setResults(testResults);
    setTesting(false);
    
    const successCount = testResults.filter(r => r.success).length;
    if (successCount === demoAccounts.length) {
      toast.success('All demo accounts can login successfully!');
    } else {
      toast.error(`${successCount}/${demoAccounts.length} accounts can login`);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Demo Account Login Tester
        </CardTitle>
        <CardDescription>
          Test login functionality for all demo accounts using password: admin123
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            <Play className="h-5 w-5 text-primary" />
            <div>
              <h3 className="font-medium">Test All Demo Accounts</h3>
              <p className="text-sm text-muted-foreground">
                This will update passwords and test login for all demo accounts
              </p>
            </div>
          </div>
          <Button 
            onClick={testDemoLogin} 
            disabled={testing}
            className="flex items-center gap-2"
          >
            <TestTube className={`h-4 w-4 ${testing ? 'animate-pulse' : ''}`} />
            {testing ? 'Testing...' : 'Run Test'}
          </Button>
        </div>

        {results.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium">Test Results</h4>
            <div className="grid gap-3">
              {demoAccounts.map((account) => {
                const result = results.find(r => r.email === account.email);
                return (
                  <div key={account.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{account.email}</span>
                      <Badge variant="secondary">{account.role}</Badge>
                    </div>
                    {result && (
                      <div className="flex items-center gap-2">
                        {result.success ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-sm">Login Success</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-red-600">
                            <XCircle className="h-4 w-4" />
                            <span className="text-sm">Login Failed</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="mt-6 p-4 bg-muted/30 rounded-lg">
            <h4 className="font-medium mb-2">Detailed Results</h4>
            <div className="text-sm space-y-1">
              {results.map((result, index) => (
                <div key={index} className={`flex items-center gap-2 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                  {result.success ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  <span>{result.email}: {result.success ? 'Login successful' : result.error}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}