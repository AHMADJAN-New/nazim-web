import { GraduationCap, Users, Target, Heart, Award, Globe, Languages, ArrowRight, Lock, Shield } from 'lucide-react';
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

export default function AboutUs() {
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
                <DropdownMenuLabel>{t('events.selectLanguage') || 'Select Language'}</DropdownMenuLabel>
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
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center">
              <GraduationCap className="h-10 w-10 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {t('aboutUs.title') || 'About Nazim School Management System'}
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {t('aboutUs.subtitle') || 'Empowering educational institutions with modern technology solutions for better learning outcomes.'}
          </p>
        </div>

        {/* Mission Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-6 w-6 text-primary" />
              {t('aboutUs.mission.title') || 'Our Mission'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
              {t('aboutUs.mission.content') || 'Our mission is to provide comprehensive, user-friendly, and affordable school management solutions that help educational institutions streamline their operations, enhance learning outcomes, and strengthen community connections. We believe that every school, regardless of size, deserves access to modern technology that can transform the way they manage their institution.'}
            </p>
          </CardContent>
        </Card>

        {/* Vision Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-6 w-6 text-primary" />
              {t('aboutUs.vision.title') || 'Our Vision'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
              {t('aboutUs.vision.content') || 'We envision a future where all educational institutions, especially Islamic schools and madrasas, have access to powerful, intuitive, and culturally-aware management systems that support their unique needs. We aim to be the leading provider of school management solutions in the region, helping thousands of schools digitize their operations and focus on what matters most: education.'}
            </p>
          </CardContent>
        </Card>

        {/* Values Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-6 w-6 text-primary" />
              {t('aboutUs.values.title') || 'Our Values'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">{t('aboutUs.values.innovation.title') || 'Innovation'}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('aboutUs.values.innovation.content') || 'We continuously innovate to provide cutting-edge solutions that meet the evolving needs of educational institutions.'}
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">{t('aboutUs.values.integrity.title') || 'Integrity'}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('aboutUs.values.integrity.content') || 'We operate with honesty, transparency, and ethical practices in all our business dealings.'}
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">{t('aboutUs.values.excellence.title') || 'Excellence'}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('aboutUs.values.excellence.content') || 'We strive for excellence in every aspect of our service, from product development to customer support.'}
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">{t('aboutUs.values.community.title') || 'Community'}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('aboutUs.values.community.content') || 'We are committed to building strong relationships with our customers and supporting the educational community.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What We Offer Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-6 w-6 text-primary" />
              {t('aboutUs.whatWeOffer.title') || 'What We Offer'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="font-semibold mb-2">{t('aboutUs.whatWeOffer.comprehensive.title') || 'Comprehensive Solutions'}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('aboutUs.whatWeOffer.comprehensive.content') || 'From student management to finance, attendance to exams, we cover all aspects of school administration.'}
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">{t('aboutUs.whatWeOffer.affordable.title') || 'Affordable Pricing'}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('aboutUs.whatWeOffer.affordable.content') || 'We offer flexible pricing plans that fit schools of all sizes, from small madrasas to large institutions.'}
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">{t('aboutUs.whatWeOffer.support.title') || 'Dedicated Support'}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('aboutUs.whatWeOffer.support.content') || 'Our team is always ready to help with training, technical support, and ongoing assistance.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact CTA */}
        <div className="mt-12 text-center">
          <p className="text-muted-foreground mb-4">
            {t('aboutUs.cta.text') || 'Want to learn more about how we can help your school?'}
          </p>
          <Button asChild>
            <Link to="/#contact">
              {t('aboutUs.cta.button') || 'Contact Us'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
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
