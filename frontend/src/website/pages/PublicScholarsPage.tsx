import { useQuery } from '@tanstack/react-query';
import { publicWebsiteApi } from '@/lib/api/client';
import { WebsiteScholar } from '@/website/hooks/useWebsiteContent';
import { Mail, User } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading';

export default function PublicScholarsPage() {
    const { data: scholars = [], isLoading } = useQuery({
        queryKey: ['public-scholars'],
        queryFn: async () => {
            const response = await publicWebsiteApi.getScholars();
            return response as unknown as WebsiteScholar[];
        },
    });

    return (
        <div className="container mx-auto px-4 py-12 max-w-7xl overflow-x-hidden">
            <div className="text-center mb-16">
                <h1 className="text-4xl font-bold text-slate-900 mb-4">Our Scholars & Staff</h1>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                    Meet the dedicated educators and scholars guiding our community.
                </p>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <LoadingSpinner />
                </div>
            ) : scholars.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {scholars.map((scholar) => (
                        <div key={scholar.id} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border text-center p-8 group">
                            <div className="w-32 h-32 mx-auto mb-6 rounded-full overflow-hidden bg-slate-100 ring-4 ring-emerald-50">
                                {(scholar.photo_url || scholar.photo_path) ? (
                                    <img
                                        src={scholar.photo_url || scholar.photo_path || ''}
                                        alt={scholar.name}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                        <User className="h-12 w-12" />
                                    </div>
                                )}
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-1">{scholar.name}</h3>
                            <div className="text-emerald-600 font-medium mb-4">{scholar.title}</div>

                            <div className="w-12 h-0.5 bg-slate-200 mx-auto mb-4"></div>

                            <p className="text-slate-600 mb-6 text-sm leading-relaxed min-h-[5rem]">
                                {scholar.bio || "Staff member at our institution."}
                            </p>

                            {scholar.contact_email ? (
                                <a
                                    href={`mailto:${scholar.contact_email}`}
                                    className="inline-flex items-center text-slate-500 hover:text-emerald-600 transition-colors text-sm font-medium"
                                >
                                    <Mail className="h-4 w-4 mr-2" />
                                    {scholar.contact_email}
                                </a>
                            ) : null}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-slate-50 rounded-lg">
                    <User className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900">No scholar profiles found</h3>
                </div>
            )}
        </div>
    );
}
