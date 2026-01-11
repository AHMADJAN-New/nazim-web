import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LogIn, UserPlus, Rocket, Mail } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { showToast } from '@/lib/toast';

interface ContactFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  school_name?: string;
  student_count?: number;
  message: string;
}

/**
 * Temporary Index page - displays the Nazim features HTML file
 * This will be replaced with the proper Index page when it's completed
 */
const Index = () => {
  const navigate = useNavigate();
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormData>({
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      school_name: '',
      student_count: undefined,
      message: '',
    },
  });

  const onSubmitContact = async (data: ContactFormData) => {
    setIsSubmitting(true);
    try {
      await apiClient.post('/contact', {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone || null,
        school_name: data.school_name || null,
        student_count: data.student_count || null,
        message: data.message,
      });

      showToast.success('Thank you for your message. We will get back to you soon.');
      reset();
      setContactDialogOpen(false);
    } catch (error: any) {
      showToast.error(error?.message || 'Failed to submit contact form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGetStarted = () => {
    setContactDialogOpen(true);
  };

  const handleRegister = () => {
    // Register also shows contact form as requested
    setContactDialogOpen(true);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Top Navigation Bar */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo/Brand */}
            <div className="flex items-center gap-3">
              <img
                src="/nazim_logo.jpg"
                alt="Nazim Logo"
                className="w-10 h-10 rounded-lg object-contain ring-2 ring-white/20 bg-white/20 p-1"
              />
              <span 
                className="text-xl font-bold text-[#0b0b56] hidden sm:inline"
                style={{ fontFamily: "'Bahij Nassim', 'Noto Sans Arabic', 'Amiri', serif" }}
              >
                ناظم – د دیني مدارسو د اداري چارو د مدیریت سیستم
              </span>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/auth')}
                className="text-[#0b0b56] hover:bg-[#0b0b56]/10 hidden sm:flex items-center gap-2"
              >
                <LogIn className="h-4 w-4" />
                <span>Login</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegister}
                className="text-[#0b0b56] border-[#0b0b56] hover:bg-[#0b0b56] hover:text-white hidden sm:flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                <span>Register</span>
              </Button>
              <Button
                onClick={handleGetStarted}
                className="bg-gradient-to-r from-[#0b0b56] to-[#1a1a6a] hover:opacity-90 text-white flex items-center gap-2"
                size="sm"
              >
                <Rocket className="h-4 w-4" />
                <span className="hidden sm:inline">Get Started</span>
                <span className="sm:hidden">Start</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Features HTML Content */}
      <div style={{ width: '100%', minHeight: 'calc(100vh - 4rem)', margin: 0, padding: 0, overflow: 'auto' }}>
        <iframe
          src="/nazim-features.html"
          style={{
            width: '100%',
            minHeight: 'calc(100vh - 4rem)',
            border: 'none',
            margin: 0,
            padding: 0,
            display: 'block',
          }}
          title="Nazim Features"
        />
      </div>

      {/* Contact Form Dialog */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-[#0b0b56]" />
              Contact Us
            </DialogTitle>
            <DialogDescription>
              Fill out the form below and we'll get back to you as soon as possible.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmitContact)} className="space-y-4">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="first_name"
                  {...register('first_name', { required: 'First name is required' })}
                  placeholder="Enter your first name"
                />
                {errors.first_name && (
                  <p className="text-sm text-destructive">{errors.first_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="last_name"
                  {...register('last_name', { required: 'Last name is required' })}
                  placeholder="Enter your last name"
                />
                {errors.last_name && (
                  <p className="text-sm text-destructive">{errors.last_name.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
                placeholder="your.email@example.com"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input
                id="phone"
                type="tel"
                {...register('phone')}
                placeholder="+93 XXX XXX XXXX"
              />
            </div>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="school_name">School Name (Optional)</Label>
                <Input
                  id="school_name"
                  {...register('school_name')}
                  placeholder="Your school name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="student_count">Number of Students (Optional)</Label>
                <Input
                  id="student_count"
                  type="number"
                  min="0"
                  {...register('student_count', {
                    valueAsNumber: true,
                    min: {
                      value: 0,
                      message: 'Student count must be 0 or greater',
                    },
                  })}
                  placeholder="0"
                />
                {errors.student_count && (
                  <p className="text-sm text-destructive">{errors.student_count.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">
                Message <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="message"
                {...register('message', {
                  required: 'Message is required',
                  minLength: {
                    value: 10,
                    message: 'Message must be at least 10 characters',
                  },
                })}
                placeholder="Tell us how we can help you..."
                rows={5}
                className="resize-none"
              />
              {errors.message && (
                <p className="text-sm text-destructive">{errors.message.message}</p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setContactDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-[#0b0b56] to-[#1a1a6a] hover:opacity-90"
              >
                {isSubmitting ? 'Submitting...' : 'Send Message'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
