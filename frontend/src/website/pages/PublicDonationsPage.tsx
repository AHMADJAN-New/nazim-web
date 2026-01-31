import { useQuery } from '@tanstack/react-query';
import { publicWebsiteApi } from '@/lib/api/client';
import { WebsiteDonation } from '@/website/hooks/useWebsiteContent';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, DollarSign } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading';
import { PublicPageHeader } from '@/website/components/PublicPageHeader';
import { useLanguage } from '@/hooks/useLanguage';

export default function PublicDonationsPage() {
    const { t } = useLanguage();
    const { data: donations = [], isLoading } = useQuery({
        queryKey: ['public-donations'],
        queryFn: async () => {
            const response = await publicWebsiteApi.getDonations();
            return response as unknown as WebsiteDonation[];
        },
    });

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    return (
        <div className="flex-1 min-h-screen bg-gradient-to-b from-slate-50 to-white overflow-x-hidden">
            <PublicPageHeader
                title={t('websitePublic.donationsPageTitle')}
                description={t('websitePublic.donationsPageDescription')}
            />

            <section className="container mx-auto px-4 py-12 max-w-7xl">
                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <LoadingSpinner />
                    </div>
                ) : donations.length > 0 ? (
                    <>
                        <p className="text-center text-slate-600 mb-12 max-w-2xl mx-auto">
                            {t('websitePublic.donationsPageSubtitle')}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {donations.map((donation) => {
                                const progress = donation.target_amount
                                    ? (donation.current_amount / donation.target_amount) * 100
                                    : 0;
                                return (
                                    <Card
                                        key={donation.id}
                                        className="border-emerald-100 shadow-md hover:shadow-lg transition-shadow flex flex-col"
                                    >
                                        <CardHeader>
                                            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mb-4">
                                                <Heart className="h-6 w-6 fill-current" />
                                            </div>
                                            <CardTitle className="text-xl mb-2">{donation.title}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="flex-1">
                                            <p className="text-slate-600 mb-6 min-h-[5rem]">
                                                {donation.description ||
                                                    t('websitePublic.supportDefaultDescription')}
                                            </p>
                                            {donation.target_amount ? (
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-sm font-medium">
                                                        <span className="text-emerald-700">
                                                            {formatCurrency(donation.current_amount)}{' '}
                                                            {t('websitePublic.raised')}
                                                        </span>
                                                        <span className="text-slate-500">
                                                            {t('websitePublic.goal')}:{' '}
                                                            {formatCurrency(donation.target_amount)}
                                                        </span>
                                                    </div>
                                                    <Progress
                                                        value={Math.min(progress, 100)}
                                                        className="h-2 bg-emerald-100"
                                                    />
                                                    <div className="text-right text-xs text-slate-400">
                                                        {progress.toFixed(0)}% {t('websitePublic.funded')}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-sm font-medium text-emerald-700">
                                                    <span className="text-slate-500 mr-2">
                                                        {t('websitePublic.totalRaised')}:
                                                    </span>
                                                    {formatCurrency(donation.current_amount)}
                                                </div>
                                            )}
                                        </CardContent>
                                        <CardFooter className="pt-4">
                                            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-lg py-6 shadow-sm">
                                                {t('websitePublic.donateNow')}
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                );
                            })}
                        </div>
                    </>
                ) : (
                    <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <DollarSign className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-slate-900 mb-2">
                            {t('websitePublic.noActiveDonationFunds')}
                        </h3>
                        <p className="text-slate-500">{t('websitePublic.checkBackForInitiatives')}</p>
                    </div>
                )}
            </section>
        </div>
    );
}
