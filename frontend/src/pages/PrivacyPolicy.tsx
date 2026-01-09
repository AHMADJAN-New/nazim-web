import { Shield, Lock, Eye, FileText, GraduationCap, Languages, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

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

export default function PrivacyPolicy() {
  const { t, language, setLanguage } = useLanguage();

  // Language options
  const languages = [
    { code: 'en' as const, name: 'English', flag: '🇺🇸', nativeName: 'English' },
    { code: 'ps' as const, name: 'Pashto', flag: '🇦🇫', nativeName: 'پښتو' },
    { code: 'fa' as const, name: 'Farsi', flag: '🇮🇷', nativeName: 'فارسی' },
    { code: 'ar' as const, name: 'Arabic', flag: '🇸🇦', nativeName: 'العربية' },
  ];

  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">Nazim SMS</span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <Link to="/#features" className="text-muted-foreground hover:text-foreground transition-colors">
              {t('landing.nav.features') || 'Features'}
            </Link>
            <Link to="/#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
              {t('landing.nav.pricing') || 'Pricing'}
            </Link>
            <Link to="/#testimonials" className="text-muted-foreground hover:text-foreground transition-colors">
              {t('landing.nav.reviews') || 'Reviews'}
            </Link>
            <Link to="/#contact" className="text-muted-foreground hover:text-foreground transition-colors">
              {t('landing.nav.contact') || 'Contact'}
            </Link>
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

      {/* Content */}
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center">
              <Shield className="h-10 w-10 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {t('privacyPolicy.title') || 'Privacy Policy'}
          </h1>
          <p className="text-muted-foreground">
            {t('privacyPolicy.lastUpdated') || 'Last Updated: January 2026'}
          </p>
        </div>

        {/* Introduction */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('privacyPolicy.introduction.title') || 'Introduction'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
              {t('privacyPolicy.introduction.content') || 'At Nazim School Management System, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.'}
            </p>
          </CardContent>
        </Card>

        {/* Information We Collect */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t('privacyPolicy.informationWeCollect.title') || 'Information We Collect'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">{t('privacyPolicy.informationWeCollect.personal.title') || 'Personal Information'}</h3>
              <p className="text-sm text-muted-foreground">
                {t('privacyPolicy.informationWeCollect.personal.content') || 'We collect personal information that you provide to us, such as your name, email address, phone number, and school information when you register for our services.'}
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">{t('privacyPolicy.informationWeCollect.usage.title') || 'Usage Information'}</h3>
              <p className="text-sm text-muted-foreground">
                {t('privacyPolicy.informationWeCollect.usage.content') || 'We automatically collect information about how you use our platform, including pages visited, features used, and time spent on the platform.'}
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">{t('privacyPolicy.informationWeCollect.technical.title') || 'Technical Information'}</h3>
              <p className="text-sm text-muted-foreground">
                {t('privacyPolicy.informationWeCollect.technical.content') || 'We collect technical information such as IP address, browser type, device information, and operating system for security and performance purposes.'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* How We Use Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              {t('privacyPolicy.howWeUse.title') || 'How We Use Your Information'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-muted-foreground">
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
              <Lock className="h-5 w-5" />
              {t('privacyPolicy.dataSecurity.title') || 'Data Security'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
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
            <p className="text-muted-foreground leading-relaxed">
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
            <p className="text-muted-foreground mb-4">
              {t('privacyPolicy.yourRights.intro') || 'You have the right to:'}
            </p>
            <ul className="space-y-2 text-muted-foreground">
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
            <p className="text-muted-foreground leading-relaxed">
              {t('privacyPolicy.contact.content') || 'If you have any questions about this Privacy Policy or our data practices, please contact us at support@nazimapp.com or through our contact form.'}
            </p>
          </CardContent>
        </Card>
      </div>

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
                {t('footer.tagline') || 'Empowering educational institutions with modern technology solutions for better learning outcomes.'}
              </p>
              <div className="flex space-x-4">
                <Button variant="ghost" size="sm">Facebook</Button>
                <Button variant="ghost" size="sm">Twitter</Button>
                <Button variant="ghost" size="sm">LinkedIn</Button>
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold mb-4">{t('footer.product') || 'Product'}</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">{t('footer.features') || 'Features'}</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">{t('footer.pricing') || 'Pricing'}</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">{t('footer.security') || 'Security'}</a></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="font-semibold mb-4">{t('footer.support') || 'Support'}</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">{t('footer.helpCenter') || 'Help Center'}</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">{t('footer.trainingVideos') || 'Training Videos'}</a></li>
                <li><a href="#contact" className="hover:text-foreground transition-colors">{t('footer.contactSupport') || 'Contact Support'}</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">{t('footer.systemStatus') || 'System Status'}</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">{t('footer.releaseNotes') || 'Release Notes'}</a></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold mb-4">{t('footer.company') || 'Company'}</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link to="/about" className="hover:text-foreground transition-colors">{t('footer.aboutUs') || 'About Us'}</Link></li>
                <li><a href="#" className="hover:text-foreground transition-colors">{t('footer.careers') || 'Careers'}</a></li>
                <li><Link to="/privacy" className="hover:text-foreground transition-colors">{t('footer.privacyPolicy') || 'Privacy Policy'}</Link></li>
                <li><Link to="/terms" className="hover:text-foreground transition-colors">{t('footer.termsOfService') || 'Terms of Service'}</Link></li>
                <li><a href="#" className="hover:text-foreground transition-colors">{t('footer.cookiePolicy') || 'Cookie Policy'}</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-muted-foreground">
              {t('footer.copyright') || '© 2026 Nazim School Management System. All rights reserved.'}
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
}
