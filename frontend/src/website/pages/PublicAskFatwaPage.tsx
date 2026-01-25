
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { publicWebsiteApi } from '@/lib/api/client';
import { LoadingSpinner } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, Send, HelpCircle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PublicAskFatwaPage() {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
        queryKey: ['public-fatwa-categories'],
        queryFn: async () => {
            const response = await publicWebsiteApi.getFatwaCategories();
            return (response as any).data || response;
        }
    });

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);

        const formData = new FormData(e.currentTarget);
        const data = {
            category_id: formData.get('category_id') as string,
            name: formData.get('name') as string,
            email: formData.get('email') as string,
            phone: formData.get('phone') as string,
            question_text: formData.get('question_text') as string,
            is_anonymous: formData.get('is_anonymous') === 'on',
        };

        try {
            await publicWebsiteApi.submitFatwaQuestion(data);
            setIsSuccess(true);
            toast({
                title: "Question Submitted",
                description: "Your question has been received. Our scholars will review it shortly.",
            });
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "Failed to submit question. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderCategoryOptions = (cats: any[], depth = 0) => {
        return cats.map(cat => (
            <>
                <SelectItem key={cat.id} value={cat.id}>
                    {'\u00A0\u00A0'.repeat(depth)}{cat.name}
                </SelectItem>
                {cat.children && cat.children.length > 0 && renderCategoryOptions(cat.children, depth + 1)}
            </>
        ));
    };

    if (isSuccess) {
        return (
            <div className="flex-1 bg-slate-50 flex items-center justify-center py-20 px-4">
                <Card className="max-w-xl w-full text-center p-8 shadow-xl border-emerald-100">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="h-10 w-10 text-emerald-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-emerald-800 mb-2">Question Submitted!</h1>
                    <p className="text-slate-600 mb-8 max-w-sm mx-auto">
                        JazakAllah Khair. Your question has been sent to our scholars. You will receive an answer via email once it is reviewed.
                    </p>
                    <div className="flex gap-4 justify-center">
                        <Button variant="outline" onClick={() => setIsSuccess(false)}>
                            Ask Another Question
                        </Button>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" asChild>
                            <Link to="/public-site/fatwas">Browse Fatwas</Link>
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-slate-50 pb-20">
            {/* Header */}
            <section className="bg-emerald-900 text-white py-16 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }}></div>
                <div className="container mx-auto px-4 relative z-10 text-center">
                    <h1 className="text-3xl md:text-4xl font-bold mb-4">Ask a Question</h1>
                    <p className="text-emerald-200 max-w-2xl mx-auto">
                        Seek guidance from our qualified scholars on matters of faith and daily life.
                    </p>
                </div>
            </section>

            <section className="container mx-auto px-4 -mt-8 relative z-20">
                <div className="max-w-3xl mx-auto">
                    <Card className="shadow-lg border-0">
                        <CardHeader className="bg-white border-b px-8 py-6 rounded-t-xl">
                            <CardTitle className="flex items-center gap-2">
                                <HelpCircle className="h-5 w-5 text-emerald-600" />
                                Submit Your Question
                            </CardTitle>
                            <CardDescription>
                                Please provide as much detail as possible to help us give you an accurate answer.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-8">
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8 flex gap-3 text-sm text-amber-800">
                                <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
                                <div>
                                    <p className="font-medium mb-1">Important Note:</p>
                                    <p>We strive to answer all questions within 3-5 business days. Please do not submit duplicate questions. For complex personal matters, consider visiting us in person.</p>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="category_id">Topic / Category</Label>
                                    <Select name="category_id">
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select a topic" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                {isLoadingCategories ? (
                                                    <div className="p-2 text-center text-sm text-slate-500">Loading topics...</div>
                                                ) : (
                                                    renderCategoryOptions(categories)
                                                )}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Name</Label>
                                        <Input id="name" name="name" placeholder="Optional" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone Number</Label>
                                        <Input id="phone" name="phone" placeholder="Optional" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address <span className="text-red-500">*</span></Label>
                                    <Input id="email" name="email" type="email" required placeholder="To receive the answer" />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="question_text">Your Question <span className="text-red-500">*</span></Label>
                                    <Textarea
                                        id="question_text"
                                        name="question_text"
                                        required
                                        placeholder="Type your question here..."
                                        className="min-h-[200px]"
                                    />
                                </div>

                                <div className="flex items-center space-x-2 pt-2">
                                    <Checkbox id="is_anonymous" name="is_anonymous" />
                                    <label
                                        htmlFor="is_anonymous"
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        Keep my question anonymous if published
                                    </label>
                                </div>

                                <div className="pt-4 flex gap-4 justify-end">
                                    <Button variant="ghost" asChild>
                                        <Link to="/public-site/fatwas">Cancel</Link>
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[150px]"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <LoadingSpinner size="sm" />
                                                <span className="ml-2">Submitting...</span>
                                            </>
                                        ) : (
                                            <>
                                                Submit Question
                                                <Send className="ml-2 h-4 w-4" />
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </section>
        </div>
    );
}
