import { Shield, Lock, Eye, FileText, Languages, Rocket, LogIn, UserPlus } from 'lucide-react';
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

export default function PrivacyPolicy() {
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
              <Shield className="h-8 w-8 text-slate-900" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            {t('privacyPolicy.title') || 'Privacy Policy'}
          </h1>
          <p className="text-slate-600">
            {t('privacyPolicy.lastUpdated') || 'Last Updated: January 2026'}
          </p>
        </div>

        {/* Introduction */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('privacyPolicy.introduction.title') || 'Introduction'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 leading-relaxed">
              {t('privacyPolicy.introduction.content') || 'At Nazim School Management System, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.'}
            </p>
          </CardContent>
        </Card>

        {/* Information We Collect */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#c9a44d]" />
              {t('privacyPolicy.informationWeCollect.title') || 'Information We Collect'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">{t('privacyPolicy.informationWeCollect.personal.title') || 'Personal Information'}</h3>
              <p className="text-sm text-slate-600">
                {t('privacyPolicy.informationWeCollect.personal.content') || 'We collect personal information that you provide to us, such as your name, email address, phone number, and school information when you register for our services.'}
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">{t('privacyPolicy.informationWeCollect.usage.title') || 'Usage Information'}</h3>
              <p className="text-sm text-slate-600">
                {t('privacyPolicy.informationWeCollect.usage.content') || 'We automatically collect information about how you use our platform, including pages visited, features used, and time spent on the platform.'}
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">{t('privacyPolicy.informationWeCollect.technical.title') || 'Technical Information'}</h3>
              <p className="text-sm text-slate-600">
                {t('privacyPolicy.informationWeCollect.technical.content') || 'We collect technical information such as IP address, browser type, device information, and operating system for security and performance purposes.'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* How We Use Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-[#c9a44d]" />
              {t('privacyPolicy.howWeUse.title') || 'How We Use Your Information'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-slate-600">
              <li>• {t('privacyPolicy.howWeUse.provide') || 'To provide, maintain, and improve our services'}</li>
              <li>• {t('privacyPolicy.howWeUse.communicate') || 'To communicate with you about your account and our services'}</li>
              <li>• {t('privacyPolicy.howWeUse.security') || 'To ensure the security and integrity of our platform'}</li>
              <li>• {t('privacyPolicy.howWeUse.support') || 'To provide customer support and respond to your inquiries'}</li>
              <li>• {t('privacyPolicy.howWeUse.analytics') || 'To analyze usage patterns and improve user experience'}</li>
            </ul>
          </CardContent>
        </Card>

        {/* Data Security */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-[#c9a44d]" />
              {t('privacyPolicy.dataSecurity.title') || 'Data Security'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 leading-relaxed">
              {t('privacyPolicy.dataSecurity.content') || 'We implement industry-standard security measures to protect your information, including encryption, secure data storage, and access controls. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.'}
            </p>
          </CardContent>
        </Card>

        {/* Data Retention */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('privacyPolicy.dataRetention.title') || 'Data Retention'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 leading-relaxed">
              {t('privacyPolicy.dataRetention.content') || 'We retain your personal information for as long as necessary to provide our services and comply with legal obligations. When you delete your account, we will delete or anonymize your personal information, except where we are required to retain it by law.'}
            </p>
          </CardContent>
        </Card>

        {/* Your Rights */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('privacyPolicy.yourRights.title') || 'Your Rights'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-4">
              {t('privacyPolicy.yourRights.intro') || 'You have the right to:'}
            </p>
            <ul className="space-y-2 text-slate-600">
              <li>• {t('privacyPolicy.yourRights.access') || 'Access your personal information'}</li>
              <li>• {t('privacyPolicy.yourRights.correct') || 'Correct inaccurate or incomplete information'}</li>
              <li>• {t('privacyPolicy.yourRights.delete') || 'Request deletion of your personal information'}</li>
              <li>• {t('privacyPolicy.yourRights.export') || 'Export your data in a portable format'}</li>
              <li>• {t('privacyPolicy.yourRights.object') || 'Object to processing of your personal information'}</li>
            </ul>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle>{t('privacyPolicy.contact.title') || 'Contact Us'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 leading-relaxed">
              {t('privacyPolicy.contact.content') || 'If you have any questions about this Privacy Policy or our data practices, please contact us at support@nazimapp.com or through our contact form.'}
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
