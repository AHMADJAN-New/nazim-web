import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign } from 'lucide-react';
import { useSystemSettings, useUpdateSystemSettings } from '@/hooks/useSystemSettings';
import { useAuth } from '@/hooks/useAuth';

export default function FinancialSettingsPage() {
  const { user } = useAuth();
  const { data: settings } = useSystemSettings();
  const updateSettings = useUpdateSystemSettings();

  const [formData, setFormData] = useState({
    late_fee_amount: settings?.late_fee_amount || 0,
    currency_symbol: settings?.currency_symbol || '$',
  });

  const handleSave = async () => {
    if (!user) return;
    await updateSettings.mutateAsync(formData);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <DollarSign className="w-8 h-8" />
            Financial Settings
          </h1>
          <p className="text-muted-foreground">
            Configure financial parameters and fee structures
          </p>
        </div>
        <Button onClick={handleSave} size="lg">
          Save Changes
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fee Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="late_fee_amount">Late Fee Amount ({formData.currency_symbol})</Label>
            <Input
              id="late_fee_amount"
              type="number"
              value={formData.late_fee_amount}
              onChange={(e) => handleInputChange('late_fee_amount', parseFloat(e.target.value) || 0)}
              min="0"
              step="0.01"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Amount to charge for late fee payments
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}