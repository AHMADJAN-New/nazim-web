import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useSecureAuth } from '@/hooks/useSecureAuth';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { ForgotPasswordDialog } from '@/components/auth/ForgotPasswordDialog';
import { DemoAccountsTab } from '@/components/auth/DemoAccountsTab';

interface Organization {
  id: string;
  name: string;
  slug: string;
}

export default function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { secureSignIn, secureSignUp, validatePasswordStrength, loading: authLoading } = useSecureAuth();
  const [loading, setLoading] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
    role: 'student',
    organizationId: ''
  });
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  // Development mode: Set to true to bypass authentication
  const DEV_AUTH_BYPASS = import.meta.env.DEV && import.meta.env.VITE_DISABLE_AUTH !== 'false';

  useEffect(() => {
    // In development mode, don't redirect - allow access to auth page
    if (DEV_AUTH_BYPASS) {
      fetchOrganizations();
      return;
    }

    if (user) {
      navigate('/redirect');
    }
    fetchOrganizations();
  }, [user, navigate]);

  const fetchOrganizations = async () => {
    try {
      // Check if Supabase is accessible first
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .order('name')
        .limit(100); // Limit to prevent large queries

      if (error) {
        console.error('Error fetching organizations:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        
        // Don't throw - just log and continue with empty list
        // This allows signup to proceed even if organizations can't be fetched
        setOrganizations([]);
        
        // Only show error toast if it's a network error, not permission errors
        if (error.message?.includes('Failed to fetch') || 
            error.message?.includes('Network') ||
            error.message?.includes('fetch')) {
          toast.error('Unable to connect to server. Please ensure Supabase is running and check your connection.');
        } else if (error.code === 'PGRST301' || error.message?.includes('permission') || error.message?.includes('RLS')) {
          // Permission errors are expected for non-admin users - don't show error
          console.debug('Permission denied for organizations (this is normal for non-admin users)');
        } else {
          // Other errors - show a generic message
          console.warn('Could not fetch organizations:', error.message);
        }
        return;
      }
      
      setOrganizations(data || []);
      if (data && data.length === 0) {
        console.warn('No organizations found in database');
      }
    } catch (error: any) {
      console.error('Unexpected error fetching organizations:', error);
      logger.error('Error fetching organizations', error);
      setOrganizations([]);
      
      // Only show error for network issues
      if (error?.message?.includes('Failed to fetch') || 
          error?.message?.includes('Network') ||
          error?.message?.includes('fetch')) {
        toast.error('Network error: Unable to fetch organizations. Please check your connection and ensure Supabase is running.');
      }
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast.error('Please enter both email and password');
      return;
    }
    
    console.log('Attempting sign in for:', formData.email);
    setLoading(true);
    
    try {
      const { data, error } = await secureSignIn(formData.email, formData.password);
      
      if (error) {
        console.error('Sign in error:', error);
        console.error('Error details:', {
          message: error.message,
          status: error.status,
          name: error.name,
        });
        
        if (error.message?.includes('Invalid login credentials') || error.message?.includes('Invalid')) {
          toast.error('Invalid email or password. Please check your credentials and try again.');
        } else if (error.message === 'Account locked') {
          // Error already shown by secureSignIn
        } else {
          toast.error(error.message || 'Failed to sign in. Please check your connection and try again.');
        }
        return;
      }
      
      if (data?.user) {
        console.log('Sign in successful:', data.user.email);
        toast.success('Logged in successfully!');
        // Small delay to ensure session is set
        setTimeout(() => {
          navigate('/redirect');
        }, 100);
      } else {
        console.warn('Sign in returned no user data');
        toast.error('Sign in failed. Please try again.');
      }
    } catch (error: any) {
      console.error('Unexpected sign in error:', error);
      toast.error(error.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!formData.organizationId && formData.role !== 'super_admin') {
      toast.error('Please select an organization');
      return;
    }

    if (!formData.fullName) {
      toast.error('Please enter your full name');
      return;
    }

    if (!formData.email) {
      toast.error('Please enter your email address');
      return;
    }

    const userData = {
      full_name: formData.fullName,
      phone: formData.phone,
      role: formData.role,
      organization_id: formData.organizationId || null
    };

    setLoading(true);
    
    try {
      console.log('Attempting sign up for:', formData.email);
      
      const { data, error } = await secureSignUp(formData.email, formData.password, userData);
      
      if (error) {
        console.error('Sign up error:', error);
        console.error('Error details:', {
          message: error.message,
          status: error.status,
          name: error.name,
        });
        
        // Provide more specific error messages
        let errorMessage = error.message || 'Failed to create account';
        if (error.message?.includes('Failed to fetch') || error.message?.includes('Network')) {
          errorMessage = 'Network error: Unable to connect to server. Please check your internet connection and try again.';
        } else if (error.message?.includes('already registered') || error.message?.includes('already exists')) {
          errorMessage = 'This email is already registered. Please sign in or reset your password.';
        } else if (error.message?.includes('Invalid email')) {
          errorMessage = 'Please enter a valid email address.';
        } else if (error.message?.includes('Password')) {
          errorMessage = error.message; // Password validation errors are already user-friendly
        }
        
        toast.error(errorMessage);
        return;
      }
      
      if (data?.user) {
        console.log('Sign up successful:', data.user.email);
        if (formData.role === 'super_admin') {
          toast.success('Super Admin account created! You can now sign in.');
        } else {
          toast.success('Registration submitted! Please wait for approval from your school administrator.');
        }
        // Clear form
        setFormData({
          email: '',
          password: '',
          confirmPassword: '',
          fullName: '',
          phone: '',
          role: 'student',
          organizationId: ''
        });
      } else {
        console.warn('Sign up returned no user data');
        toast.error('Sign up failed. Please try again.');
      }
    } catch (error: any) {
      console.error('Unexpected sign up error:', error);
      toast.error(error.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            School Management System
          </CardTitle>
          <CardDescription className="text-center">
            Access your school management system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className={`grid w-full ${import.meta.env.DEV ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
              {import.meta.env.DEV && (
                <TabsTrigger value="demo">Demo Accounts</TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={authLoading}>
                  {authLoading ? 'Signing In...' : 'Sign In'}
                </Button>
                <div className="text-center">
                  <ForgotPasswordDialog>
                    <Button variant="link" type="button" className="text-sm text-muted-foreground">
                      Forgot your password?
                    </Button>
                  </ForgotPasswordDialog>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <Label htmlFor="full-name">Full Name</Label>
                  <Input
                    id="full-name"
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="teacher">Teacher</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.role !== 'super_admin' && (
                  <div>
                    <Label htmlFor="organization">Organization</Label>
                    <Select value={formData.organizationId} onValueChange={(value) => setFormData({ ...formData, organizationId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your organization" />
                      </SelectTrigger>
                      <SelectContent>
                        {organizations.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            No organizations available
                          </div>
                        ) : (
                          organizations.map((org) => (
                            <SelectItem key={org.id} value={org.id}>
                              {org.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {organizations.length === 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        No organizations found. Please contact an administrator.
                      </p>
                    )}
                  </div>
                )}
                <div>
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => {
                      const password = e.target.value;
                      setFormData({ ...formData, password });
                      setPasswordErrors(validatePasswordStrength(password));
                    }}
                    required
                  />
                  {passwordErrors.length > 0 && formData.password && (
                    <div className="mt-2 space-y-1">
                      {passwordErrors.map((error, index) => (
                        <p key={index} className="text-sm text-destructive">
                          • {error}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={authLoading || passwordErrors.length > 0}>
                  {authLoading ? 'Creating Account...' : 'Sign Up'}
                </Button>
              </form>
            </TabsContent>

            {import.meta.env.DEV && (
              <TabsContent value="demo">
                <DemoAccountsTab />
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}