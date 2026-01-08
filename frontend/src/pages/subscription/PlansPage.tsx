import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';

import { PlanSelector } from '@/components/subscription/PlanSelector';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/hooks/useLanguage';
import { useSubscriptionStatus, type SubscriptionPlan } from '@/hooks/useSubscription';


export default function PlansPage() {
  const navigate = useNavigate();
  const { t: _t, isRTL } = useLanguage();
  const { data: status } = useSubscriptionStatus();

  const handleSelectPlan = (plan: SubscriptionPlan, additionalSchools: number) => {
    // Navigate to renewal page with selected plan
    navigate(`/subscription/renew?plan=${plan.id}&schools=${additionalSchools}`);
  };

  return (
    <div className="container mx-auto py-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/subscription">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Subscription Plans</h1>
          <p className="text-muted-foreground">Choose the plan that fits your needs</p>
        </div>
      </div>

      <Card>
        <CardHeader className="text-center">
          <CardTitle>Select Your Plan</CardTitle>
          <CardDescription>
            All plans include yearly subscription with 14-day grace period after expiry
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PlanSelector 
            onSelectPlan={handleSelectPlan}
            currentPlanSlug={status?.plan?.slug}
          />
        </CardContent>
      </Card>

      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium">What happens when my subscription expires?</h4>
            <p className="text-muted-foreground text-sm mt-1">
              After your subscription expires, you have a 14-day grace period with full access to all features. 
              During this grace period, you can continue using the system normally while you renew your subscription. 
              After the grace period ends, your account enters a 60-day (2-month) read-only mode where you can view 
              but not edit data. After the read-only period ends, your account will be completely blocked until renewal.
            </p>
          </div>
          <div>
            <h4 className="font-medium">How do I pay for my subscription?</h4>
            <p className="text-muted-foreground text-sm mt-1">
              We accept manual payments including bank transfer, cash, check, and mobile money. 
              After submitting your payment details through the renewal request form, our team will verify 
              and activate your subscription. You will receive a confirmation once your payment is processed.
            </p>
          </div>
          <div>
            <h4 className="font-medium">Can I add more schools later?</h4>
            <p className="text-muted-foreground text-sm mt-1">
              Yes! Enterprise plan supports multiple schools. You can add additional schools as add-ons 
              to your subscription at any time. Additional schools are billed at a per-school rate and 
              will be added to your current subscription period.
            </p>
          </div>
          <div>
            <h4 className="font-medium">Can I upgrade my plan?</h4>
            <p className="text-muted-foreground text-sm mt-1">
              Yes, you can upgrade to a higher plan at any time. The price difference will be calculated 
              based on your remaining subscription period, and you will only pay the prorated difference 
              for the time remaining in your current billing cycle.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
