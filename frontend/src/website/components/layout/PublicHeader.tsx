import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWebsiteSite } from '@/website/hooks/useWebsiteSite';
import { publicWebsiteApi } from '@/lib/api/client';
import { Menu, X, ChevronDown, GraduationCap, BookOpen, Users, Calendar, Phone, FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface WebsiteMenu {
    id: string;
    label: string;
    url: string;
    parentId: string | null;
    sortOrder: number;
    isVisible: boolean;
    children?: WebsiteMenu[];
}

interface PublicHeaderProps {
    schoolName?: string;
    logo?: string;
}

// Default navigation items when no database menus exist
const defaultNavItems: WebsiteMenu[] = [
    { id: 'home', label: 'Home', url: '/public-site', parentId: null, sortOrder: 0, isVisible: true },
    { id: 'about', label: 'About', url: '/public-site/about', parentId: null, sortOrder: 1, isVisible: true },
    { id: 'programs', label: 'Programs', url: '/public-site/programs', parentId: null, sortOrder: 2, isVisible: true },

    // Resources Dropdown
    { id: 'resources', label: 'Resources', url: '#', parentId: null, sortOrder: 3, isVisible: true },
    { id: 'library', label: 'Library', url: '/public-site/library', parentId: 'resources', sortOrder: 0, isVisible: true },
    { id: 'scholars', label: 'Scholars', url: '/public-site/scholars', parentId: 'resources', sortOrder: 1, isVisible: true },
    { id: 'alumni', label: 'Alumni', url: '/public-site/alumni', parentId: 'resources', sortOrder: 2, isVisible: true },
    { id: 'fatwas', label: 'Fatwas', url: '/public-site/fatwas', parentId: 'resources', sortOrder: 3, isVisible: true },

    { id: 'news', label: 'News', url: '/public-site/news', parentId: null, sortOrder: 4, isVisible: true },
    { id: 'results', label: 'Results', url: '/public-site/results', parentId: null, sortOrder: 5, isVisible: true },
    { id: 'contact', label: 'Contact', url: '/public-site/contact', parentId: null, sortOrder: 6, isVisible: true },
    { id: 'donate', label: 'Donate', url: '/public-site/donate', parentId: null, sortOrder: 6, isVisible: true },
];

export function PublicHeader({ schoolName: propSchoolName, logo: propLogo }: PublicHeaderProps) {
    const { t } = useLanguage();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Fetch site data (includes school branding and menus)
    const { data: siteData } = useWebsiteSite();
    const school = siteData?.school;
    const menus = siteData?.menu || [];

    // Use props if provided (overrides), otherwise use data from API
    const schoolName = propSchoolName || school?.school_name || 'Nazim Academy';
    // Use school logo binary if available (need to handle blob/url), or path, or default
    // For now assuming logo path or we might need a helper to get logo URL
    // existing logic used propLogo

    // Construct logo URL
    // Use the proxy path /api which works in both dev (via vite proxy) and likely prod (if served from same origin)
    // If API is on different domain, we might need value from env, but for now assuming relative path is fine
    // Appending a timestamp if we had it would help with caching updates, but ETag handles that
    const logoUrl = propLogo || (school?.id ? `/api/public/website/schools/${school.id}/logos/primary` : null);

    // Dynamic styles for branding
    const primaryColorStyle = school?.primary_color ? { backgroundColor: school.primary_color } : {};
    const primaryTextStyle = school?.primary_color ? { color: school.primary_color } : {};
    const secondaryColorStyle = school?.secondary_color ? { backgroundColor: school.secondary_color } : {};
    // Calculate lighter shade for hover effects (simplified)
    const hoverBgStyle = school?.primary_color ? { '--hover-color': `${school.primary_color}10` } as React.CSSProperties : {};

    const navItems = menus.length > 0 ? menus.map((item: any) => ({
        id: item.id,
        label: item.label,
        url: item.url,
        parentId: item.parent_id,
        sortOrder: item.sort_order,
        isVisible: item.is_visible
    })) : defaultNavItems;

    // Build menu tree
    const menuTree = navItems.reduce((acc: WebsiteMenu[], item: WebsiteMenu) => {
        if (!item.parentId) {
            const children = navItems
                .filter((child: WebsiteMenu) => child.parentId === item.id)
                .sort((a: WebsiteMenu, b: WebsiteMenu) => (a.sortOrder || 0) - (b.sortOrder || 0));
            acc.push({ ...item, children });
        }
        return acc;
    }, []).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    return (
        <header className="sticky top-0 z-50 w-full bg-white shadow-sm border-b border-slate-100">
            {/* Top bar with contact info */}
            <div className="bg-emerald-900 text-emerald-100 py-2 hidden md:block" style={primaryColorStyle}>
                <div className="container mx-auto px-4 flex justify-between items-center text-sm">
                    <div className="flex items-center gap-6">
                        {school?.school_phone && (
                            <span className="flex items-center gap-2">
                                <Phone className="h-3.5 w-3.5" />
                                {school.school_phone}
                            </span>
                        )}
                        <span className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5" />
                            Mon - Fri: 8:00 AM - 5:00 PM
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link to="/auth" className="hover:text-white transition-colors">Parent Portal</Link>
                        <span className="text-emerald-400 opacity-50">|</span>
                        <Link to="/auth" className="hover:text-white transition-colors">Staff Login</Link>
                    </div>
                </div>
            </div>

            {/* Main navigation */}
            <div className="container mx-auto px-4 flex h-16 items-center justify-between">
                <div className="flex items-center gap-3">
                    {logoUrl ? (
                        <img
                            src={logoUrl}
                            alt={schoolName}
                            className="h-10 w-auto object-contain"
                            onError={(e) => {
                                // Fallback if logo fails to load
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                        />
                    ) : null}

                    {/* Fallback Icon (hidden if logo loads, visible if no logo or error) */}
                    <div className={cn(
                        "w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center",
                        logoUrl ? 'hidden' : ''
                    )}
                        style={primaryColorStyle}
                    >
                        <GraduationCap className="h-6 w-6 text-white" />
                    </div>

                    <Link to="/public-site" className="flex flex-col">
                        <span className="text-lg font-bold text-slate-900 leading-tight" style={primaryTextStyle}>
                            {schoolName}
                        </span>
                        {/* Only show tagline if desired, but for now fixed is potentially cleaner or could be from DB too */}
                        <span className="text-xs text-slate-500 hidden sm:block">Excellence in Education</span>
                    </Link>
                </div>

                {/* Desktop Nav */}
                <nav className="hidden lg:flex items-center gap-1">
                    {menuTree.filter(m => m.isVisible).map((item) => (
                        <div key={item.id} className="relative group">
                            <Link
                                to={item.url}
                                className="px-4 py-2 text-sm font-medium text-slate-700 rounded-md hover:bg-emerald-50 hover:text-emerald-700 transition-colors flex items-center gap-1"
                                style={school?.primary_color ? { '--hover-color': school.primary_color } as React.CSSProperties : {}}
                            >
                                <span className="group-hover:text-emerald-700" style={school?.primary_color ? { color: 'inherit' } : {}}>
                                    {item.label}
                                </span>
                                {item.children && item.children.length > 0 && (
                                    <ChevronDown className="h-4 w-4" />
                                )}
                            </Link>
                            {/* Dropdown */}
                            {item.children && item.children.length > 0 && (
                                <div className="absolute top-full left-0 w-56 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                                    <div className="rounded-lg border bg-white p-2 shadow-lg">
                                        {item.children.filter(c => c.isVisible).map(child => (
                                            <Link
                                                key={child.id}
                                                to={child.url}
                                                className="block px-4 py-2.5 text-sm rounded-md hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                                            >
                                                {child.label}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </nav>

                <div className="hidden lg:flex items-center gap-3">
                    <Button variant="outline" size="sm" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50" asChild>
                        <Link to="/auth">Login</Link>
                    </Button>
                    <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        style={secondaryColorStyle}
                    >
                        Apply Now
                    </Button>
                </div>

                {/* Mobile menu toggle */}
                <button
                    className="lg:hidden p-2 rounded-md hover:bg-slate-100 transition-colors"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    {isMobileMenuOpen ? <X className="h-6 w-6 text-slate-700" /> : <Menu className="h-6 w-6 text-slate-700" />}
                </button>
            </div>

            {/* Mobile Nav */}
            {isMobileMenuOpen && (
                <div className="lg:hidden border-t border-slate-100 bg-white shadow-lg">
                    <div className="container mx-auto px-4 py-4 space-y-2">
                        {menuTree.filter(m => m.isVisible).map((item) => (
                            <div key={item.id} className="space-y-1">
                                <Link
                                    to={item.url}
                                    className="block px-4 py-2 font-medium text-slate-700 rounded-md hover:bg-emerald-50 hover:text-emerald-700"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    {item.label}
                                </Link>
                                {item.children && item.children.length > 0 && (
                                    <div className="pl-4 space-y-1">
                                        {item.children.filter(c => c.isVisible).map(child => (
                                            <Link
                                                key={child.id}
                                                to={child.url}
                                                className="block px-4 py-2 text-sm text-slate-500 rounded-md hover:text-emerald-600 pl-8"
                                                onClick={() => setIsMobileMenuOpen(false)}
                                            >
                                                {child.label}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
                            <Button variant="outline" className="w-full border-emerald-200 text-emerald-700" asChild>
                                <Link to="/auth" onClick={() => setIsMobileMenuOpen(false)}>Login</Link>
                            </Button>
                            <Button
                                className="w-full bg-emerald-600 hover:bg-emerald-700"
                                style={secondaryColorStyle}
                            >
                                Apply Now
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}
