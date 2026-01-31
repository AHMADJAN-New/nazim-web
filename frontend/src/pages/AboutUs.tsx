import { Award, GraduationCap, Users, Target, Heart, Globe, Languages, Rocket, LogIn, UserPlus } from 'lucide-react';
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

export default function AboutUs() {
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
      <div className="container mx-auto px-4 py-16 max-w-5xl">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-[#c9a44d] to-[#f0e6b3] rounded-lg flex items-center justify-center">
              <GraduationCap className="h-8 w-8 text-slate-900" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            {t('aboutUs.title') || 'About Nazim SMS'}
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            {t('aboutUs.subtitle') || 'Comprehensive Islamic School Management System'}
          </p>
        </div>

        {/* Mission Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-[#c9a44d]" />
              {t('aboutUs.mission.title') || 'Our Mission'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 leading-relaxed">
              {t('aboutUs.mission.content') || 'To provide a comprehensive, user-friendly, and culturally appropriate school management system that empowers Islamic educational institutions to manage their operations efficiently while maintaining their unique values and traditions.'}
            </p>
          </CardContent>
        </Card>

        {/* Values Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Heart className="h-5 w-5 text-[#c9a44d]" />
                {t('aboutUs.values.community.title') || 'Compassion'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 text-sm">
                {t('aboutUs.values.community.content') || 'We care deeply about the success of Islamic educational institutions and their students.'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Award className="h-5 w-5 text-[#c9a44d]" />
                {t('aboutUs.values.excellence.title') || 'Excellence'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 text-sm">
                {t('aboutUs.values.excellence.content') || 'We strive for excellence in every feature and interaction.'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Globe className="h-5 w-5 text-[#c9a44d]" />
                {t('aboutUs.values.innovation.title') || 'Inclusivity'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 text-sm">
                {t('aboutUs.values.innovation.content') || 'We support multiple languages and cultural contexts.'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Features Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t('aboutUs.whatWeOffer.title') || 'Key Features'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-[#c9a44d] mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold mb-1">{t('aboutUs.whatWeOffer.comprehensive.title') || 'Student Management'}</h4>
                  <p className="text-sm text-slate-600">
                    {t('aboutUs.whatWeOffer.comprehensive.content') || 'Comprehensive student records, admissions, and academic tracking.'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <GraduationCap className="h-5 w-5 text-[#c9a44d] mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold mb-1">{t('aboutUs.whatWeOffer.support.title') || 'Academic Management'}</h4>
                  <p className="text-sm text-slate-600">
                    {t('aboutUs.whatWeOffer.support.content') || 'Classes, subjects, timetables, and exam management.'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Target className="h-5 w-5 text-[#c9a44d] mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold mb-1">{t('aboutUs.whatWeOffer.affordable.title') || 'Attendance Tracking'}</h4>
                  <p className="text-sm text-slate-600">
                    {t('aboutUs.whatWeOffer.affordable.content') || 'Real-time attendance tracking and reporting.'}
                  </p>
                </div>
              </div>
            </div>
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
