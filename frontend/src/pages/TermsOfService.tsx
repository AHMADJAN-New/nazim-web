import { FileText, Scale, AlertCircle, CheckCircle, GraduationCap, Languages, ArrowRight, Lock, Shield } from 'lucide-react';
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

export default function TermsOfService() {
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
              <Scale className="h-10 w-10 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {t('landing.termsOfService.title') || 'Terms of Service'}
          </h1>
          <p className="text-muted-foreground">
            {t('landing.termsOfService.lastUpdated') || 'Last Updated: January 2026'}
          </p>
        </div>

        {/* Introduction */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('landing.termsOfService.introduction.title') || 'Introduction'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
              {t('landing.termsOfService.introduction.content') || 'These Terms of Service ("Terms") govern your access to and use of the Nazim School Management System platform. By using our services, you agree to be bound by these Terms. Please read them carefully.'}
            </p>
          </CardContent>
        </Card>

        {/* Acceptance of Terms */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              {t('landing.termsOfService.acceptance.title') || 'Acceptance of Terms'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
              {t('landing.termsOfService.acceptance.content') || 'By accessing or using our platform, you acknowledge that you have read, understood, and agree to be bound by these Terms. If you do not agree to these Terms, you may not use our services.'}
            </p>
          </CardContent>
        </Card>

        {/* Account Registration */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('landing.termsOfService.account.title') || 'Account Registration'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              {t('landing.termsOfService.account.intro') || 'To use our services, you must:'}
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li>• {t('landing.termsOfService.account.accurate') || 'Provide accurate and complete information'}</li>
              <li>• {t('landing.termsOfService.account.maintain') || 'Maintain the security of your account credentials'}</li>
              <li>• {t('landing.termsOfService.account.notify') || 'Notify us immediately of any unauthorized access'}</li>
              <li>• {t('landing.termsOfService.account.responsible') || 'Be responsible for all activities under your account'}</li>
            </ul>
          </CardContent>
        </Card>

        {/* Use of Services */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('landing.termsOfService.use.title') || 'Use of Services'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">{t('landing.termsOfService.use.permitted.title') || 'Permitted Use'}</h3>
              <p className="text-sm text-muted-foreground">
                {t('landing.termsOfService.use.permitted.content') || 'You may use our services for lawful educational and administrative purposes only. You agree to use the platform in accordance with all applicable laws and regulations.'}
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                {t('landing.termsOfService.use.prohibited.title') || 'Prohibited Activities'}
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• {t('landing.termsOfService.use.prohibited.unauthorized') || 'Unauthorized access to other accounts or systems'}</li>
                <li>• {t('landing.termsOfService.use.prohibited.malicious') || 'Introduction of viruses, malware, or harmful code'}</li>
                <li>• {t('landing.termsOfService.use.prohibited.interfere') || 'Interference with the platform\'s operation'}</li>
                <li>• {t('landing.termsOfService.use.prohibited.violate') || 'Violation of any applicable laws or regulations'}</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Subscription and Payment */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('landing.termsOfService.subscription.title') || 'Subscription and Payment'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              {t('landing.termsOfService.subscription.content') || 'Subscription fees are billed in advance on a monthly or annual basis. All fees are non-refundable except as required by law. We reserve the right to change our pricing with 30 days notice.'}
            </p>
            <p className="text-muted-foreground">
              {t('landing.termsOfService.subscription.cancellation') || 'You may cancel your subscription at any time. Cancellation will take effect at the end of your current billing period.'}
            </p>
          </CardContent>
        </Card>

        {/* Intellectual Property */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('landing.termsOfService.intellectualProperty.title') || 'Intellectual Property'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
              {t('landing.termsOfService.intellectualProperty.content') || 'All content, features, and functionality of the platform are owned by Nazim School Management System and are protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, or distribute any part of the platform without our written permission.'}
            </p>
          </CardContent>
        </Card>

        {/* Limitation of Liability */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('landing.termsOfService.liability.title') || 'Limitation of Liability'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
              {t('landing.termsOfService.liability.content') || 'To the maximum extent permitted by law, Nazim School Management System shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the platform. Our total liability shall not exceed the amount you paid for the services in the 12 months preceding the claim.'}
            </p>
          </CardContent>
        </Card>

        {/* Termination */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('landing.termsOfService.termination.title') || 'Termination'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
              {t('landing.termsOfService.termination.content') || 'We reserve the right to suspend or terminate your account at any time for violation of these Terms or for any other reason. Upon termination, your right to use the platform will immediately cease.'}
            </p>
          </CardContent>
        </Card>

        {/* Changes to Terms */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('landing.termsOfService.changes.title') || 'Changes to Terms'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
              {t('landing.termsOfService.changes.content') || 'We may modify these Terms at any time. We will notify you of any material changes by email or through the platform. Your continued use of the platform after such changes constitutes acceptance of the modified Terms.'}
            </p>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle>{t('landing.termsOfService.contact.title') || 'Contact Us'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
              {t('landing.termsOfService.contact.content') || 'If you have any questions about these Terms of Service, please contact us at support@nazimapp.com or through our contact form.'}
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
                <li><a href="#" className="hover:text-foreground transition-colors">{t('landing.footer.helpCenter') || 'Help Center'}</a></li>
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
              {t('landing.footer.copyright') || '© 2026 Nazim School Management System. All rights reserved.'}
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
