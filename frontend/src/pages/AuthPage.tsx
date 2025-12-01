import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { organizationsApi, authApi } from '@/lib/api/client';
import { validatePasswordStrength } from '@/lib/utils/passwordValidation';
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
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
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

  useEffect(() => {
    if (user) {
      navigate('/redirect');
    }
    fetchOrganizations();
  }, [user, navigate]);

  const fetchOrganizations = async () => {
    try {
      // Fetch organizations from Laravel API
      const data = await organizationsApi.list();
      setOrganizations(data || []);
      
      if (!data || data.length === 0) {
        console.warn('No organizations found in database');
      }
    } catch (error: any) {
      console.error('Error fetching organizations:', error);
      logger.error('Error fetching organizations', error);
      setOrganizations([]);

      // Only show error for network issues
      if (error?.message?.includes('Failed to fetch') ||
        error?.message?.includes('Network') ||
        error?.message?.includes('fetch')) {
        toast.error('Network error: Unable to fetch organizations. Please check your connection and ensure the API server is running.');
      } else {
        // Other errors - show a generic message
        console.warn('Could not fetch organizations:', error.message);
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
    setAuthLoading(true);

    try {
      const response = await authApi.login(formData.email, formData.password);

      if (response.user && response.token) {
        console.log('Sign in successful:', response.user.email);
        console.log('Profile from login:', response.profile);
        
        // If profile doesn't have organization_id, it will be auto-assigned on backend
        // The profile in response should have the updated organization_id
        if (response.profile && !response.profile.organization_id && response.profile.role !== 'super_admin') {
          console.warn('Profile missing organization_id - backend should have assigned it');
        }
        
        toast.success('Logged in successfully!');
        // Small delay to ensure token is set, then redirect
        // The AuthProvider will reload the profile which should have organization_id
        setTimeout(() => {
          window.location.href = '/redirect';
        }, 100);
      } else {
        console.warn('Sign in returned no user data');
        toast.error('Sign in failed. Please try again.');
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      const errorMessage = error.message || 'Failed to sign in. Please check your credentials and try again.';
      
      if (errorMessage.includes('credentials') || errorMessage.includes('Invalid')) {
        toast.error('Invalid email or password. Please check your credentials and try again.');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
      setAuthLoading(false);
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

    setLoading(true);
    setAuthLoading(true);

    try {
      console.log('Attempting sign up for:', formData.email);

      const response = await authApi.register({
        email: formData.email,
        password: formData.password,
        password_confirmation: formData.confirmPassword,
        full_name: formData.fullName,
        organization_id: formData.organizationId || undefined,
      });

      if (response.user && response.token) {
        console.log('Sign up successful:', response.user.email);
        if (formData.role === 'super_admin') {
          toast.success('Super Admin account created! You can now sign in.');
        } else {
          toast.success('Registration successful! You can now sign in.');
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
        // Redirect to login tab or reload
        window.location.reload();
      } else {
        console.warn('Sign up returned no user data');
        toast.error('Sign up failed. Please try again.');
      }
    } catch (error: any) {
      console.error('Sign up error:', error);
      let errorMessage = error.message || 'Failed to create account';
      
      if (errorMessage.includes('already registered') || errorMessage.includes('already exists')) {
        errorMessage = 'This email is already registered. Please sign in or reset your password.';
      } else if (errorMessage.includes('Invalid email')) {
        errorMessage = 'Please enter a valid email address.';
      } else if (errorMessage.includes('Password')) {
        errorMessage = errorMessage; // Password validation errors are already user-friendly
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
      setAuthLoading(false);
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
                <Button type="submit" className="w-full" disabled={loading || authLoading || passwordErrors.length > 0}>
                  {loading || authLoading ? 'Creating Account...' : 'Sign Up'}
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