import { useQuery } from '@tanstack/react-query';
import { publicWebsiteApi } from '@/lib/api/client';
import { WebsiteDonation } from '@/website/hooks/useWebsiteContent';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, DollarSign } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading';

export default function PublicDonationsPage() {
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
        <div className="container mx-auto px-4 py-12 max-w-7xl overflow-x-hidden">
            <div className="text-center mb-16">
                <h1 className="text-4xl font-bold text-slate-900 mb-4">Support Our Cause</h1>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                    Your contributions help us nurture the next generation of leaders. Choose a cause closely to your heart.
                </p>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <LoadingSpinner />
                </div>
            ) : donations.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {donations.map((donation) => {
                        const progress = donation.target_amount ? (donation.current_amount / donation.target_amount) * 100 : 0;
                        return (
                            <Card key={donation.id} className="border-emerald-100 shadow-md hover:shadow-lg transition-shadow">
                                <CardHeader>
                                    <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mb-4">
                                        <Heart className="h-6 w-6 fill-current" />
                                    </div>
                                    <CardTitle className="text-xl mb-2">{donation.title}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-slate-600 mb-6 min-h-[5rem]">
                                        {donation.description || "Support this vital initiative for our community."}
                                    </p>
                                    {donation.target_amount ? (
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm font-medium">
                                                <span className="text-emerald-700">{formatCurrency(donation.current_amount)} raised</span>
                                                <span className="text-slate-500">Goal: {formatCurrency(donation.target_amount)}</span>
                                            </div>
                                            <Progress value={Math.min(progress, 100)} className="h-2 bg-emerald-100" />
                                            <div className="text-right text-xs text-slate-400">{progress.toFixed(0)}% Funded</div>
                                        </div>
                                    ) : (
                                        <div className="text-sm font-medium text-emerald-700">
                                            <span className="text-slate-500 mr-2">Total Raised:</span>
                                            {formatCurrency(donation.current_amount)}
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter className="pt-4">
                                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-lg py-6 shadow-sm">
                                        Donate Now
                                    </Button>
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-20 bg-slate-50 rounded-lg">
                    <DollarSign className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900">No active donation funds</h3>
                    <p className="text-slate-500">Check back later for new fundraising initiatives.</p>
                </div>
            )}
        </div>
    );
}
