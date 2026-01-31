import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWebsiteSite } from '@/website/hooks/useWebsiteSite';
import { publicWebsiteApi } from '@/lib/api/client';
import { Menu, X, ChevronDown, GraduationCap, Calendar, Phone, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

// Default navigation items when no database menus exist (Pashto)
const defaultNavItems: WebsiteMenu[] = [
    { id: 'home', label: 'کور', url: '/public-site', parentId: null, sortOrder: 0, isVisible: true },
    { id: 'about', label: 'زموږ په اړه', url: '/public-site/about', parentId: null, sortOrder: 1, isVisible: true },
    { id: 'programs', label: 'پروګرامونه', url: '/public-site/programs', parentId: null, sortOrder: 2, isVisible: true },

    // Resources Dropdown
    { id: 'resources', label: 'سرچینې', url: '#', parentId: null, sortOrder: 3, isVisible: true },
    { id: 'library', label: 'کتابتون', url: '/public-site/library', parentId: 'resources', sortOrder: 0, isVisible: true },
    { id: 'alumni', label: 'فارغ التحصیلان', url: '/public-site/alumni', parentId: 'resources', sortOrder: 2, isVisible: true },
    { id: 'fatwas', label: 'فتاوي', url: '/public-site/fatwas', parentId: 'resources', sortOrder: 3, isVisible: true },
    { id: 'ask_fatwa', label: 'پوښتنه وکړئ', url: '/public-site/fatwas/ask', parentId: 'resources', sortOrder: 4, isVisible: true },

    // Moved features to Resources
    { id: 'scholars', label: 'علما', url: '/public-site/scholars', parentId: 'resources', sortOrder: 5, isVisible: true },
    { id: 'staff', label: 'کارمندان', url: '/public-site/staff', parentId: 'resources', sortOrder: 6, isVisible: true },
    { id: 'articles', label: 'مقالې او بلاګ', url: '/public-site/articles', parentId: 'resources', sortOrder: 7, isVisible: true },
    { id: 'gallery', label: 'ګالري', url: '/public-site/gallery', parentId: 'resources', sortOrder: 8, isVisible: true },
    { id: 'announcements', label: 'اعلانات', url: '/public-site/announcements', parentId: 'resources', sortOrder: 9, isVisible: true },
    { id: 'results', label: 'پایلې', url: '/public-site/results', parentId: 'resources', sortOrder: 10, isVisible: true },
    { id: 'events', label: 'پیښې', url: '/public-site/events', parentId: 'resources', sortOrder: 11, isVisible: true },

    { id: 'contact', label: 'اړیکه', url: '/public-site/contact', parentId: null, sortOrder: 9, isVisible: true },
    { id: 'donate', label: 'مرسته', url: '/public-site/donate', parentId: null, sortOrder: 10, isVisible: true },
];

const PUBLIC_LANGUAGES = [
    { code: 'en' as const, name: 'English' },
    { code: 'ps' as const, name: 'پښتو' },
    { code: 'fa' as const, name: 'فارسی' },
    { code: 'ar' as const, name: 'العربية' },
];

export function PublicHeader({ schoolName: propSchoolName, logo: propLogo }: PublicHeaderProps) {
    const { t, language, setLanguage } = useLanguage();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

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

    // Get font family from school or default to Bahij Nassim
    const fontFamily = school?.font_family || 'Bahij Nassim';
    const fontStyle = { fontFamily: `"${fontFamily}", "Noto Sans Arabic", "Inter", sans-serif` };

    // Updated logic: Professional Header Structure
    // Groups: Community (Scholars, Staff, Alumni), Media (Gallery, News, Events), Resources (Library, Fatwas)

    // 1. Get base items (API or defaults)
    // We filter out items that we are about to force-group to avoid duplicates if they were top-level in DB
    // IMPORTANT: We filter by URL as well, because DB IDs might be UUIDs and not match our hardcoded IDs.
    const forcedGroupIds = [
        'scholars', 'staff', 'alumni',
        'gallery', 'articles', 'announcements', 'events',
        'library', 'fatwas', 'ask_fatwa', 'results'
    ];

    const forcedGroupUrls = [
        '/public-site/scholars',
        '/public-site/staff',
        '/public-site/alumni',
        '/public-site/gallery',
        '/public-site/articles',
        '/public-site/news', // In case old link exists
        '/public-site/announcements',
        '/public-site/events',
        '/public-site/library',
        '/public-site/fatwas',
        '/public-site/fatwas/ask',
        '/public-site/results',
        '/public-site/exams/results', // Variant
    ];

    let navItems = menus.length > 0 ? menus.map((item: any) => ({
        id: item.id,
        label: item.label,
        url: item.url,
        parentId: item.parent_id,
        sortOrder: item.sort_order,
        isVisible: item.is_visible
    })).filter((item: WebsiteMenu) => {
        // Filter out if ID matches forced IDs OR if URL matches forced URLs
        if (forcedGroupIds.includes(item.id)) return false;
        if (item.url && forcedGroupUrls.some(forcedUrl => item.url.includes(forcedUrl))) return false;
        return true;
    })
        : [];

    // 2. Define Groups
    const communityGroup = { id: 'community', label: 'ټولنه', url: '#', parentId: null, sortOrder: 3, isVisible: true, children: [] as WebsiteMenu[] };
    const mediaGroup = { id: 'media', label: 'رسنۍ', url: '#', parentId: null, sortOrder: 4, isVisible: true, children: [] as WebsiteMenu[] };
    const resourcesGroup = { id: 'resources', label: 'سرچینې', url: '#', parentId: null, sortOrder: 5, isVisible: true, children: [] as WebsiteMenu[] };

    // 3. Define Items for each group
    const communityItems = [
        { id: 'scholars', label: 'علما', url: '/public-site/scholars', parentId: 'community', sortOrder: 0, isVisible: true },
        { id: 'staff', label: 'کارمندان', url: '/public-site/staff', parentId: 'community', sortOrder: 1, isVisible: true },
        { id: 'alumni', label: 'فارغ التحصیلان', url: '/public-site/alumni', parentId: 'community', sortOrder: 2, isVisible: true },
    ];

    const mediaItems = [
        { id: 'gallery', label: 'ګالري', url: '/public-site/gallery', parentId: 'media', sortOrder: 0, isVisible: true },
        { id: 'articles', label: 'مقالې او بلاګ', url: '/public-site/articles', parentId: 'media', sortOrder: 1, isVisible: true },
        { id: 'announcements', label: 'اعلانات', url: '/public-site/announcements', parentId: 'media', sortOrder: 2, isVisible: true },
        { id: 'events', label: 'پیښې', url: '/public-site/events', parentId: 'media', sortOrder: 3, isVisible: true },
    ];

    const resourceItems = [
        { id: 'library', label: 'کتابتون', url: '/public-site/library', parentId: 'resources', sortOrder: 0, isVisible: true },
        { id: 'fatwas', label: 'فتاوي', url: '/public-site/fatwas', parentId: 'resources', sortOrder: 1, isVisible: true },
        { id: 'ask_fatwa', label: 'پوښتنه وکړئ', url: '/public-site/fatwas/ask', parentId: 'resources', sortOrder: 2, isVisible: true },
        // Results removed as requested
    ];

    // 4. Merge Groups into NavItems
    // Function to add group if not exists (checking by ID or Label)
    const addGroup = (group: any, items: any[]) => {
        let existingGroup = navItems.find((i: WebsiteMenu) => i.id === group.id || i.label === group.label);
        if (!existingGroup) {
            existingGroup = group;
            // Insert at correct sort order position if possible, or just push.
            // Since we reconstructed navItems, let's just push and sort later.
            navItems.push(existingGroup);
        }

        const parentId = existingGroup.id;
        items.forEach(item => {
            // Check if exists
            const exists = navItems.some((i: WebsiteMenu) => i.url === item.url && String(i.parentId) === String(parentId));
            if (!exists) {
                navItems.push({ ...item, parentId });
            }
        });
    };

    addGroup(communityGroup, communityItems);
    addGroup(mediaGroup, mediaItems);
    addGroup(resourcesGroup, resourceItems);

    // 5. Ensure default items exist if DB is empty or missing them
    const essentialDefaults = [
        { id: 'home', label: 'کور', url: '/public-site', parentId: null, sortOrder: 0, isVisible: true },
        { id: 'about', label: 'زموږ په اړه', url: '/public-site/about', parentId: null, sortOrder: 1, isVisible: true },
        { id: 'programs', label: 'پروګرامونه', url: '/public-site/programs', parentId: null, sortOrder: 2, isVisible: true },
        { id: 'contact', label: 'اړیکه', url: '/public-site/contact', parentId: null, sortOrder: 9, isVisible: true },
        { id: 'donate', label: 'مرسته', url: '/public-site/donate', parentId: null, sortOrder: 10, isVisible: true },
    ];

    essentialDefaults.forEach(def => {
        // Strict check: if URL exists anywhere, don't add default top level (unless it IS the default top level we want)
        // Actually, we want these essential defaults to be present.
        // But we should check if they are ALREADY present from DB to avoid duplicating "Home" or "About".
        const exists = navItems.some((i: WebsiteMenu) => i.url === def.url);
        if (!exists) {
            navItems.push(def);
        }
    });

    // Build menu tree
    const menuTree = navItems.reduce((acc: WebsiteMenu[], item: WebsiteMenu) => {
        // Only top level items go here
        if (!item.parentId) {
            // Find all children that reference this parent by ID
            // Convert both to strings for reliable comparison (UUIDs are strings)
            const itemIdStr = String(item.id || '');
            const children = navItems
                .filter((child: WebsiteMenu) => {
                    if (!child.parentId) return false;
                    // Match by comparing as strings (handles UUID string comparison)
                    const childParentIdStr = String(child.parentId || '');
                    return childParentIdStr === itemIdStr;
                })
                .sort((a: WebsiteMenu, b: WebsiteMenu) => (a.sortOrder || 0) - (b.sortOrder || 0));
            acc.push({ ...item, children: children.length > 0 ? children : undefined });
        }
        return acc;
    }, []).sort((a: WebsiteMenu, b: WebsiteMenu) => (a.sortOrder || 0) - (b.sortOrder || 0));

    // Debug logging (only in development)
    if (import.meta.env.DEV) {
        console.log('[PublicHeader] Menus from API:', menus.length);
        console.log('[PublicHeader] Nav items:', navItems.length);
        console.log('[PublicHeader] Menu tree:', menuTree.length);
        console.log('[PublicHeader] All nav items with parentId:', navItems.filter(item => item.parentId).map(item => ({
            label: item.label,
            parentId: item.parentId,
            id: item.id
        })));
        console.log('[PublicHeader] All parent items:', navItems.filter(item => !item.parentId).map(item => ({
            label: item.label,
            id: item.id,
            url: item.url
        })));
        menuTree.forEach(item => {
            if (item.children && item.children.length > 0) {
                console.log(`[PublicHeader] ${item.label} (url: "${item.url}", id: "${item.id}") has ${item.children.length} children:`, item.children.map(c => ({ label: c.label, parentId: c.parentId, id: c.id })));
            }
        });
        // Specifically check Resources
        const resourcesItem = menuTree.find(item => item.label === 'سرچینې' || item.url === '#');
        if (resourcesItem) {
            console.log('[PublicHeader] Resources item found:', {
                label: resourcesItem.label,
                url: resourcesItem.url,
                id: resourcesItem.id,
                hasChildren: !!(resourcesItem.children && resourcesItem.children.length > 0),
                childrenCount: resourcesItem.children?.length || 0,
                children: resourcesItem.children?.map(c => ({ label: c.label, parentId: c.parentId, id: c.id })) || [],
            });
            // Check if any nav items have this as parent
            const childrenWithThisParent = navItems.filter(child => child.parentId === resourcesItem.id || child.parentId === resourcesItem.id?.toString());
            console.log('[PublicHeader] Nav items with Resources as parent:', childrenWithThisParent.map(c => ({ label: c.label, parentId: c.parentId, id: c.id })));
        } else {
            console.log('[PublicHeader] Resources item NOT found in menu tree');
        }
    }

    return (
        <header className="sticky top-0 z-50 w-full bg-white shadow-sm border-b border-slate-100" style={fontStyle}>
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
                            د دو شنبې - د جمې: ۸:۰۰ بجو - ۵:۰۰ بجو
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link to="/auth" className="hover:text-white transition-colors">د والدینو پورټل</Link>
                        <span className="text-emerald-400 opacity-50">|</span>
                        <Link to="/auth" className="hover:text-white transition-colors">د کارکوونکو ننوتل</Link>
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
                        <span className="text-xs text-slate-500 hidden sm:block">په تعلیم کې بریالیتوب</span>
                    </Link>
                </div>

                {/* Desktop Nav */}
                <nav className="hidden lg:flex items-center gap-1">
                    {menuTree.filter(m => m.isVisible).map((item) => {
                        // Check if this item should be a dropdown parent (has children AND url is # or empty)
                        const hasChildren = item.children && item.children.length > 0;
                        const isDropdownParent = hasChildren && (item.url === '#' || item.url === '' || !item.url);
                        const NavComponent = isDropdownParent ? 'div' : Link;
                        const navProps = isDropdownParent
                            ? {
                                className: "px-4 py-2 text-sm font-medium text-slate-700 rounded-md hover:bg-emerald-50 hover:text-emerald-700 transition-colors flex items-center gap-1 cursor-pointer",
                                onMouseEnter: () => { }, // Ensure hover works
                            }
                            : {
                                to: item.url,
                                className: "px-4 py-2 text-sm font-medium text-slate-700 rounded-md hover:bg-emerald-50 hover:text-emerald-700 transition-colors flex items-center gap-1"
                            };

                        const isOpen = openDropdown === item.id;

                        return (
                            <div
                                key={item.id}
                                className="relative group"
                                onMouseEnter={() => hasChildren && setOpenDropdown(item.id)}
                                onMouseLeave={() => setOpenDropdown(null)}
                            >
                                <NavComponent
                                    {...navProps}
                                    style={school?.primary_color ? { '--hover-color': school.primary_color } as React.CSSProperties : {}}
                                >
                                    <span className="group-hover:text-emerald-700" style={school?.primary_color ? { color: 'inherit' } : {}}>
                                        {item.label}
                                    </span>
                                    {hasChildren && (
                                        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                                    )}
                                </NavComponent>
                                {/* Dropdown - Show for any item with children */}
                                {hasChildren && (
                                    <div
                                        className={cn(
                                            "absolute top-full left-0 rtl:left-auto rtl:right-0 w-56 pt-2 transition-all duration-200",
                                            isOpen ? "opacity-100 visible" : "opacity-0 invisible"
                                        )}
                                        style={{ zIndex: 9999 }}
                                    >
                                        <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
                                            {item.children.filter(c => c.isVisible).map(child => (
                                                <Link
                                                    key={child.id}
                                                    to={child.url}
                                                    className="block px-4 py-2.5 text-sm text-slate-700 rounded-md hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                                                    onClick={() => setOpenDropdown(null)}
                                                >
                                                    {child.label}
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>

                <div className="hidden lg:flex items-center gap-3">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 gap-1.5">
                                <Languages className="h-4 w-4" />
                                <span>{PUBLIC_LANGUAGES.find(l => l.code === language)?.name ?? t('common.selectLanguage')}</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[140px]">
                            {PUBLIC_LANGUAGES.map((lang) => (
                                <DropdownMenuItem
                                    key={lang.code}
                                    onClick={() => setLanguage(lang.code)}
                                    className={language === lang.code ? 'bg-accent' : ''}
                                >
                                    {lang.name}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="outline" size="sm" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50" asChild>
                        <Link to="/auth">ننوتل</Link>
                    </Button>
                    <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        style={secondaryColorStyle}
                    >
                        اوس غوښتنه وکړئ
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
                        {menuTree.filter(m => m.isVisible).map((item) => {
                            const hasChildren = item.children && item.children.length > 0;
                            const isDropdownParent = hasChildren && (item.url === '#' || item.url === '' || !item.url);

                            return (
                                <div key={item.id} className="space-y-1">
                                    {isDropdownParent ? (
                                        <div className="block px-4 py-2 font-medium text-slate-700 rounded-md cursor-default">
                                            {item.label}
                                        </div>
                                    ) : (
                                        <Link
                                            to={item.url}
                                            className="block px-4 py-2 font-medium text-slate-700 rounded-md hover:bg-emerald-50 hover:text-emerald-700"
                                            onClick={() => setIsMobileMenuOpen(false)}
                                        >
                                            {item.label}
                                        </Link>
                                    )}
                                    {hasChildren && (
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
                            );
                        })}
                        <div className="pt-4 border-t border-slate-100 space-y-3">
                            <div className="flex items-center gap-2 px-4 py-2">
                                <Languages className="h-4 w-4 text-slate-500" />
                                <span className="text-sm font-medium text-slate-600">{t('common.selectLanguage')}</span>
                            </div>
                            <div className="flex flex-wrap gap-2 px-4">
                                {PUBLIC_LANGUAGES.map((lang) => (
                                    <Button
                                        key={lang.code}
                                        variant={language === lang.code ? 'default' : 'outline'}
                                        size="sm"
                                        className={language === lang.code ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'border-emerald-200 text-emerald-700'}
                                        onClick={() => { setLanguage(lang.code); setIsMobileMenuOpen(false); }}
                                    >
                                        {lang.name}
                                    </Button>
                                ))}
                            </div>
                            <div className="flex flex-col gap-2 pt-2">
                                <Button variant="outline" className="w-full border-emerald-200 text-emerald-700" asChild>
                                    <Link to="/auth" onClick={() => setIsMobileMenuOpen(false)}>ننوتل</Link>
                                </Button>
                                <Button
                                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                                    style={secondaryColorStyle}
                                >
                                    اوس غوښتنه وکړئ
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}
