import { Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { publicWebsiteApi } from '@/lib/api/client';
import { PublicHeader } from '@/website/components/layout/PublicHeader';
import { PublicFooter } from '@/website/components/layout/PublicFooter';
import { LoadingSpinner } from '@/components/ui/loading';

export function PublicLayout() {
    // Fetch site settings (Branding, School Name, etc.) at the layout level
    const siteQuery = useQuery({
        queryKey: ['public-site-settings'],
        queryFn: async () => {
            const response = await publicWebsiteApi.getSite();
            return (response as any).data || response;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const siteData = siteQuery.data || {};
    const school = siteData.school || {};

    if (siteQuery.isLoading) {
        return (
            <div className="h-screen w-full bg-slate-50">
                <LoadingSpinner fullScreen />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            <PublicHeader schoolName={school.name || school.school_name} logo={school.logo} />
            <main className="flex-1">
                <Outlet context={{ siteData }} />
            </main>
            <PublicFooter schoolName={school.name || school.school_name} contact={siteData.contact} />
        </div>
    );
}
