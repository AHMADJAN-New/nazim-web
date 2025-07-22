import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Shield, Users, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

interface UpdateResult {
  email: string;
  success: boolean;
  error?: string;
}

export function PasswordManagement() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<UpdateResult[]>([]);

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

  const demoAccounts = [
    { email: 'super.admin@greenvalley.edu', role: 'Super Admin', description: 'System administrator with full access' },
    { email: 'admin@greenvalley.edu', role: 'School Admin', description: 'School administration access' },
    { email: 'teacher@greenvalley.edu', role: 'Teacher', description: 'Teaching and class management' },
    { email: 'student@greenvalley.edu', role: 'Student', description: 'Student portal access' },
    { email: 'parent@greenvalley.edu', role: 'Parent', description: 'Parent/guardian access' },
    { email: 'staff@greenvalley.edu', role: 'Staff', description: 'General staff access' },
    { email: 'pending@greenvalley.edu', role: 'Pending', description: 'Pending approval account' }
  ];

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
                <div key={account.email} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{account.email}</span>
                      <Badge variant="secondary">{account.role}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{account.description}</p>
                  </div>
                  {result && (
                    <div className="flex items-center gap-2">
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
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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