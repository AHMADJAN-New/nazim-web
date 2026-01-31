import { FileText, Scale, AlertCircle, CheckCircle, Languages, Rocket, LogIn, UserPlus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/hooks/useLanguage';
import { useIndexTranslations } from './index/translations/useIndexTranslations';

export default function TermsOfService() {
  const { t, language, setLanguage, isRTL } = useLanguage();
  const { t: tCommon } = useIndexTranslations();
  const navigate = useNavigate();

  // Language options
  const languages = [
    { code: 'en' as const, name: 'English', flag: '🇺🇸', nativeName: 'English', codeText: 'EN' },
    { code: 'ps' as const, name: 'Pashto', flag: '🇦🇫', nativeName: 'پښتو', codeText: 'PS' },
    { code: 'fa' as const, name: 'Dari', flag: '🇮🇷', nativeName: 'دری', codeText: 'FA' },
  ];

  const handleGetStarted = () => {
    navigate('/auth');
  };

  const handleRegister = () => {
    navigate('/auth');
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Top Navigation Bar - Same as Index */}
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
              <Link to="/" className="text-xl font-bold text-[#0b0b56] hidden sm:inline">
                {tCommon('hero.title')} {tCommon('hero.titleHighlight')}
              </Link>
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
                    aria-label={String(tCommon('common.selectLanguage') || 'Select Language')}
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
                aria-label={String(tCommon('nav.login') || 'Login')}
              >
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">{tCommon('nav.login')}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegister}
                className="text-[#0b0b56] border-[#0b0b56] hover:bg-[#0b0b56] hover:text-white flex items-center gap-2 flex-shrink-0"
                aria-label={String(tCommon('nav.register') || 'Register')}
              >
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">{tCommon('nav.register')}</span>
              </Button>
              <Button
                onClick={handleGetStarted}
                className="bg-gradient-to-r from-[#0b0b56] to-[#1a1a6a] hover:opacity-90 text-white flex items-center gap-2 flex-shrink-0"
                size="sm"
              >
                <Rocket className="h-4 w-4" />
                <span className="hidden sm:inline">{tCommon('nav.getStarted')}</span>
                <span className="sm:hidden">{tCommon('nav.start')}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-[#c9a44d] to-[#f0e6b3] rounded-lg flex items-center justify-center">
              <Scale className="h-8 w-8 text-slate-900" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            {t('termsOfService.title') || 'Terms of Service'}
          </h1>
          <p className="text-slate-600">
            {t('termsOfService.lastUpdated') || 'Last Updated: January 2026'}
          </p>
        </div>

        {/* Introduction */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('termsOfService.introduction.title') || 'Introduction'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 leading-relaxed">
              {t('termsOfService.introduction.content') || 'These Terms of Service ("Terms") govern your access to and use of the Nazim School Management System platform. By using our services, you agree to be bound by these Terms. Please read them carefully.'}
            </p>
          </CardContent>
        </Card>

        {/* Acceptance of Terms */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-[#c9a44d]" />
              {t('termsOfService.acceptance.title') || 'Acceptance of Terms'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 leading-relaxed">
              {t('termsOfService.acceptance.content') || 'By accessing or using our platform, you acknowledge that you have read, understood, and agree to be bound by these Terms. If you do not agree to these Terms, you may not use our services.'}
            </p>
          </CardContent>
        </Card>

        {/* Account Registration */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('termsOfService.account.title') || 'Account Registration'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-600">
              {t('termsOfService.account.intro') || 'To use our services, you must:'}
            </p>
            <ul className="space-y-2 text-slate-600">
              <li>• {t('termsOfService.account.accurate') || 'Provide accurate and complete information'}</li>
              <li>• {t('termsOfService.account.maintain') || 'Maintain the security of your account credentials'}</li>
              <li>• {t('termsOfService.account.notify') || 'Notify us immediately of any unauthorized access'}</li>
              <li>• {t('termsOfService.account.responsible') || 'Be responsible for all activities under your account'}</li>
            </ul>
          </CardContent>
        </Card>

        {/* Use of Services */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('termsOfService.use.title') || 'Use of Services'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">{t('termsOfService.use.permitted.title') || 'Permitted Use'}</h3>
              <p className="text-sm text-slate-600">
                {t('termsOfService.use.permitted.content') || 'You may use our services for lawful educational and administrative purposes only. You agree to use the platform in accordance with all applicable laws and regulations.'}
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                {t('termsOfService.use.prohibited.title') || 'Prohibited Activities'}
              </h3>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• {t('termsOfService.use.prohibited.unauthorized') || 'Unauthorized access to other accounts or systems'}</li>
                <li>• {t('termsOfService.use.prohibited.malicious') || 'Introduction of viruses, malware, or harmful code'}</li>
                <li>• {t('termsOfService.use.prohibited.interfere') || 'Interference with the platform\'s operation'}</li>
                <li>• {t('termsOfService.use.prohibited.violate') || 'Violation of any applicable laws or regulations'}</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Subscription and Payment */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('termsOfService.subscription.title') || 'Subscription and Payment'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-600">
              {t('termsOfService.subscription.content') || 'Subscription fees are billed in advance on a monthly or annual basis. All fees are non-refundable except as required by law. We reserve the right to change our pricing with 30 days notice.'}
            </p>
            <p className="text-slate-600">
              {t('termsOfService.subscription.cancellation') || 'You may cancel your subscription at any time. Cancellation will take effect at the end of your current billing period.'}
            </p>
          </CardContent>
        </Card>

        {/* Intellectual Property */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('termsOfService.intellectualProperty.title') || 'Intellectual Property'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 leading-relaxed">
              {t('termsOfService.intellectualProperty.content') || 'All content, features, and functionality of the platform are owned by Nazim School Management System and are protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, or distribute any part of the platform without our written permission.'}
            </p>
          </CardContent>
        </Card>

        {/* Limitation of Liability */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('termsOfService.liability.title') || 'Limitation of Liability'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 leading-relaxed">
              {t('termsOfService.liability.content') || 'To the maximum extent permitted by law, Nazim School Management System shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the platform. Our total liability shall not exceed the amount you paid for the services in the 12 months preceding the claim.'}
            </p>
          </CardContent>
        </Card>

        {/* Termination */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('termsOfService.termination.title') || 'Termination'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 leading-relaxed">
              {t('termsOfService.termination.content') || 'We reserve the right to suspend or terminate your account at any time for violation of these Terms or for any other reason. Upon termination, your right to use the platform will immediately cease.'}
            </p>
          </CardContent>
        </Card>

        {/* Changes to Terms */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('termsOfService.changes.title') || 'Changes to Terms'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 leading-relaxed">
              {t('termsOfService.changes.content') || 'We may modify these Terms at any time. We will notify you of any material changes by email or through the platform. Your continued use of the platform after such changes constitutes acceptance of the modified Terms.'}
            </p>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle>{t('termsOfService.contact.title') || 'Contact Us'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 leading-relaxed">
              {t('termsOfService.contact.content') || 'If you have any questions about these Terms of Service, please contact us at support@nazimapp.com or through our contact form.'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Footer - Same as Index */}
      <footer className="bg-gradient-to-b from-slate-900 to-slate-950 text-slate-200 border-t-2 border-[#c9a44d]/20">
        <div className="container mx-auto px-4 py-8 md:py-12 max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand Column */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-[#c9a44d] to-[#f0e6b3] rounded-lg flex items-center justify-center">
                  <Rocket className="h-5 w-5 text-slate-900" />
                </div>
                <span className="text-xl font-bold text-white">Nazim SMS</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                {tCommon('footer.tagline') || 'Comprehensive Islamic School Management System'}
              </p>
            </div>

            {/* Product Links */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-white">{tCommon('footer.product') || 'Product'}</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="/#features" className="hover:text-[#c9a44d] transition-colors">
                    {tCommon('landing.nav.features') || 'Features'}
                  </a>
                </li>
                <li>
                  <a href="/#pricing" className="hover:text-[#c9a44d] transition-colors">
                    {tCommon('landing.nav.pricing') || 'Pricing'}
                  </a>
                </li>
                <li>
                  <a href="/#testimonials" className="hover:text-[#c9a44d] transition-colors">
                    {tCommon('landing.nav.reviews') || 'Reviews'}
                  </a>
                </li>
              </ul>
            </div>

            {/* Company Links */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-white">{tCommon('footer.company') || 'Company'}</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/about" className="hover:text-[#c9a44d] transition-colors">
                    {tCommon('footer.aboutUs') || 'About Us'}
                  </Link>
                </li>
                <li>
                  <a href="/#contact" className="hover:text-[#c9a44d] transition-colors">
                    {tCommon('landing.nav.contact') || 'Contact'}
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal Links */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-white">{tCommon('footer.legal') || 'Legal'}</h4>
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
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t border-slate-800 mt-8 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
              <p>&copy; {new Date().getFullYear()} Nazim SMS. All rights reserved.</p>
              <div className="flex gap-6">
                <Link to="/privacy" className="hover:text-[#c9a44d] transition-colors">
                  {tCommon('footer.privacy') || 'Privacy Policy'}
                </Link>
                <Link to="/terms" className="hover:text-[#c9a44d] transition-colors">
                  {tCommon('footer.terms') || 'Terms of Service'}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
