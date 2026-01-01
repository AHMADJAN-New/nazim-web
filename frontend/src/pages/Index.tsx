import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  CheckCircle2,
  Star,
  Crown,
  Building2,
  Check,
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
  HeadphonesIcon,
  Languages,
  FileText,
  CreditCard,
  Palette,
  Code,
  X,
  HelpCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { useAllFeatures } from "@/hooks/useSubscription";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLandingStats } from "@/hooks/useLandingStats";
import { usePlatformAdminPermissions } from "@/platform/hooks/usePlatformAdminPermissions";
// Contact form will be handled by Laravel API endpoint
import { useSubscriptionPlans, type SubscriptionPlan } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";


const Index = () => {
  const { t, language, setLanguage } = useLanguage();
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

  // Fetch all features from API
  const { data: allFeatures, isLoading: featuresLoading } = useAllFeatures();

  // Feature icon and color mapping
  const featureIconMap: Record<string, React.ElementType> = {
    students: Users,
    attendance: Calendar,
    classes: GraduationCap,
    pdf_reports: FileText,
    subjects: BookOpen,
    exams: Award,
    grades: TrendingUp,
    question_bank: BookOpen,
    exam_paper_generator: FileText,
    timetables: Calendar,
    graduation: GraduationCap,
    finance: Calculator,
    fees: Calculator,
    multi_currency: Globe,
    dms: FileText,
    letter_templates: FileText,
    excel_export: FileText,
    library: BookOpen,
    assets: Building2,
    events: Calendar,
    id_cards: CreditCard,
    custom_id_templates: CreditCard,
    custom_branding: Palette,
    short_courses: BookOpen,
    leave_management: Calendar,
    hostel: Building,
    multi_school: Building2,
    api_access: Code,
  };

  const featureColorMap: Record<string, { color: string; bgFrom: string; bgTo: string }> = {
    students: { color: "text-blue-600", bgFrom: "from-blue-100", bgTo: "to-blue-200" },
    attendance: { color: "text-orange-600", bgFrom: "from-orange-100", bgTo: "to-orange-200" },
    classes: { color: "text-green-600", bgFrom: "from-green-100", bgTo: "to-green-200" },
    pdf_reports: { color: "text-purple-600", bgFrom: "from-purple-100", bgTo: "to-purple-200" },
    subjects: { color: "text-indigo-600", bgFrom: "from-indigo-100", bgTo: "to-indigo-200" },
    exams: { color: "text-red-600", bgFrom: "from-red-100", bgTo: "to-red-200" },
    grades: { color: "text-emerald-600", bgFrom: "from-emerald-100", bgTo: "to-emerald-200" },
    question_bank: { color: "text-cyan-600", bgFrom: "from-cyan-100", bgTo: "to-cyan-200" },
    exam_paper_generator: { color: "text-violet-600", bgFrom: "from-violet-100", bgTo: "to-violet-200" },
    timetables: { color: "text-amber-600", bgFrom: "from-amber-100", bgTo: "to-amber-200" },
    graduation: { color: "text-teal-600", bgFrom: "from-teal-100", bgTo: "to-teal-200" },
    finance: { color: "text-green-600", bgFrom: "from-green-100", bgTo: "to-green-200" },
    fees: { color: "text-lime-600", bgFrom: "from-lime-100", bgTo: "to-lime-200" },
    multi_currency: { color: "text-yellow-600", bgFrom: "from-yellow-100", bgTo: "to-yellow-200" },
    dms: { color: "text-slate-600", bgFrom: "from-slate-100", bgTo: "to-slate-200" },
    letter_templates: { color: "text-gray-600", bgFrom: "from-gray-100", bgTo: "to-gray-200" },
    excel_export: { color: "text-zinc-600", bgFrom: "from-zinc-100", bgTo: "to-zinc-200" },
    library: { color: "text-purple-600", bgFrom: "from-purple-100", bgTo: "to-purple-200" },
    assets: { color: "text-blue-600", bgFrom: "from-blue-100", bgTo: "to-blue-200" },
    events: { color: "text-pink-600", bgFrom: "from-pink-100", bgTo: "to-pink-200" },
    id_cards: { color: "text-rose-600", bgFrom: "from-rose-100", bgTo: "to-rose-200" },
    custom_id_templates: { color: "text-fuchsia-600", bgFrom: "from-fuchsia-100", bgTo: "to-fuchsia-200" },
    custom_branding: { color: "text-indigo-600", bgFrom: "from-indigo-100", bgTo: "to-indigo-200" },
    short_courses: { color: "text-sky-600", bgFrom: "from-sky-100", bgTo: "to-sky-200" },
    leave_management: { color: "text-orange-600", bgFrom: "from-orange-100", bgTo: "to-orange-200" },
    hostel: { color: "text-indigo-600", bgFrom: "from-indigo-100", bgTo: "to-indigo-200" },
    multi_school: { color: "text-blue-600", bgFrom: "from-blue-100", bgTo: "to-blue-200" },
    api_access: { color: "text-violet-600", bgFrom: "from-violet-100", bgTo: "to-violet-200" },
  };

  const features = useMemo(() => {
    if (!allFeatures || allFeatures.length === 0) {
      // Fallback to default features if API fails
      return [
        {
          icon: Users,
          title: t('landing.features.studentManagement.title') || "Student Management",
          description: t('landing.features.studentManagement.description') || "Complete student information system with admission, records, and progress tracking",
          color: "text-blue-600",
          bgFrom: "from-blue-100",
          bgTo: "to-blue-200",
        },
      ];
    }

    return allFeatures.map((feature) => {
      const Icon = featureIconMap[feature.feature_key] || BookOpen;
      const colors = featureColorMap[feature.feature_key] || { color: "text-gray-600", bgFrom: "from-gray-100", bgTo: "to-gray-200" };
      
      // Get translation key for feature
      const translationKey = `landing.features.${feature.feature_key}`;
      const title = t(`${translationKey}.title`) || feature.name;
      const description = t(`${translationKey}.description`) || feature.description || feature.name;

      return {
        icon: Icon,
        title,
        description,
        color: colors.color,
        bgFrom: colors.bgFrom,
        bgTo: colors.bgTo,
        category: feature.category,
      };
    });
  }, [allFeatures, t]);

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

  // Create feature comparison data
  const featureComparison = useMemo(() => {
    if (!allFeatures || !pricingPlans || pricingPlans.length === 0) return [];

    // Get all unique features from all plans
    const allFeatureKeys = new Set<string>();
    pricingPlans.forEach(plan => {
      if (plan.featureKeys) {
        plan.featureKeys.forEach(key => allFeatureKeys.add(key));
      }
    });

    // Create comparison rows
    return Array.from(allFeatureKeys).map(featureKey => {
      const feature = allFeatures.find(f => f.feature_key === featureKey);
      const translationKey = `landing.features.${featureKey}`;
      const featureName = t(`${translationKey}.title`) || feature?.name || featureKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

      return {
        key: featureKey,
        name: featureName,
        category: feature?.category || 'other',
        plans: pricingPlans.map(plan => ({
          planSlug: plan.slug,
          planName: plan.name,
          hasFeature: plan.featureKeys?.includes(featureKey) || false,
        })),
      };
    }).sort((a, b) => {
      // Sort by category, then by name
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.name.localeCompare(b.name);
    });
  }, [allFeatures, pricingPlans, t]);

  // Fetch testimonials from API
  const { data: testimonialsData } = useQuery({
    queryKey: ['testimonials'],
    queryFn: async () => {
      const response = await apiClient.request<{ data: Array<{
        id: string;
        name: string;
        role: string;
        organization?: string | null;
        content: string;
        image_url?: string | null;
        rating: number;
      }> }>('/testimonials', { method: 'GET' });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const testimonials = useMemo(() => {
    if (!testimonialsData || testimonialsData.length === 0) {
      // Fallback testimonials if API fails or no testimonials
      return [
        {
          id: '1',
          name: "Dr. Ahmad Hassan",
          role: "Principal",
          organization: "Nazim School",
          content: "This system has revolutionized how we manage our school. The efficiency gains are remarkable, and parents love the transparency.",
          rating: 5,
          image_url: "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop"
        },
      ];
    }
    return testimonialsData;
  }, [testimonialsData]);

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
    <div className="min-h-screen bg-background w-full overflow-x-hidden">
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
            {/* Language Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="hidden sm:flex">
                  <Languages className="h-4 w-4" />
                  <span className="ml-2 text-sm">
                    {languages.find(l => l.code === language)?.flag}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t('common.selectLanguage') || 'Select Language'}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {languages.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={language === lang.code ? "bg-accent" : ""}
                  >
                    <span className="mr-2">{lang.flag}</span>
                    <span>{lang.nativeName}</span>
                    {language === lang.code && (
                      <span className="ml-auto text-xs text-muted-foreground">✓</span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" asChild>
              <Link to="/auth">{t('landing.nav.signIn') || 'Sign In'}</Link>
            </Button>
            <Button asChild>
              <Link to="/auth">{t('landing.nav.getStarted') || 'Get Started'}</Link>
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
              {t('landing.hero.badge') || '🚀 Trusted by 500+ Schools Worldwide'}
              Trusted by 500+ Schools Worldwide
            </Badge>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              {t('landing.hero.title') || 'Transform Your'}
              <span className="text-primary block">{t('landing.hero.titleHighlight') || 'School Management'}</span>
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
              {t('landing.hero.subtitle') || 'Streamline operations, enhance learning outcomes, and strengthen community connections with our comprehensive Islamic school management platform.'}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button size="lg" className="text-lg px-8 py-6" asChild>
                <Link to="/auth">
                  {t('landing.hero.startFreeTrial') || 'Start Free Trial'}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                {t('landing.hero.watchDemo') || 'Watch Demo'}
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
            <Badge variant="outline" className="mb-4">{t('landing.sections.features.badge') || 'Features'}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t('landing.sections.features.title') || 'Everything You Need to Manage Your School'}
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('landing.sections.features.subtitle') || 'From student admissions to graduation, our comprehensive platform covers every aspect of school management.'}
            </p>
          </div>

          {featuresLoading ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-lg border bg-muted animate-pulse">
                  <div className="w-10 h-10 rounded-lg bg-muted-foreground/20"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted-foreground/20 rounded w-3/4"></div>
                    <div className="h-3 bg-muted-foreground/20 rounded w-full"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto">
              {features.map((feature, index) => (
                <div
                  key={feature.title || index}
                  className="flex items-start gap-3 p-4 rounded-lg border bg-green-50 border-green-200 hover:shadow-md transition-all duration-300"
                >
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${feature.bgFrom} ${feature.bgTo} flex items-center justify-center flex-shrink-0`}>
                    <feature.icon className={`h-5 w-5 ${feature.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium mb-1">{feature.title}</div>
                    <div className="text-sm text-muted-foreground">{feature.description}</div>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">{t('landing.sections.benefits.badge') || 'Why Choose Us'}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t('landing.sections.benefits.title') || 'Built for Modern Educational Institutions'}
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('landing.sections.benefits.subtitle') || 'Experience the difference with our cutting-edge technology and dedicated support.'}
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
            <Badge variant="outline" className="mb-4">{t('landing.sections.pricing.badge') || 'Pricing'}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t('landing.sections.pricing.title') || 'Simple, Transparent Pricing'}
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('landing.sections.pricing.subtitle') || 'Choose the perfect plan for your institution. All plans include core features with no hidden fees.'}
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
              {t('landing.sections.pricing.allPlansNote') || 'All plans include 30-day free trial • No setup fees • Cancel anytime'}
            </p>
            <Button variant="link" className="text-primary" asChild>
              <a href="#plan-request">{t('landing.sections.pricing.customPlanLink') || 'Need a custom plan? Contact our sales team →'}</a>
            </Button>
          </div>

          {/* Feature Comparison Table */}
          {featureComparison.length > 0 && pricingPlans.length > 0 && (
            <div className="mt-20">
              <div className="text-center mb-8">
                <h3 className="text-2xl md:text-3xl font-bold mb-2">
                  {t('landing.sections.pricing.comparisonTitle') || 'Compare Plans & Features'}
                </h3>
                <p className="text-muted-foreground">
                  {t('landing.sections.pricing.comparisonSubtitle') || 'See which features are included in each plan'}
                </p>
              </div>

              <div className="overflow-x-auto">
                <Card className="border-2">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold min-w-[250px] sticky left-0 bg-background z-10">
                          {t('landing.sections.pricing.feature') || 'Feature'}
                        </TableHead>
                        {pricingPlans.map((plan) => (
                          <TableHead key={plan.id || plan.slug} className="text-center min-w-[150px]">
                            <div className="flex flex-col items-center gap-1">
                              <div className="flex items-center gap-2">
                                {plan.popular && (
                                  <Badge variant="secondary" className="text-xs">
                                    {t('landing.sections.pricing.mostPopular') || 'Popular'}
                                  </Badge>
                                )}
                                <span className="font-semibold">{plan.name}</span>
                              </div>
                              <span className="text-sm text-muted-foreground">{plan.price}{plan.period}</span>
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {featureComparison.map((feature, index) => {
                        const currentCategory = feature.category;
                        const prevCategory = index > 0 ? featureComparison[index - 1].category : null;
                        const showCategoryHeader = currentCategory !== prevCategory;

                        return (
                          <React.Fragment key={feature.key}>
                            {showCategoryHeader && (
                              <TableRow className="bg-muted/30">
                                <TableCell 
                                  colSpan={pricingPlans.length + 1} 
                                  className="font-bold text-primary uppercase text-sm py-3"
                                >
                                  {currentCategory.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </TableCell>
                              </TableRow>
                            )}
                            <TableRow className="hover:bg-muted/50 transition-colors">
                              <TableCell className="font-medium sticky left-0 bg-background z-10 border-r">
                                {feature.name}
                              </TableCell>
                              {feature.plans.map((planInfo) => (
                                <TableCell key={planInfo.planSlug} className="text-center">
                                  {planInfo.hasFeature ? (
                                    <div className="flex justify-center">
                                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                                    </div>
                                  ) : (
                                    <div className="flex justify-center">
                                      <X className="h-5 w-5 text-muted-foreground/30" />
                                    </div>
                                  )}
                                </TableCell>
                              ))}
                            </TableRow>
                          </React.Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Card>
              </div>
            </div>
          )}
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
      <section id="testimonials" className="py-20 bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">{t('landing.sections.testimonials.badge') || 'Testimonials'}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t('landing.sections.testimonials.title') || 'Loved by Educators Worldwide'}
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('landing.sections.testimonials.subtitle') || 'See what school administrators and teachers say about our platform.'}
            </p>
          </div>

          {testimonials.length > 0 ? (
            <div className="max-w-6xl mx-auto">
              {/* Desktop: Grid layout */}
              <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {testimonials.slice(0, 6).map((testimonial, index) => (
                  <Card key={testimonial.id || index} className="flex flex-col hover:shadow-lg transition-all duration-300">
                    <CardContent className="p-6 flex-1 flex flex-col">
                      <div className="flex justify-center mb-4">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < testimonial.rating
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>

                      <blockquote className="text-sm md:text-base font-medium mb-4 leading-relaxed flex-1">
                        "{testimonial.content}"
                      </blockquote>

                      <div className="flex items-center gap-3 mt-auto pt-4 border-t">
                        {testimonial.image_url && (
                          <img
                            src={testimonial.image_url}
                            alt={testimonial.name}
                            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm truncate">{testimonial.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {testimonial.role}
                            {testimonial.organization && `, ${testimonial.organization}`}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Mobile: Carousel */}
              <div className="md:hidden">
                <Card className="p-6">
                  <CardContent className="text-center">
                    <div className="flex justify-center mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-5 w-5 ${
                            i < testimonials[activeTestimonial]?.rating
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>

                    <blockquote className="text-lg font-medium mb-6 leading-relaxed">
                      "{testimonials[activeTestimonial]?.content}"
                    </blockquote>

                    <div className="flex items-center justify-center gap-3">
                      {testimonials[activeTestimonial]?.image_url && (
                        <img
                          src={testimonials[activeTestimonial].image_url}
                          alt={testimonials[activeTestimonial].name}
                          className="w-14 h-14 rounded-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      )}
                      <div className="text-left">
                        <div className="font-semibold">{testimonials[activeTestimonial]?.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {testimonials[activeTestimonial]?.role}
                          {testimonials[activeTestimonial]?.organization && `, ${testimonials[activeTestimonial].organization}`}
                        </div>
                      </div>
                    </div>

                    {testimonials.length > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-6">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveTestimonial((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1))}
                        >
                          <ArrowRight className="h-4 w-4 rotate-180" />
                        </Button>
                        <div className="flex gap-1">
                          {testimonials.map((_, i) => (
                            <button
                              key={i}
                              onClick={() => setActiveTestimonial(i)}
                              className={`h-2 rounded-full transition-all ${
                                i === activeTestimonial ? 'w-8 bg-primary' : 'w-2 bg-muted-foreground/30'
                              }`}
                            />
                          ))}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveTestimonial((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1))}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No testimonials available at the moment.</p>
            </div>
          )}
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">{t('landing.sections.contact.badge') || 'Contact Us'}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t('landing.sections.contact.title') || 'Get in Touch'}
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('landing.sections.contact.subtitle') || 'Ready to transform your school management? Our team is here to help you get started.'}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Contact Information */}
            <div className="space-y-8">
              <div>
                <h3 className="text-2xl font-bold mb-6">{t('landing.sections.contact.letsStartConversation') || "Let's Start a Conversation"}</h3>
                <p className="text-muted-foreground mb-8">
                  {t('landing.sections.contact.conversationDescription') || "Our education technology experts are ready to discuss your school's unique needs and show you how our platform can make a difference."}
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Phone className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold">{t('landing.sections.contact.phoneSupport') || 'Phone Support'}</div>
                    <a href="tel:+93787779988" className="text-muted-foreground hover:text-primary transition-colors">0787779988</a>
                    <div className="text-sm text-muted-foreground">Mon-Fri 9AM-6PM AFT</div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <MessageSquare className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold">{t('landing.sections.contact.whatsappSupport') || 'WhatsApp Support'}</div>
                    <a href="https://wa.me/93787779988" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">0787779988</a>
                    <div className="text-sm text-muted-foreground">Available 24/7</div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Mail className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold">{t('landing.sections.contact.emailSupport') || 'Email Support'}</div>
                    <a href="mailto:support@nazimapp.com" className="text-muted-foreground hover:text-primary transition-colors">support@nazimapp.com</a>
                    <div className="text-sm text-muted-foreground">Response within 2 hours</div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold">{t('landing.sections.contact.officeAddress') || 'Office Address'}</div>
                    <div className="text-muted-foreground">Kabul, Afghanistan</div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold">{t('landing.sections.contact.businessHours') || 'Business Hours'}</div>
                    <div className="text-muted-foreground">Monday - Friday: 9:00 AM - 6:00 PM</div>
                    <div className="text-muted-foreground">Saturday: 10:00 AM - 4:00 PM</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <Card className="p-8">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-2xl">{t('landing.sections.contact.sendMessage') || 'Send us a Message'}</CardTitle>
                <CardDescription>
                  {t('landing.sections.contact.formDescription') || "Fill out the form below and we'll get back to you within 24 hours."}
                </CardDescription>
              </CardHeader>

              <CardContent className="px-0 pb-0">
                <form onSubmit={handleContactSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">{t('landing.sections.contact.firstName') || 'First Name'}</Label>
                      <Input id="firstName" name="firstName" placeholder="John" required />
                    </div>
                    <div>
                      <Label htmlFor="lastName">{t('landing.sections.contact.lastName') || 'Last Name'}</Label>
                      <Input id="lastName" name="lastName" placeholder="Doe" required />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">{t('landing.sections.contact.emailAddress') || 'Email Address'}</Label>
                    <Input id="email" name="email" type="email" placeholder="john@school.edu" required />
                  </div>

                  <div>
                    <Label htmlFor="phone">{t('landing.sections.contact.phoneNumber') || 'Phone Number'}</Label>
                    <Input id="phone" name="phone" type="tel" placeholder="+92-300-1234567" />
                  </div>

                  <div>
                    <Label htmlFor="schoolName">{t('landing.sections.contact.schoolName') || 'School Name'}</Label>
                    <Input id="schoolName" name="schoolName" placeholder="Nazim" required />
                  </div>

                  <div>
                    <Label htmlFor="studentCount">{t('landing.sections.contact.numberOfStudents') || 'Number of Students'}</Label>
                    <Input id="studentCount" name="studentCount" type="number" placeholder="500" />
                  </div>

                  <div>
                    <Label htmlFor="message">{t('landing.sections.contact.message') || 'Message'}</Label>
                    <Textarea
                      id="message"
                      name="message"
                      placeholder="Tell us about your school's needs and how we can help..."
                      rows={4}
                      required
                    />
                  </div>

                  <Button type="submit" size="lg" className="w-full" disabled={isContactSubmitting}>
                    {isContactSubmitting ? (t('landing.sections.contact.sending') || "Sending...") : (t('landing.sections.contact.sendMessageButton') || 'Send Message')}
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
            {t('landing.sections.cta.title') || 'Ready to Transform Your School Management?'}
          </h2>
          <p className="text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            {t('landing.sections.cta.subtitle') || 'Join thousands of schools that have already digitized their operations with our comprehensive management system.'}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-6" asChild>
              <Link to="/auth">
                {t('landing.sections.cta.startFreeTrial') || 'Start Your Free Trial'}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
              {t('landing.sections.cta.scheduleDemo') || 'Schedule Demo'}
            </Button>
          </div>

Claude/fix notification system w0 z hqClaude/fix notification system w0 z hqClaude/fix notification system w0 z hq          <div className="mt-Claude/fix notification system w0 z hqClaude/fix notification system w0 z hqClaude/fix notification system w0 z hq8 text-primary-foreground/60">
            <p>30-day free trial - Claude/fix notification system w0 z hq credit card required - Setup assistance included</p>
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
                {t('landing.footer.tagline') || 'Empowering educational institutions with modern technology solutions for better learning outcomes.'}
              </p>
              <div className="flex space-x-4">
                <Button variant="ghost" size="sm">Facebook</Button>
                <Button variant="ghost" size="sm">Twitter</Button>
                <Button variant="ghost" size="sm">LinkedIn</Button>
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold mb-4">{t('landing.footer.product') || 'Product'}</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">{t('landing.footer.features') || 'Features'}</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">{t('landing.footer.pricing') || 'Pricing'}</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">{t('landing.footer.security') || 'Security'}</a></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="font-semibold mb-4">{t('landing.footer.support') || 'Support'}</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  <Link 
                    to="/help-center" 
                    className="flex items-center gap-1.5 hover:text-foreground transition-colors group"
                  >
                    <HelpCircle className="h-3.5 w-3.5 group-hover:text-primary transition-colors" />
                    <span>{t('landing.footer.helpCenter') || 'Help Center'}</span>
                  </Link>
                </li>
                <li><a href="#" className="hover:text-foreground transition-colors">{t('landing.footer.trainingVideos') || 'Training Videos'}</a></li>
                <li><a href="#contact" className="hover:text-foreground transition-colors">{t('landing.footer.contactSupport') || 'Contact Support'}</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">{t('landing.footer.systemStatus') || 'System Status'}</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">{t('landing.footer.releaseNotes') || 'Release Notes'}</a></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold mb-4">{t('landing.footer.company') || 'Company'}</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link to="/about" className="hover:text-foreground transition-colors">{t('landing.footer.aboutUs') || 'About Us'}</Link></li>
                <li><a href="#" className="hover:text-foreground transition-colors">{t('landing.footer.careers') || 'Careers'}</a></li>
                <li><Link to="/privacy" className="hover:text-foreground transition-colors">{t('landing.footer.privacyPolicy') || 'Privacy Policy'}</Link></li>
                <li><Link to="/terms" className="hover:text-foreground transition-colors">{t('landing.footer.termsOfService') || 'Terms of Service'}</Link></li>
                <li><a href="#" className="hover:text-foreground transition-colors">{t('landing.footer.cookiePolicy') || 'Cookie Policy'}</a></li>
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







