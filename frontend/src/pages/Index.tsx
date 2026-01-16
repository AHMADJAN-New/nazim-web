import { useState, lazy, Suspense } from 'react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogIn, UserPlus, Rocket, Mail, Languages } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { showToast } from '@/lib/toast';
import { useLanguage } from '@/hooks/useLanguage';
import { useIndexTranslations } from './index/translations/useIndexTranslations';
import { HeroSection } from './index/HeroSection';
import { StatsSection } from './index/StatsSection';
import { ContactSection } from './index/ContactSection';
import { ContactModal } from './index/ContactModal';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/ui/loading';

// Lazy load heavy sections for code splitting
const LazyFeaturesGrid = lazy(() => import('./index/FeaturesGrid').then((m) => ({ default: m.FeaturesGrid })));
const LazyPricingSection = lazy(() => import('./index/PricingSection').then((m) => ({ default: m.PricingSection })));

interface ContactFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  school_name?: string;
  student_count?: number;
  message: string;
}

const Index = () => {
  const navigate = useNavigate();
  const { t: tCommon, language, setLanguage, isRTL } = useLanguage();
  const { t } = useIndexTranslations();
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactInfoModalOpen, setContactInfoModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Language options for selector (English, Dari/Farsi, and Pashto)
  const languages = [
    { code: 'en' as const, name: 'English', codeText: 'EN', nativeName: 'English' },
    { code: 'fa' as const, name: 'فارسی', codeText: 'DA', nativeName: 'فارسی' },
    { code: 'ps' as const, name: 'پښتو', codeText: 'PS', nativeName: 'پښتو' },
  ];

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

      showToast.success(t('contact.form.success'));
      reset();
      setContactDialogOpen(false);
    } catch (error: any) {
      showToast.error(error?.message || t('contact.form.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGetStarted = () => {
    setContactDialogOpen(true);
  };

  const handleRegister = () => {
    setContactDialogOpen(true);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Top Navigation Bar */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="flex items-center justify-between h-16">
            {/* Logo/Brand */}
            <div className="flex items-center gap-3">
              <img
                src="/nazim_logo.webp"
                alt="Nazim Logo"
                className="w-10 h-10 rounded-lg object-contain ring-2 ring-white/20 bg-white/20 p-1"
                loading="eager"
              />
              <span
                className="text-xl font-bold text-[#0b0b56] hidden sm:inline"
                style={{ fontFamily: isRTL ? "'Bahij Nassim', 'Noto Sans Arabic', 'Amiri', serif" : undefined }}
                dir={isRTL ? "rtl" : "ltr"}
              >
                {t('hero.title')} {t('hero.titleHighlight')}
              </span>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-3">
              {/* Language Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[#0b0b56] hover:bg-[#0b0b56]/10 flex items-center gap-2 flex-shrink-0"
                    aria-label={tCommon('common.selectLanguage')}
                  >
                    <Languages className="h-4 w-4" />
                    <span className="hidden sm:inline text-sm font-medium">
                      {languages.find(l => l.code === language)?.codeText}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isRTL ? 'start' : 'end'}>
                  <DropdownMenuLabel>{tCommon('common.selectLanguage')}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {languages.map((lang) => (
                    <DropdownMenuItem
                      key={lang.code}
                      onClick={() => setLanguage(lang.code)}
                      className={language === lang.code ? "bg-accent" : ""}
                    >
                      <span className={`font-medium ${isRTL ? "ml-2" : "mr-2"}`}>{lang.codeText}</span>
                      <span>{lang.nativeName}</span>
                      {language === lang.code && (
                        <span className={`text-xs text-muted-foreground ${isRTL ? "mr-auto" : "ml-auto"}`}>✓</span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/auth')}
                className="text-[#0b0b56] hover:bg-[#0b0b56]/10 flex items-center gap-2 flex-shrink-0"
                aria-label={t('nav.login')}
              >
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">{t('nav.login')}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegister}
                className="text-[#0b0b56] border-[#0b0b56] hover:bg-[#0b0b56] hover:text-white flex items-center gap-2 flex-shrink-0"
                aria-label={t('nav.register')}
              >
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">{t('nav.register')}</span>
              </Button>
              <Button
                onClick={handleGetStarted}
                className="bg-gradient-to-r from-[#0b0b56] to-[#1a1a6a] hover:opacity-90 text-white flex items-center gap-2 flex-shrink-0"
                size="sm"
              >
                <Rocket className="h-4 w-4" />
                <span className="hidden sm:inline">{t('nav.getStarted')}</span>
                <span className="sm:hidden">{t('nav.start')}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="w-full min-h-[calc(100vh-4rem)] bg-white">
        {/* Gold top border */}
        <div className="h-1.5 bg-gradient-to-r from-[#c9a44d] to-[#f0e6b3] rounded-t-sm" />

        {/* Content Container - Max width for large screens */}
        <div className="mx-auto max-w-7xl">
          {/* Hero Section */}
          <HeroSection />

          {/* Stats Section */}
          <StatsSection />

          {/* Divider */}
          <div className="px-6">
            <Separator className="bg-gradient-to-r from-transparent via-[#c9a44d] to-transparent opacity-70 h-0.5" />
          </div>

          {/* Features Grid - Lazy loaded */}
          <Suspense
            fallback={
              <div className="px-6 py-6">
                <div className="flex items-center justify-center min-h-[400px]">
                  <LoadingSpinner />
                </div>
              </div>
            }
          >
            <LazyFeaturesGrid />
          </Suspense>

          {/* Pricing Section - Lazy loaded */}
          <Suspense
            fallback={
              <div className="px-6 py-6">
                <div className="flex items-center justify-center min-h-[400px]">
                  <LoadingSpinner />
                </div>
              </div>
            }
          >
            <LazyPricingSection />
          </Suspense>

          {/* Contact Section */}
          <ContactSection onContactClick={() => setContactInfoModalOpen(true)} />
        </div>
      </div>

      {/* Contact Info Modal */}
      <ContactModal open={contactInfoModalOpen} onOpenChange={setContactInfoModalOpen} />

      {/* Contact Form Dialog */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-[#0b0b56]" />
              {t('contact.form.title')}
            </DialogTitle>
            <DialogDescription>
              {t('contact.form.description')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmitContact)} className="space-y-4">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name">
                  {t('contact.form.firstName')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="first_name"
                  {...register('first_name', { required: t('contact.form.firstName') + ' ' + tCommon('common.required') })}
                  placeholder={t('contact.form.firstName')}
                />
                {errors.first_name && (
                  <p className="text-sm text-destructive">{errors.first_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name">
                  {t('contact.form.lastName')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="last_name"
                  {...register('last_name', { required: t('contact.form.lastName') + ' ' + tCommon('common.required') })}
                  placeholder={t('contact.form.lastName')}
                />
                {errors.last_name && (
                  <p className="text-sm text-destructive">{errors.last_name.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                {t('contact.form.email')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                {...register('email', {
                  required: t('contact.form.email') + ' ' + tCommon('common.required'),
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: tCommon('forms.invalidEmail'),
                  },
                })}
                placeholder={t('contact.form.email')}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t('contact.form.phone')} ({t('contact.form.optional')})</Label>
              <Input
                id="phone"
                type="tel"
                {...register('phone')}
                placeholder="+93 XXX XXX XXXX"
              />
            </div>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="school_name">{t('contact.form.schoolName')} ({t('contact.form.optional')})</Label>
                <Input
                  id="school_name"
                  {...register('school_name')}
                  placeholder={t('contact.form.schoolName')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="student_count">{t('contact.form.studentCount')} ({t('contact.form.optional')})</Label>
                <Input
                  id="student_count"
                  type="number"
                  min="0"
                  {...register('student_count', {
                    valueAsNumber: true,
                  min: {
                    value: 0,
                    message: tCommon('forms.required'),
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
                {t('contact.form.message')} <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="message"
                {...register('message', {
                  required: t('contact.form.message') + ' ' + tCommon('common.required'),
                  minLength: {
                    value: 10,
                    message: tCommon('forms.required'),
                  },
                })}
                placeholder={t('contact.form.description')}
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
                {t('contact.form.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-[#0b0b56] to-[#1a1a6a] hover:opacity-90"
              >
                {isSubmitting ? t('contact.form.sending') : t('contact.form.send')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
