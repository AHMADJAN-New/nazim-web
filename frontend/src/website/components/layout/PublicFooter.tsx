import { Link } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { useWebsiteSite } from '@/website/hooks/useWebsiteSite';
import { Facebook, Twitter, Instagram, Youtube, Mail, Phone, MapPin } from 'lucide-react';

interface PublicFooterProps {
    schoolName?: string;
    contact?: any;
}

export function PublicFooter({ schoolName: propSchoolName, contact }: PublicFooterProps) {
    const { t } = useLanguage();
    const currentYear = new Date().getFullYear();
    const { data: siteData } = useWebsiteSite();
    const school = siteData?.school;

    const schoolName = propSchoolName || school?.school_name || t('websitePublic.defaultSchoolName') || 'Nazim';

    // Dynamic styles
    const primaryTextStyle = school?.primary_color ? { color: school.primary_color } : {};
    const iconStyle = school?.primary_color ? { color: school.primary_color } : {};

    return (
        <footer className="bg-slate-900 text-slate-200">
            <div className="container mx-auto px-4 py-12 md:py-16">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
                    {/* Brand Column */}
                    <div className="space-y-4">
                        <h3 className="text-2xl font-bold text-white">
                            <span style={primaryTextStyle}>{schoolName}</span>
                        </h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            {school?.footer_text || t('websitePublic.footerTagline')}
                        </p>
                        {/* Social Links - Hidden until data is available in backend */}
                        {/* 
                        <div className="flex space-x-4 pt-2">
                            <a href="#" className="hover:text-emerald-400 transition-colors"><Facebook className="h-5 w-5" /></a>
                            <a href="#" className="hover:text-emerald-400 transition-colors"><Twitter className="h-5 w-5" /></a>
                            <a href="#" className="hover:text-emerald-400 transition-colors"><Instagram className="h-5 w-5" /></a>
                            <a href="#" className="hover:text-emerald-400 transition-colors"><Youtube className="h-5 w-5" /></a>
                        </div>
                        */}
                    </div>

                    {/* Quick Links */}
                    <div className="space-y-4">
                        <h4 className="text-lg font-semibold text-white">{t('websitePublic.quickLinks')}</h4>
                        <ul className="space-y-2 text-sm">
                            <li><Link to="/public-site/about" className="hover:text-emerald-400 transition-colors">{t('websitePublic.aboutUs')}</Link></li>
                            <li><Link to="/public-site/programs" className="hover:text-emerald-400 transition-colors">{t('websitePublic.academics')}</Link></li>
                            <li><Link to="/public-site/contact" className="hover:text-emerald-400 transition-colors">{t('websitePublic.contact')}</Link></li>
                            <li><Link to="/auth" className="hover:text-emerald-400 transition-colors">{t('websitePublic.portalLogin')}</Link></li>
                        </ul>
                    </div>

                    {/* Programs */}
                    <div className="space-y-4">
                        <h4 className="text-lg font-semibold text-white">{t('websitePublic.resources')}</h4>
                        <ul className="space-y-2 text-sm">
                            <li><Link to="/public-site/library" className="hover:text-emerald-400 transition-colors">{t('websitePublic.library')}</Link></li>
                            <li><Link to="/public-site/scholars" className="hover:text-emerald-400 transition-colors">{t('websitePublic.scholars')}</Link></li>
                            <li><Link to="/public-site/fatwas" className="hover:text-emerald-400 transition-colors">{t('websitePublic.fatwas')}</Link></li>
                            <li><Link to="/public-site/donate" className="hover:text-emerald-400 transition-colors">{t('websitePublic.donate')}</Link></li>
                        </ul>
                    </div>

                    {/* Contact Info */}
                    {(school?.school_address || school?.school_phone || school?.school_email) && (
                        <div className="space-y-4">
                            <h4 className="text-lg font-semibold text-white">{t('websitePublic.ctaContact')}</h4>
                            <ul className="space-y-3 text-sm">
                                {school?.school_address && (
                                    <li className="flex items-start gap-3">
                                        <MapPin className="h-5 w-5 text-emerald-400 shrink-0" style={iconStyle} />
                                        <span dangerouslySetInnerHTML={{ __html: school.school_address.replace(/\n/g, '<br />') }} />
                                    </li>
                                )}
                                {school?.school_phone && (
                                    <li className="flex items-center gap-3">
                                        <Phone className="h-5 w-5 text-emerald-400 shrink-0" style={iconStyle} />
                                        <span>{school.school_phone}</span>
                                    </li>
                                )}
                                {school?.school_email && (
                                    <li className="flex items-center gap-3">
                                        <Mail className="h-5 w-5 text-emerald-400 shrink-0" style={iconStyle} />
                                        <span>{school.school_email}</span>
                                    </li>
                                )}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            {/* Copyright */}
            <div className="border-t border-slate-800 bg-slate-950">
                <div className="container mx-auto px-4 py-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
                    <p>&copy; {currentYear} {schoolName}. All rights reserved.</p>
                    <div className="flex gap-6">
                        <Link to="/public-site/privacy" className="hover:text-emerald-400 transition-colors">{t('websitePublic.privacyPolicy')}</Link>
                        <Link to="/public-site/terms" className="hover:text-emerald-400 transition-colors">{t('websitePublic.termsOfService')}</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
