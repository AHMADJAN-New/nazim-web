import { useQuery } from '@tanstack/react-query';
import { publicWebsiteApi } from '@/lib/api/client';
import { useLanguage } from '@/hooks/useLanguage';

export interface SchoolBranding {
    id: string;
    organization_id: string;
    school_name: string;
    school_name_arabic?: string;
    school_name_pashto?: string;
    school_address?: string;
    school_phone?: string;
    school_email?: string;
    school_website?: string;
    primary_color?: string;
    secondary_color?: string;
    accent_color?: string;
    footer_text?: string;
    font_family?: string;
    // ... add other fields as needed
}

export interface WebsiteSiteResponse {
    settings: any;
    school: SchoolBranding;
    menu: any[];
    home: any;
    posts: any[];
    events: any[];
}

export const useWebsiteSite = () => {
    const { language } = useLanguage();

    return useQuery<WebsiteSiteResponse>({
        queryKey: ['public-site', language],
        queryFn: async () => {
            const response = await publicWebsiteApi.getSite({ locale: language });
            return (response as any).data || response;
        },
        staleTime: 1000 * 30, // 30 seconds
    });
};
