import { useState } from 'react';
import { useWebsiteSite } from '@/website/hooks/useWebsiteSite';
import { publicWebsiteApi } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Phone, Mail, Clock, Send, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { PublicPageHeader } from '@/website/components/PublicPageHeader';
import { showToast } from '@/lib/toast';
import { useLanguage } from '@/hooks/useLanguage';

export default function PublicContactPage() {
    const { t } = useLanguage();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Fetch site data for contact info
    // Replace with useWebsiteSite hook which uses the same endpoint but is consistent
    const { data: siteData = {} } = useWebsiteSite();
    const contactSettings = siteData.settings?.contact || {};
    const school = siteData.school;

    // Merge contact info from settings and school branding
    // Preference: School branding > Website Settings > Hardcoded fallbacks
    const contactInfo = {
        address: school?.school_address || contactSettings.address || '123 Islamic Center Drive',
        city: contactSettings.city || 'City',
        state: contactSettings.state || 'State',
        zip: contactSettings.zip || '12345',
        phone: school?.school_phone || contactSettings.phone || '+1 (555) 123-4567',
        email: school?.school_email || contactSettings.email || 'info@school.edu'
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);

        const formData = new FormData(e.currentTarget);
        const data = {
            first_name: formData.get('first_name'),
            last_name: formData.get('last_name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            subject: formData.get('subject'),
            message: formData.get('message'),
        };

        try {
            await publicWebsiteApi.submitContact(data);
            setIsSuccess(true);
            showToast.success(t('toast.contactMessageSent'));
        } catch (error) {
            console.error(error);
            showToast.error(t('toast.contactMessageFailed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="flex-1 overflow-x-hidden">
                <PublicPageHeader
                    title={t('websitePublic.messageSentTitle')}
                    description={t('websitePublic.messageSentDescription')}
                >
                    <div className="flex justify-center gap-4">
                        <Button
                            variant="secondary"
                            onClick={() => setIsSuccess(false)}
                            className="mr-0"
                        >
                            {t('websitePublic.sendAnotherMessage')}
                        </Button>
                        <Button variant="outline" className="text-white border-white hover:bg-white/10" asChild>
                            <a href="/public-site">{t('websitePublic.backToHome')}</a>
                        </Button>
                    </div>
                </PublicPageHeader>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-slate-50 overflow-x-hidden">
            {/* Header */}
            <PublicPageHeader
                title={t('websitePublic.ctaContact')}
                description={t('websitePublic.contactPageDescription')}
            />

            <section className="container mx-auto px-4 py-12 -mt-10 relative z-20">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Contact Info Cards */}
                    <Card className="shadow-lg border-0 lg:col-span-1 h-full">
                        <CardContent className="p-8 space-y-8">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 mb-6 pb-2 border-b">{t('websitePublic.getInTouch')}</h3>
                                <div className="space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 text-emerald-600">
                                            <MapPin className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-slate-900">{t('websitePublic.visitUs')}</h4>
                                            <p className="text-sm text-slate-600 mt-1">
                                                {contactInfo.address && <span dangerouslySetInnerHTML={{ __html: contactInfo.address.replace(/\n/g, '<br />') }} />}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 text-emerald-600">
                                            <Phone className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-slate-900">{t('websitePublic.callUs')}</h4>
                                            <p className="text-sm text-slate-600 mt-1">
                                                {contactInfo.phone}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-0.5">{t('websitePublic.phoneHours')}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 text-emerald-600">
                                            <Mail className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-slate-900">{t('websitePublic.emailUs')}</h4>
                                            <p className="text-sm text-slate-600 mt-1">
                                                {contactInfo.email}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-0.5">{t('websitePublic.replyWithin24Hours')}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b">{t('websitePublic.officeHours')}</h3>
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 text-emerald-600">
                                        <Clock className="h-5 w-5" />
                                    </div>
                                    <div className="text-sm text-slate-600 space-y-1 mt-1">
                                        <div className="flex justify-between gap-8">
                                            <span>{t('websitePublic.mondayFriday')}</span>
                                            <span className="font-medium text-slate-900">{t('websitePublic.mondayFridayHours')}</span>
                                        </div>
                                        <div className="flex justify-between gap-8">
                                            <span>{t('websitePublic.saturday')}</span>
                                            <span className="font-medium text-slate-900">{t('websitePublic.saturdayHours')}</span>
                                        </div>
                                        <div className="flex justify-between gap-8">
                                            <span>{t('websitePublic.sunday')}</span>
                                            <span className="text-rose-500 font-medium">{t('websitePublic.closed')}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Contact Form */}
                    <Card className="shadow-lg border-0 lg:col-span-2">
                        <CardContent className="p-8">
                            <h3 className="text-2xl font-bold text-slate-900 mb-2">{t('websitePublic.sendMessageTitle')}</h3>
                            <p className="text-slate-500 mb-8">{t('websitePublic.sendMessageDescription')}</p>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label htmlFor="first_name" className="text-sm font-medium text-slate-700">{t('websitePublic.contactFirstName')}</label>
                                        <Input id="first_name" name="first_name" required placeholder={t('websitePublic.placeholderFirstName')} />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="last_name" className="text-sm font-medium text-slate-700">{t('websitePublic.contactLastName')}</label>
                                        <Input id="last_name" name="last_name" required placeholder={t('websitePublic.placeholderLastName')} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label htmlFor="email" className="text-sm font-medium text-slate-700">{t('websitePublic.contactEmailAddress')}</label>
                                        <Input id="email" name="email" type="email" required placeholder={t('websitePublic.placeholderEmail')} />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="phone" className="text-sm font-medium text-slate-700">{t('websitePublic.contactPhoneNumber')}</label>
                                        <Input id="phone" name="phone" type="tel" placeholder={t('websitePublic.placeholderPhone')} />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="subject" className="text-sm font-medium text-slate-700">{t('websitePublic.contactSubject')}</label>
                                    <Input id="subject" name="subject" required placeholder={t('websitePublic.placeholderSubject')} />
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="message" className="text-sm font-medium text-slate-700">{t('websitePublic.contactMessage')}</label>
                                    <Textarea
                                        id="message"
                                        name="message"
                                        required
                                        placeholder={t('websitePublic.placeholderMessage')}
                                        className="min-h-[150px]"
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white min-w-[200px]"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <LoadingSpinner size="sm" />
                                            <span className="ml-2">{t('websitePublic.sending')}</span>
                                        </>
                                    ) : (
                                        <>
                                            {t('websitePublic.sendMessageButton')}
                                            <Send className="ml-2 h-4 w-4" />
                                        </>
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* Map Placeholder */}
            <section className="bg-slate-200 h-96 relative w-full">
                <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3024.2219901290355!2d-74.00369368400567!3d40.71312937933185!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c25a23e28c1191%3A0x49f75d3281df052a!2s150%20Park%20Row%2C%20New%20York%2C%20NY%2010007!5e0!3m2!1sen!2sus!4v1579767901424!5m2!1sen!2sus"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    style={{ border: 0, filter: 'grayscale(100%)' }}
                    allowFullScreen={false}
                    aria-hidden="false"
                    tabIndex={0}
                    title={t('websitePublic.schoolLocation')}
                ></iframe>
                <div className="absolute inset-0 bg-emerald-900/10 pointer-events-none"></div>
            </section>
        </div>
    );
}
