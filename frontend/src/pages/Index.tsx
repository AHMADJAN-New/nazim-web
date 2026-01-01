import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  GraduationCap,
  Users,
  BookOpen,
  Calendar,
  Award,
  Building,
  Calculator,
  MessageSquare,
  Shield,
  Zap,
  Globe,
  CheckCircle,
  Star,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  Clock,
  TrendingUp,
  BarChart3,
  Smartphone,
  Cloud,
  Lock,
  HeadphonesIcon
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLandingStats } from "@/hooks/useLandingStats";
import { usePlatformAdminPermissions } from "@/platform/hooks/usePlatformAdminPermissions";
import { useSubscriptionPlans, type SubscriptionPlan } from "@/hooks/useSubscription";
import { apiClient } from "@/lib/api/client";
import { useToast } from "@/hooks/use-toast";


const Index = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [isContactSubmitting, setIsContactSubmitting] = useState(false);
  const [isPlanSubmitting, setIsPlanSubmitting] = useState(false);
  const [requestedPlanId, setRequestedPlanId] = useState('');
  const { toast } = useToast();
  const { data: subscriptionPlans, isLoading: plansLoading } = useSubscriptionPlans();
  
  // CRITICAL: Only check platform admin permissions if user is authenticated
  // And only if we're in a platform admin session (prevents 403 errors)
  const isPlatformAdminSession = typeof window !== 'undefined' && 
    localStorage.getItem('is_platform_admin_session') === 'true';
  const { data: platformPermissions } = usePlatformAdminPermissions();

  useEffect(() => {
    // Redirect authenticated users to appropriate dashboard
    if (user) {
      const isOnPlatformRoute = typeof window !== 'undefined' && 
        window.location.pathname.startsWith('/platform');
      
      // CRITICAL: Check if redirect is already in progress (prevents loops)
      const redirectInProgress = typeof window !== 'undefined' && 
        sessionStorage.getItem('platform_redirect_in_progress') === 'true';
      
      if (redirectInProgress) {
        return; // Redirect already in progress, don't do anything
      }
      
      // CRITICAL: Only redirect if we're not already on the correct route
      // This prevents infinite redirect loops
      if (isOnPlatformRoute) {
        return; // Already on platform route, don't redirect
      }
      
      // If in platform admin session, check if user actually has permission
      if (isPlatformAdminSession) {
        // CRITICAL: Wait for permissions to load before checking
        // If permissions are still loading, don't redirect yet
        if (platformPermissions === undefined) {
          return; // Still loading, wait
        }
        
        const isPlatformAdmin = Array.isArray(platformPermissions) && platformPermissions.includes('subscription.admin');
        
        if (isPlatformAdmin) {
          // User has permission, redirect to platform admin
          navigate('/platform/dashboard', { replace: true });
        } else {
          // CRITICAL: User doesn't have permission, clear flag immediately and redirect to main app
          // Use hard redirect to break any React Router loops
          sessionStorage.setItem('platform_redirect_in_progress', 'true');
          localStorage.removeItem('is_platform_admin_session');
          localStorage.removeItem('platform_admin_token_backup');
          setTimeout(() => {
            sessionStorage.removeItem('platform_redirect_in_progress');
            window.location.href = '/dashboard';
          }, 50);
        }
        return;
      }
      
      // Check if user is a platform admin (only if not in platform admin session)
      // Only check if permissions are loaded
      if (platformPermissions !== undefined) {
        const isPlatformAdmin = Array.isArray(platformPermissions) && platformPermissions.includes('subscription.admin');
        
        if (isPlatformAdmin) {
          navigate('/platform/dashboard', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      }
    }
  }, [user, navigate, platformPermissions, isPlatformAdminSession]);

  const features = useMemo(() => [
    {
      icon: Users,
      title: t('landing.features.studentManagement.title') || "Student Management",
      description: t('landing.features.studentManagement.description') || "Complete student information system with admission, records, and progress tracking",
      color: "text-blue-600",
      bgFrom: "from-blue-100",
      bgTo: "to-blue-200",
    },
    {
      icon: GraduationCap,
      title: t('landing.features.academicManagement.title') || "Academic Management",
      description: t('landing.features.academicManagement.description') || "Manage classes, subjects, exams, and academic performance analytics",
      color: "text-green-600",
      bgFrom: "from-green-100",
      bgTo: "to-green-200",
    },
    {
      icon: BookOpen,
      title: t('landing.features.librarySystem.title') || "Library System",
      description: t('landing.features.librarySystem.description') || "Digital library management with book tracking and student borrowing records",
      color: "text-purple-600",
      bgFrom: "from-purple-100",
      bgTo: "to-purple-200",
    },
    {
      icon: Calendar,
      title: t('landing.features.attendanceTracking.title') || "Attendance Tracking",
      description: t('landing.features.attendanceTracking.description') || "Real-time attendance management with automated reporting and notifications",
      color: "text-orange-600",
      bgFrom: "from-orange-100",
      bgTo: "to-orange-200",
    },
    {
      icon: Calculator,
      title: t('landing.features.feeManagement.title') || "Fee Management",
      description: t('landing.features.feeManagement.description') || "Comprehensive fee collection, payment tracking, and financial reporting",
      color: "text-red-600",
      bgFrom: "from-red-100",
      bgTo: "to-red-200",
    },
    {
      icon: Building,
      title: t('landing.features.hostelManagement.title') || "Hostel Management",
      description: t('landing.features.hostelManagement.description') || "Complete hostel administration with room allocation and student management",
      color: "text-indigo-600",
      bgFrom: "from-indigo-100",
      bgTo: "to-indigo-200",
    },
    {
      icon: Award,
      title: t('landing.features.hifzProgress.title') || "Hifz Progress",
      description: t('landing.features.hifzProgress.description') || "Track Quran memorization progress with detailed analytics and reports",
      color: "text-emerald-600",
      bgFrom: "from-emerald-100",
      bgTo: "to-emerald-200",
    },
    {
      icon: MessageSquare,
      title: t('landing.features.communicationHub.title') || "Communication Hub",
      description: t('landing.features.communicationHub.description') || "Announcements, notifications, and parent-teacher communication platform",
      color: "text-pink-600",
      bgFrom: "from-pink-100",
      bgTo: "to-pink-200",
    }
  ], [t]);

  const benefits = useMemo(() => [
    {
      icon: Shield,
      title: t('landing.benefits.secureReliable.title') || "Secure & Reliable",
      description: t('landing.benefits.secureReliable.description') || "Enterprise-grade security with 99.9% uptime guarantee"
    },
    {
      icon: Zap,
      title: t('landing.benefits.lightningFast.title') || "Lightning Fast",
      description: t('landing.benefits.lightningFast.description') || "Optimized performance for instant access to all features"
    },
    {
      icon: Globe,
      title: t('landing.benefits.multiLanguage.title') || "Multi-Language",
      description: t('landing.benefits.multiLanguage.description') || "Support for English, Urdu, Arabic, and Pashto languages"
    },
    {
      icon: Smartphone,
      title: t('landing.benefits.mobileReady.title') || "Mobile Ready",
      description: t('landing.benefits.mobileReady.description') || "Responsive design works perfectly on all devices"
    },
    {
      icon: Cloud,
      title: t('landing.benefits.cloudBased.title') || "Cloud-Based",
      description: t('landing.benefits.cloudBased.description') || "Access your data anywhere, anytime from any device"
    },
    {
      icon: HeadphonesIcon,
      title: t('landing.benefits.support24x7.title') || "24/7 Support",
      description: t('landing.benefits.support24x7.description') || "Round-the-clock customer support and training assistance"
    }
  ], [t]);

  const formatCurrency = (value: number, currency: 'AFN' | 'USD') => {
    const formatted = new Intl.NumberFormat('en-US').format(value);
    return `${currency} ${formatted}`;
  };

  const buildPlanHighlights = (plan: SubscriptionPlan) => {
    const highlights: string[] = [];

    if (plan.maxSchools && plan.maxSchools > 0) {
      highlights.push(plan.maxSchools === 1 ? "1 school included" : `Up to ${plan.maxSchools} schools`);
    } else {
      highlights.push("Unlimited schools");
    }

    if (plan.trialDays && plan.trialDays > 0) {
      highlights.push(`${plan.trialDays}-day free trial`);
    }

    const currency: 'AFN' | 'USD' = plan.priceYearlyAfn > 0 ? 'AFN' : 'USD';
    const perSchoolPrice = currency === 'AFN' ? plan.perSchoolPriceAfn : plan.perSchoolPriceUsd;
    if (perSchoolPrice && perSchoolPrice > 0) {
      highlights.push(`Additional schools: ${formatCurrency(perSchoolPrice, currency)} / year`);
    }

    if (plan.features && plan.features.length > 0) {
      highlights.push(`${plan.features.length} modules included`);
    } else {
      highlights.push("Core modules included");
    }

    return highlights;
  };

  const pricingPlans = useMemo(() => {
    if (!subscriptionPlans || subscriptionPlans.length === 0) {
      return [];
    }

    return [...subscriptionPlans]
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((plan) => {
        const currency: 'AFN' | 'USD' = plan.priceYearlyAfn > 0 ? 'AFN' : 'USD';
        const priceValue = currency === 'AFN' ? plan.priceYearlyAfn : plan.priceYearlyUsd;
        const priceLabel = priceValue > 0
          ? formatCurrency(priceValue, currency)
          : (t('landing.pricing.free') || "Free");

        const popular = plan.isDefault || plan.slug === 'pro';

        return {
          id: plan.id,
          name: plan.name,
          price: priceLabel,
          period: priceValue > 0 ? (t('landing.pricing.periodYear') || "/year") : "",
          description: plan.description || (t('landing.pricing.defaultDescription') || "Flexible plan designed for modern schools."),
          highlights: buildPlanHighlights(plan),
          popular,
          color: popular ? "border-primary ring-2 ring-primary/20" : "border-gray-200",
        };
      });
  }, [subscriptionPlans, t]);

  const testimonials = [
    {
      name: "Dr. Ahmad Hassan",
      role: "Principal, Nazim",
      content: "This system has revolutionized how we manage our school. The efficiency gains are remarkable, and parents love the transparency.",
      rating: 5,
      image: "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop"
    },
    {
      name: "Fatima Khan",
      role: "Administrator, Al-Noor Academy",
      content: "The fee management and communication features have saved us countless hours. Highly recommended for any educational institution.",
      rating: 5,
      image: "https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop"
    },
    {
      name: "Muhammad Ali",
      role: "IT Director, Sunrise School",
      content: "Implementation was smooth, and the support team is exceptional. The system is intuitive and our staff adapted quickly.",
      rating: 5,
      image: "https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop"
    }
  ];

  const { data: landingStats } = useLandingStats();
  const stats = useMemo(() => [
    { number: landingStats?.students?.toLocaleString() || "0", label: t('landing.stats.studentsManaged') || "Students Managed" },
    { number: landingStats?.staff?.toLocaleString() || "0", label: t('landing.stats.staffMembers') || "Staff Members" },
    { number: "99.9%", label: t('landing.stats.uptimeGuarantee') || "Uptime Guarantee" },
    { number: "24/7", label: t('landing.stats.supportAvailable') || "Support Available" }
  ], [landingStats, t]);

  const handlePlanRequestSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isPlanSubmitting) return;
    setIsPlanSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const submission = {
      requested_plan_id: requestedPlanId || null,
      organization_name: formData.get("organizationName") as string,
      school_name: formData.get("schoolName") as string,
      school_page_url: (formData.get("schoolPageUrl") as string) || null,
      contact_name: formData.get("contactName") as string,
      contact_email: formData.get("contactEmail") as string,
      contact_phone: (formData.get("contactPhone") as string) || null,
      contact_position: (formData.get("contactPosition") as string) || null,
      number_of_schools: formData.get("numberOfSchools")
        ? Number(formData.get("numberOfSchools"))
        : null,
      student_count: formData.get("studentCount")
        ? Number(formData.get("studentCount"))
        : null,
      staff_count: formData.get("staffCount")
        ? Number(formData.get("staffCount"))
        : null,
      city: (formData.get("city") as string) || null,
      country: (formData.get("country") as string) || null,
      message: (formData.get("message") as string) || null,
    };

    try {
      await apiClient.post('/landing/plan-request', submission);
      toast({
        title: t('landing.planRequest.sent') || "Plan request submitted",
        description: t('landing.planRequest.sentDescription') || "Our team will reach out with the best option for you.",
      });
      e.currentTarget.reset();
      setRequestedPlanId('');
    } catch (error: any) {
      toast({
        title: t('landing.planRequest.failed') || "Plan request failed",
        description: error.message || t('landing.planRequest.failedDescription') || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsPlanSubmitting(false);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isContactSubmitting) return;
    setIsContactSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const submission = {
      first_name: formData.get("firstName") as string,
      last_name: formData.get("lastName") as string,
      email: formData.get("email") as string,
      phone: (formData.get("phone") as string) || null,
      school_name: formData.get("schoolName") as string,
      student_count: formData.get("studentCount")
        ? Number(formData.get("studentCount"))
        : null,
      message: formData.get("message") as string,
    };

    try {
      await apiClient.post('/landing/contact', submission);
      toast({
        title: t('landing.contact.messageSent') || "Message sent",
        description: t('landing.contact.messageSentDescription') || "We'll get back to you soon.",
      });
      e.currentTarget.reset();
    } catch (error: any) {
      toast({
        title: t('landing.contact.messageFailed') || "Failed to send message",
        description: error.message || t('landing.contact.messageFailedDescription') || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsContactSubmitting(false);
    }
  };

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">Nazim SMS</span>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <a href="#plan-request" className="text-muted-foreground hover:text-foreground transition-colors">Plan Request</a>
            <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors">Reviews</a>
            <a href="#contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact</a>
          </div>

          <div className="flex items-center space-x-4">
            <Button variant="ghost" asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
            <Button asChild>
              <Link to="/auth">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5"></div>
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6">
              Trusted by 500+ Schools Worldwide
            </Badge>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              Transform Your
              <span className="text-primary block">School Management</span>
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
              Streamline operations, enhance learning outcomes, and strengthen community connections
              with our comprehensive Islamic school management platform.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button size="lg" className="text-lg px-8 py-6" asChild>
                <Link to="/auth">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                Watch Demo
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-primary mb-2">{stat.number}</div>
                  <div className="text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Features</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to Manage Your School
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              From student admissions to graduation, our comprehensive platform
              covers every aspect of school management.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.bgFrom} ${feature.bgTo} flex items-center justify-center mb-4`}>
                    <feature.icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Why Choose Us</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Built for Modern Educational Institutions
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Experience the difference with our cutting-edge technology and dedicated support.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-start space-x-4 group">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                  <benefit.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Pricing</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose the perfect plan for your institution. All plans include core features
              with no hidden fees.
            </p>
          </div>

          {plansLoading ? (
            <div className="text-center text-muted-foreground">
              Loading plans...
            </div>
          ) : pricingPlans.length === 0 ? (
            <div className="text-center text-muted-foreground">
              No plans available right now. Please check back soon.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {pricingPlans.map((plan) => (
                <Card key={plan.id} className={`relative ${plan.color} ${plan.popular ? 'scale-105' : ''} hover:shadow-xl transition-all duration-300`}>
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground px-4 py-1">
                        Most Popular
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="text-center pb-8">
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <div className="mt-4">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground">{plan.period}</span>
                    </div>
                    <CardDescription className="mt-2">{plan.description}</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <ul className="space-y-3">
                      {plan.highlights.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center space-x-3">
                          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      className={`w-full mt-8 ${plan.popular ? 'bg-primary hover:bg-primary/90' : ''}`}
                      variant={plan.popular ? "default" : "outline"}
                      size="lg"
                      asChild
                    >
                      <Link to="/auth">
                        {plan.popular ? "Start Free Trial" : "Get Started"}
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-4">
              All plans include 30-day free trial - No setup fees - Cancel anytime
            </p>
            <Button variant="link" className="text-primary" asChild>
              <a href="#plan-request">Need a custom plan? Contact our sales team</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Plan Request Section */}
      <section id="plan-request" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Plan Request</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Tell Us About Your Organization
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Share your school details and we will recommend the best plan for your needs.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            <div className="space-y-8">
              <div>
                <h3 className="text-2xl font-bold mb-4">Get a tailored recommendation</h3>
                <p className="text-muted-foreground">
                  Our team reviews your organization details and maps the right plan, setup steps,
                  and onboarding timeline for your schools.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Right-sized pricing</h4>
                    <p className="text-muted-foreground">
                      We align the plan to your school count, students, and staffing needs.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <BarChart3 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Deployment guidance</h4>
                    <p className="text-muted-foreground">
                      Get a rollout plan, data migration guidance, and training recommendations.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Card className="p-8">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-2xl">Request a Plan</CardTitle>
                <CardDescription>
                  Provide your organization details and preferred plan. We will respond within 24 hours.
                </CardDescription>
              </CardHeader>

              <CardContent className="px-0 pb-0">
                <form onSubmit={handlePlanRequestSubmit} className="space-y-6">
                  <div>
                    <Label htmlFor="requestedPlanId">Requested Plan</Label>
                    <Select
                      value={requestedPlanId}
                      onValueChange={setRequestedPlanId}
                      disabled={!subscriptionPlans || subscriptionPlans.length === 0}
                    >
                      <SelectTrigger id="requestedPlanId">
                        <SelectValue placeholder={plansLoading ? "Loading plans..." : "Select a plan (optional)"} />
                      </SelectTrigger>
                      <SelectContent>
                        {subscriptionPlans?.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="organizationName">Organization Name</Label>
                      <Input id="organizationName" name="organizationName" placeholder="Nazim Education Group" required />
                    </div>
                    <div>
                      <Label htmlFor="schoolName">School Name</Label>
                      <Input id="schoolName" name="schoolName" placeholder="Nazim Academy" required />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="schoolPageUrl">School Website or Page</Label>
                    <Input id="schoolPageUrl" name="schoolPageUrl" placeholder="https://school.edu" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="contactName">Contact Name</Label>
                      <Input id="contactName" name="contactName" placeholder="Amina Rahman" required />
                    </div>
                    <div>
                      <Label htmlFor="contactEmail">Contact Email</Label>
                      <Input id="contactEmail" name="contactEmail" type="email" placeholder="amina@school.edu" required />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="contactPhone">Contact Phone</Label>
                      <Input id="contactPhone" name="contactPhone" type="tel" placeholder="+92-300-1234567" />
                    </div>
                    <div>
                      <Label htmlFor="contactPosition">Contact Position</Label>
                      <Input id="contactPosition" name="contactPosition" placeholder="Principal" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="numberOfSchools">Number of Schools</Label>
                      <Input id="numberOfSchools" name="numberOfSchools" type="number" min="1" placeholder="1" />
                    </div>
                    <div>
                      <Label htmlFor="studentCount">Students</Label>
                      <Input id="studentCount" name="studentCount" type="number" min="0" placeholder="500" />
                    </div>
                    <div>
                      <Label htmlFor="staffCount">Staff</Label>
                      <Input id="staffCount" name="staffCount" type="number" min="0" placeholder="60" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input id="city" name="city" placeholder="Karachi" />
                    </div>
                    <div>
                      <Label htmlFor="country">Country</Label>
                      <Input id="country" name="country" placeholder="Pakistan" />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="planMessage">Notes</Label>
                    <Textarea
                      id="planMessage"
                      name="message"
                      placeholder="Tell us about your goals, timelines, and any special requirements."
                      rows={4}
                    />
                  </div>

                  <Button type="submit" size="lg" className="w-full" disabled={isPlanSubmitting}>
                    {isPlanSubmitting ? "Submitting..." : "Request Plan"}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Testimonials</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Loved by Educators Worldwide
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              See what school administrators and teachers say about our platform.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <Card className="p-8">
              <CardContent className="text-center">
                <div className="flex justify-center mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-6 w-6 text-yellow-400 fill-current" />
                  ))}
                </div>

                <blockquote className="text-xl md:text-2xl font-medium mb-6 leading-relaxed">
                  "{testimonials[activeTestimonial].content}"
                </blockquote>

                <div className="flex items-center justify-center space-x-4">
                  <img
                    src={testimonials[activeTestimonial].image}
                    alt={testimonials[activeTestimonial].name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div className="text-left">
                    <div className="font-semibold text-lg">{testimonials[activeTestimonial].name}</div>
                    <div className="text-muted-foreground">{testimonials[activeTestimonial].role}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Testimonial indicators */}
            <div className="flex justify-center space-x-2 mt-8">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  className={`w-3 h-3 rounded-full transition-colors ${index === activeTestimonial ? 'bg-primary' : 'bg-muted'
                    }`}
                  onClick={() => setActiveTestimonial(index)}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Contact Us</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Get in Touch
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Ready to transform your school management? Our team is here to help you get started.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Contact Information */}
            <div className="space-y-8">
              <div>
                <h3 className="text-2xl font-bold mb-6">Let's Start a Conversation</h3>
                <p className="text-muted-foreground mb-8">
                  Our education technology experts are ready to discuss your school's unique needs
                  and show you how our platform can make a difference.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Phone className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold">Phone Support</div>
                    <div className="text-muted-foreground">+92-21-1234-5678</div>
                    <div className="text-sm text-muted-foreground">Mon-Fri 9AM-6PM PKT</div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Mail className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold">Email Support</div>
                    <div className="text-muted-foreground">support@nazimschool.com</div>
                    <div className="text-sm text-muted-foreground">Response within 2 hours</div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold">Office Address</div>
                    <div className="text-muted-foreground">123 Education Street</div>
                    <div className="text-muted-foreground">Karachi, Pakistan</div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold">Business Hours</div>
                    <div className="text-muted-foreground">Monday - Friday: 9:00 AM - 6:00 PM</div>
                    <div className="text-muted-foreground">Saturday: 10:00 AM - 4:00 PM</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <Card className="p-8">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-2xl">Send us a Message</CardTitle>
                <CardDescription>
                  Fill out the form below and we'll get back to you within 24 hours.
                </CardDescription>
              </CardHeader>

              <CardContent className="px-0 pb-0">
                <form onSubmit={handleContactSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input id="firstName" name="firstName" placeholder="John" required />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" name="lastName" placeholder="Doe" required />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" name="email" type="email" placeholder="john@school.edu" required />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" name="phone" type="tel" placeholder="+92-300-1234567" />
                  </div>

                  <div>
                    <Label htmlFor="schoolName">School Name</Label>
                    <Input id="schoolName" name="schoolName" placeholder="Nazim" required />
                  </div>

                  <div>
                    <Label htmlFor="studentCount">Number of Students</Label>
                    <Input id="studentCount" name="studentCount" type="number" placeholder="500" />
                  </div>

                  <div>
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      name="message"
                      placeholder="Tell us about your school's needs and how we can help..."
                      rows={4}
                      required
                    />
                  </div>

                  <Button type="submit" size="lg" className="w-full" disabled={isContactSubmitting}>
                    {isContactSubmitting ? "Sending..." : "Send Message"}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Transform Your School Management?
          </h2>
          <p className="text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Join thousands of schools that have already digitized their operations
            with our comprehensive management system.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-6" asChild>
              <Link to="/auth">
                Start Your Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
              Schedule Demo
            </Button>
          </div>

          <div className="mt-8 text-primary-foreground/60">
            <p>30-day free trial - No credit card required - Setup assistance included</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <GraduationCap className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold">Nazim SMS</span>
              </div>
              <p className="text-muted-foreground">
                Empowering educational institutions with modern technology solutions
                for better learning outcomes.
              </p>
              <div className="flex space-x-4">
                <Button variant="ghost" size="sm">Facebook</Button>
                <Button variant="ghost" size="sm">Twitter</Button>
                <Button variant="ghost" size="sm">LinkedIn</Button>
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">API Documentation</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Integrations</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Security</a></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Training Videos</a></li>
                <li><a href="#contact" className="hover:text-foreground transition-colors">Contact Support</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">System Status</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Release Notes</a></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-muted-foreground">
              Copyright 2024 Nazim School Management System. All rights reserved.
            </p>
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              <Badge variant="outline" className="flex items-center space-x-1">
                <Lock className="h-3 w-3" />
                <span>SOC 2 Compliant</span>
              </Badge>
              <Badge variant="outline" className="flex items-center space-x-1">
                <Shield className="h-3 w-3" />
                <span>GDPR Ready</span>
              </Badge>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;







