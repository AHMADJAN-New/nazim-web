import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useWebsiteSite } from '@/website/hooks/useWebsiteSite';
import { publicWebsiteApi } from '@/lib/api/client';
import { LoadingSpinner } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Phone, Mail, Clock, Send, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent } from '@/components/ui/card';

export default function PublicContactPage() {
    const { toast } = useToast();
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
            toast({
                title: "Message Sent!",
                description: "Thank you for contacting us. We will get back to you shortly.",
            });
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "Failed to send message. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="flex-1">
                <section className="bg-emerald-900 text-white py-16 md:py-24 relative overflow-hidden">
                    <div className="container mx-auto px-4 relative z-10 text-center">
                        <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-300">
                            <CheckCircle className="h-10 w-10 text-white" />
                        </div>
                        <h1 className="text-3xl md:text-5xl font-bold mb-4">Message Sent!</h1>
                        <p className="text-emerald-200 max-w-lg mx-auto mb-8">
                            Thank you for reaching out to us. A member of our team has received your message and will respond as soon as possible.
                        </p>
                        <Button
                            variant="secondary"
                            onClick={() => setIsSuccess(false)}
                            className="mr-4"
                        >
                            Send Another Message
                        </Button>
                        <Button variant="outline" className="text-white border-white hover:bg-white/10" asChild>
                            <a href="/public-site">Back to Home</a>
                        </Button>
                    </div>
                </section>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-slate-50">
            {/* Header */}
            <section className="bg-emerald-900 text-white py-16 md:py-24 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }}></div>
                <div className="container mx-auto px-4 relative z-10 text-center">
                    <h1 className="text-3xl md:text-5xl font-bold mb-4">Contact Us</h1>
                    <p className="text-emerald-200 max-w-2xl mx-auto">
                        Have questions about admissions, programs, or events? We're here to help.
                    </p>
                </div>
            </section>

            <section className="container mx-auto px-4 py-12 -mt-10 relative z-20">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Contact Info Cards */}
                    <Card className="shadow-lg border-0 lg:col-span-1 h-full">
                        <CardContent className="p-8 space-y-8">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 mb-6 pb-2 border-b">Get in Touch</h3>
                                <div className="space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 text-emerald-600">
                                            <MapPin className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-slate-900">Visit Us</h4>
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
                                            <h4 className="font-medium text-slate-900">Call Us</h4>
                                            <p className="text-sm text-slate-600 mt-1">
                                                {contactInfo.phone}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-0.5">Mon-Fri from 8am to 5pm</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 text-emerald-600">
                                            <Mail className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-slate-900">Email Us</h4>
                                            <p className="text-sm text-slate-600 mt-1">
                                                {contactInfo.email}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-0.5">We usually reply within 24 hours</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b">Office Hours</h3>
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 text-emerald-600">
                                        <Clock className="h-5 w-5" />
                                    </div>
                                    <div className="text-sm text-slate-600 space-y-1 mt-1">
                                        <div className="flex justify-between gap-8">
                                            <span>Monday - Friday</span>
                                            <span className="font-medium text-slate-900">8:00 AM - 5:00 PM</span>
                                        </div>
                                        <div className="flex justify-between gap-8">
                                            <span>Saturday</span>
                                            <span className="font-medium text-slate-900">9:00 AM - 1:00 PM</span>
                                        </div>
                                        <div className="flex justify-between gap-8">
                                            <span>Sunday</span>
                                            <span className="text-rose-500 font-medium">Closed</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Contact Form */}
                    <Card className="shadow-lg border-0 lg:col-span-2">
                        <CardContent className="p-8">
                            <h3 className="text-2xl font-bold text-slate-900 mb-2">Send us a Message</h3>
                            <p className="text-slate-500 mb-8">We'd love to hear from you. Please fill out this form we'll get in touch shortly.</p>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label htmlFor="first_name" className="text-sm font-medium text-slate-700">First Name</label>
                                        <Input id="first_name" name="first_name" required placeholder="Ali" />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="last_name" className="text-sm font-medium text-slate-700">Last Name</label>
                                        <Input id="last_name" name="last_name" required placeholder="Khan" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label htmlFor="email" className="text-sm font-medium text-slate-700">Email Address</label>
                                        <Input id="email" name="email" type="email" required placeholder="ali@example.com" />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="phone" className="text-sm font-medium text-slate-700">Phone Number</label>
                                        <Input id="phone" name="phone" type="tel" placeholder="+1 (555) 000-0000" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="subject" className="text-sm font-medium text-slate-700">Subject</label>
                                    <Input id="subject" name="subject" required placeholder="Admissions Inquiry" />
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="message" className="text-sm font-medium text-slate-700">Message</label>
                                    <Textarea
                                        id="message"
                                        name="message"
                                        required
                                        placeholder="How can we help you today?"
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
                                            <span className="ml-2">Sending...</span>
                                        </>
                                    ) : (
                                        <>
                                            Send Message
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
                    title="School Location"
                ></iframe>
                <div className="absolute inset-0 bg-emerald-900/10 pointer-events-none"></div>
            </section>
        </div>
    );
}
