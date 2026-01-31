import { useState, lazy, Suspense } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  position: string;
  email: string;
  phone?: string;
  whatsapp: string;
  preferred_contact_method?: 'email' | 'phone' | 'whatsapp';
  school_name: string;
  city?: string;
  country?: string;
  student_count: number;
  number_of_schools?: number;
  staff_count?: number;
  message: string;
  referral_source?: string;
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
    { code: 'fa' as const, name: 'دری', codeText: 'DA', nativeName: 'دری' },
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
      position: '',
      email: '',
      phone: '',
      whatsapp: '',
      preferred_contact_method: 'email',
      school_name: '',
      city: '',
      country: '',
      student_count: 0,
      number_of_schools: undefined,
      staff_count: undefined,
      message: '',
      referral_source: '',
    },
  });

  const onSubmitContact = async (data: ContactFormData) => {
    setIsSubmitting(true);
    try {
      await apiClient.post('/contact', {
        first_name: data.first_name,
        last_name: data.last_name,
        position: data.position,
        email: data.email,
        phone: data.phone || null,
        whatsapp: data.whatsapp,
        preferred_contact_method: data.preferred_contact_method || 'email',
        school_name: data.school_name,
        city: data.city || null,
        country: data.country || null,
        student_count: data.student_count,
        number_of_schools: data.number_of_schools || null,
        staff_count: data.staff_count || null,
        message: data.message,
        referral_source: data.referral_source || null,
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
          <div id="features" className="scroll-mt-20">
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
          </div>

          {/* Pricing Section - Lazy loaded */}
          <div id="pricing" className="scroll-mt-20">
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
          </div>

          {/* Contact Section */}
          <ContactSection onContactClick={() => setContactInfoModalOpen(true)} />
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gradient-to-b from-slate-900 to-slate-950 text-slate-200 border-t-2 border-[#c9a44d]/20">
        <div className="container mx-auto px-4 py-8 md:py-12 max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand Column */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-[#c9a44d] to-[#f0e6b3] rounded-lg flex items-center justify-center">
                  <Rocket className="h-5 w-5 text-slate-900" />
                </div>
                <span className="text-xl font-bold text-white">Nazim </span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                {t('footer.tagline') || tCommon('landing.footer.tagline') || 'Comprehensive Islamic School Management System'}
              </p>
            </div>

            {/* Product Links */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-white">{t('footer.product') || tCommon('landing.footer.product') || 'Product'}</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="/#features"
                    className="hover:text-[#c9a44d] transition-colors cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    {t('landing.nav.features') || 'Features'}
                  </a>
                </li>
                <li>
                  <a
                    href="/#pricing"
                    className="hover:text-[#c9a44d] transition-colors cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    {t('landing.nav.pricing') || 'Pricing'}
                  </a>
                </li>
                <li>
                  <a href="/#testimonials" className="hover:text-[#c9a44d] transition-colors">
                    {t('landing.nav.reviews') || 'Reviews'}
                  </a>
                </li>
              </ul>
            </div>

            {/* Company Links */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-white">{t('footer.company') || tCommon('landing.footer.company') || 'Company'}</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/about" className="hover:text-[#c9a44d] transition-colors">
                    {tCommon('footer.aboutUs') || 'About Us'}
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    className="hover:text-[#c9a44d] transition-colors cursor-pointer text-left text-sm bg-transparent border-0 p-0 font-inherit"
                    onClick={() => setContactDialogOpen(true)}
                  >
                    {t('landing.nav.contact') || 'Contact'}
                  </button>
                </li>
                <li>
                  <Link to="/privacy" className="hover:text-[#c9a44d] transition-colors">
                    {tCommon('footer.privacyPolicy') || 'Privacy Policy'}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal Links */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-white">{t('footer.legal') || 'Legal'}</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/privacy" className="hover:text-[#c9a44d] transition-colors">
                    {tCommon('footer.privacyPolicy') || 'Privacy Policy'}
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="hover:text-[#c9a44d] transition-colors">
                    {tCommon('footer.termsOfService') || 'Terms of Service'}
                  </Link>
                </li>
                <li>
                  <Link to="/about" className="hover:text-[#c9a44d] transition-colors">
                    {tCommon('footer.aboutUs') || 'About Us'}
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t border-slate-800/50 mt-8 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
              <p>&copy; {new Date().getFullYear()} Nazim SMS. {t('footer.copyright') || tCommon('landing.footer.copyright') || 'All rights reserved.'}</p>
              <div className="flex gap-6">
                <Link to="/privacy" className="hover:text-[#c9a44d] transition-colors">
                  {tCommon('footer.privacyPolicy') || 'Privacy Policy'}
                </Link>
                <Link to="/terms" className="hover:text-[#c9a44d] transition-colors">
                  {tCommon('footer.termsOfService') || 'Terms of Service'}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>

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
              <Label htmlFor="position">
                {t('contact.form.position')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="position"
                {...register('position', {
                  required: t('contact.form.position') + ' ' + tCommon('common.required'),
                })}
                placeholder={t('contact.form.positionPlaceholder')}
              />
              {errors.position && (
                <p className="text-sm text-destructive">{errors.position.message}</p>
              )}
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

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">{t('contact.form.phone')} ({t('contact.form.optional')})</Label>
                <Input
                  id="phone"
                  type="tel"
                  {...register('phone')}
                  placeholder="+93 XXX XXX XXXX"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp">
                  {t('contact.form.whatsapp')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="whatsapp"
                  type="tel"
                  {...register('whatsapp', {
                    required: t('contact.form.whatsapp') + ' ' + tCommon('common.required'),
                  })}
                  placeholder="+93 XXX XXX XXXX"
                />
                {errors.whatsapp && (
                  <p className="text-sm text-destructive">{errors.whatsapp.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="preferred_contact_method">{t('contact.form.preferredContact')} ({t('contact.form.optional')})</Label>
              <select
                id="preferred_contact_method"
                {...register('preferred_contact_method')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="email">{t('contact.form.email')}</option>
                <option value="phone">{t('contact.form.phone')}</option>
                <option value="whatsapp">{t('contact.form.whatsapp')}</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="school_name">
                {t('contact.form.schoolName')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="school_name"
                {...register('school_name', {
                  required: t('contact.form.schoolName') + ' ' + tCommon('common.required'),
                })}
                placeholder={t('contact.form.schoolName')}
              />
              {errors.school_name && (
                <p className="text-sm text-destructive">{errors.school_name.message}</p>
              )}
            </div>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="city">{t('contact.form.city')} ({t('contact.form.optional')})</Label>
                <Input
                  id="city"
                  {...register('city')}
                  placeholder={t('contact.form.city')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">{t('contact.form.country')} ({t('contact.form.optional')})</Label>
                <Input
                  id="country"
                  {...register('country')}
                  placeholder={t('contact.form.country')}
                />
              </div>
            </div>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="student_count">
                  {t('contact.form.studentCount')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="student_count"
                  type="number"
                  min="0"
                  {...register('student_count', {
                    required: t('contact.form.studentCount') + ' ' + tCommon('common.required'),
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

              <div className="space-y-2">
                <Label htmlFor="number_of_schools">{t('contact.form.numberOfSchools')} ({t('contact.form.optional')})</Label>
                <Input
                  id="number_of_schools"
                  type="number"
                  min="0"
                  {...register('number_of_schools', {
                    valueAsNumber: true,
                    min: {
                      value: 0,
                      message: tCommon('forms.required'),
                    },
                  })}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="staff_count">{t('contact.form.staffCount')} ({t('contact.form.optional')})</Label>
                <Input
                  id="staff_count"
                  type="number"
                  min="0"
                  {...register('staff_count', {
                    valueAsNumber: true,
                    min: {
                      value: 0,
                      message: tCommon('forms.required'),
                    },
                  })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="referral_source">{t('contact.form.referralSource')} ({t('contact.form.optional')})</Label>
              <Input
                id="referral_source"
                {...register('referral_source')}
                placeholder={t('contact.form.referralSourcePlaceholder')}
              />
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
