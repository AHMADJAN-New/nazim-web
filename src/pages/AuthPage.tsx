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

interface School {
  id: string;
  name: string;
  code: string;
}

export default function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { secureSignIn, secureSignUp, validatePasswordStrength, loading: authLoading } = useSecureAuth();
  const [loading, setLoading] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
    role: 'student',
    schoolId: ''
  });
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      navigate('/redirect');
    }
    fetchSchools();
  }, [user, navigate]);

  const fetchSchools = async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setSchools(data || []);
    } catch (error) {
      logger.error('Error fetching schools', error);
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

    if (!formData.schoolId && formData.role !== 'super_admin') {
      toast.error('Please select a school');
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
      school_id: formData.schoolId
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
        toast.error(error.message || 'Failed to create account. Please check your connection and try again.');
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
          schoolId: ''
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
                    <Label htmlFor="school">School</Label>
                    <Select value={formData.schoolId} onValueChange={(value) => setFormData({ ...formData, schoolId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your school" />
                      </SelectTrigger>
                      <SelectContent>
                        {schools.map((school) => (
                          <SelectItem key={school.id} value={school.id}>
                            {school.name} ({school.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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