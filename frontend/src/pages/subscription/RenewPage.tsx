import { ArrowLeft, Calculator, CreditCard, CheckCircle2 } from 'lucide-react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/hooks/useLanguage';
import { 
  useSubscriptionPlans, 
  useCalculatePrice, 
  useValidateDiscountCode,
  useCreateRenewalRequest,
  type SubscriptionPlan,
} from '@/hooks/useSubscription';
import { LoadingSpinner } from '@/components/ui/loading';

const renewalSchema = z.object({
  currency: z.enum(['AFN', 'USD']),
  discountCode: z.string().optional(),
  additionalSchools: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

type RenewalFormData = z.infer<typeof renewalSchema>;

export default function RenewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t: _t, isRTL } = useLanguage();
  
  const planId = searchParams.get('plan');
  const schoolsParam = searchParams.get('schools');
  const additionalSchools = schoolsParam ? parseInt(schoolsParam, 10) : 0;

  const { data: plans, isLoading: plansLoading } = useSubscriptionPlans();
  const calculatePrice = useCalculatePrice();
  const validateDiscount = useValidateDiscountCode();
  const createRenewal = useCreateRenewalRequest();

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [discountValid, setDiscountValid] = useState<boolean | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<RenewalFormData>({
    resolver: zodResolver(renewalSchema),
    defaultValues: {
      currency: 'AFN',
      additionalSchools: additionalSchools || 0,
      discountCode: '',
      notes: '',
    },
  });

  const currency = watch('currency');
  const discountCode = watch('discountCode');
  const additionalSchoolsValue = watch('additionalSchools') || 0;

  // Find selected plan
  useEffect(() => {
    if (plans && planId) {
      const plan = plans.find((p) => p.id === planId);
      setSelectedPlan(plan || null);
    }
  }, [plans, planId]);

  // Calculate price when inputs change (but only if discount is validated or empty)
  useEffect(() => {
    if (selectedPlan && currency) {
      // Only include discount code if it's been validated
      const discountToUse = (discountValid === true && discountCode) ? discountCode : undefined;
      
      calculatePrice.mutate({
        plan_id: selectedPlan.id,
        additional_schools: additionalSchoolsValue,
        discount_code: discountToUse,
        currency,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlan, currency, additionalSchoolsValue, discountValid]);

  // Validate discount code
  const handleValidateDiscount = async () => {
    if (!discountCode || !selectedPlan) return;

    setDiscountValid(null);
    setDiscountError(null);

    try {
      const result = await validateDiscount.mutateAsync({
        code: discountCode,
        plan_id: selectedPlan.id,
      });

      if (result.valid) {
        setDiscountValid(true);
        // Recalculate price with discount
        calculatePrice.mutate({
          plan_id: selectedPlan.id,
          additional_schools: additionalSchoolsValue,
          discount_code: discountCode,
          currency,
        });
      } else {
        setDiscountValid(false);
        setDiscountError(result.message || 'Invalid discount code');
      }
    } catch (error: any) {
      setDiscountValid(false);
      setDiscountError(error.message || 'Failed to validate discount code');
    }
  };

  const onSubmit = async (data: RenewalFormData) => {
    if (!selectedPlan) return;

    try {
      await createRenewal.mutateAsync({
        plan_id: selectedPlan.id,
        additional_schools: data.additionalSchools || 0,
        discount_code: data.discountCode || undefined,
        notes: data.notes || undefined,
      });

      navigate('/subscription');
    } catch (error: any) {
      // Error is handled by the hook
    }
  };

  if (plansLoading) {
    return (
      <div className="container mx-auto py-6">
        <LoadingSpinner size="lg" text="Loading plans..." />
      </div>
    );
  }

  if (!selectedPlan) {
    return (
      <div className="container mx-auto py-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/subscription/plans">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Renew Subscription</h1>
            <p className="text-muted-foreground">Plan not found</p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">The selected plan could not be found.</p>
            <Button asChild className="mt-4">
              <Link to="/subscription/plans">Back to Plans</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const priceBreakdown = calculatePrice.data;

  return (
    <div className="container mx-auto py-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/subscription/plans">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Renew Subscription</h1>
          <p className="text-muted-foreground">Complete your subscription renewal</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Left Column - Form */}
          <div className="space-y-6">
            {/* Selected Plan */}
            <Card>
              <CardHeader>
                <CardTitle>Selected Plan</CardTitle>
                <CardDescription>{selectedPlan.name}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{selectedPlan.description}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{selectedPlan.slug}</Badge>
                    {selectedPlan.isDefault && (
                      <Badge variant="secondary">Default</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Currency Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Currency</CardTitle>
              </CardHeader>
              <CardContent>
                <Controller
                  control={control}
                  name="currency"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AFN">AFN (Afghan Afghani)</SelectItem>
                        <SelectItem value="USD">USD (US Dollar)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </CardContent>
            </Card>

            {/* Additional Schools */}
            {selectedPlan.maxSchools > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Additional Schools</CardTitle>
                  <CardDescription>
                    Add more schools to your subscription (up to {selectedPlan.maxSchools} total)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="additionalSchools">Number of Additional Schools</Label>
                    <Input
                      id="additionalSchools"
                      type="number"
                      min="0"
                      max={selectedPlan.maxSchools}
                      {...register('additionalSchools', { valueAsNumber: true })}
                    />
                    {errors.additionalSchools && (
                      <p className="text-sm text-destructive">
                        {errors.additionalSchools.message}
                      </p>
                    )}
                    {selectedPlan.perSchoolPriceAfn > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {currency === 'AFN' 
                          ? `${selectedPlan.perSchoolPriceAfn} AFN per school/year`
                          : `${selectedPlan.perSchoolPriceUsd} USD per school/year`}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Discount Code */}
            <Card>
              <CardHeader>
                <CardTitle>Discount Code (Optional)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter discount code"
                    {...register('discountCode')}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleValidateDiscount}
                    disabled={!discountCode || validateDiscount.isPending}
                  >
                    Validate
                  </Button>
                </div>
                {discountValid === true && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm">Discount code is valid</span>
                  </div>
                )}
                {discountValid === false && discountError && (
                  <p className="text-sm text-destructive">{discountError}</p>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Notes (Optional)</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Any additional information..."
                  {...register('notes')}
                  rows={4}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Price Breakdown */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Price Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                {calculatePrice.isPending ? (
                  <div className="py-8 text-center">
                    <LoadingSpinner size="sm" text="Calculating..." />
                  </div>
                ) : priceBreakdown ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Base Price:</span>
                        <span className="font-medium">
                          {priceBreakdown.currency === 'AFN' 
                            ? `${priceBreakdown.basePrice.toLocaleString()} AFN`
                            : `$${priceBreakdown.basePrice.toLocaleString()}`}
                        </span>
                      </div>
                      {priceBreakdown.additionalSchools > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Additional Schools ({priceBreakdown.additionalSchools}):
                          </span>
                          <span className="font-medium">
                            {priceBreakdown.currency === 'AFN' 
                              ? `${priceBreakdown.schoolsPrice.toLocaleString()} AFN`
                              : `$${priceBreakdown.schoolsPrice.toLocaleString()}`}
                          </span>
                        </div>
                      )}
                      {priceBreakdown.discountAmount > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Discount:</span>
                          <span className="font-medium">
                            -{priceBreakdown.currency === 'AFN' 
                              ? `${priceBreakdown.discountAmount.toLocaleString()} AFN`
                              : `$${priceBreakdown.discountAmount.toLocaleString()}`}
                          </span>
                        </div>
                      )}
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">Total:</span>
                      <span className="text-2xl font-bold">
                        {priceBreakdown.currency === 'AFN' 
                          ? `${priceBreakdown.total.toLocaleString()} AFN`
                          : `$${priceBreakdown.total.toLocaleString()}`}
                      </span>
                    </div>
                    {priceBreakdown.discountInfo && (
                      <div className="mt-2 p-2 bg-green-50 rounded text-sm text-green-700">
                        <p>
                          Discount: {priceBreakdown.discountInfo.code} (
                          {priceBreakdown.discountInfo.type === 'percentage' 
                            ? `${priceBreakdown.discountInfo.value}%`
                            : `${priceBreakdown.currency === 'AFN' ? `${priceBreakdown.discountInfo.value} AFN` : `$${priceBreakdown.discountInfo.value}`}`}
                          )
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Select options to see price</p>
                )}
              </CardContent>
            </Card>

            {/* Submit Button */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={createRenewal.isPending || !priceBreakdown}
                  >
                    {createRenewal.isPending ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Submit Renewal Request
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    asChild
                  >
                    <Link to="/subscription/plans">Back to Plans</Link>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-4 text-center">
                  After submitting, our team will verify your payment and activate your subscription.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}

