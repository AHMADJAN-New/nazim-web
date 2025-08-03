import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe } from 'lucide-react';
import { useSystemSettings, useUpdateSystemSettings } from '@/hooks/useSystemSettings';
import { useAuth } from '@/hooks/useAuth';

export default function SystemSettingsPage() {
  const { user } = useAuth();
  const { data: settings } = useSystemSettings();
  const updateSettings = useUpdateSystemSettings();

  const [formData, setFormData] = useState({
    default_language: settings?.default_language || 'en',
    currency_symbol: settings?.currency_symbol || '$',
    date_format: settings?.date_format || 'DD/MM/YYYY',
    time_format: settings?.time_format || '24h',
    timezone: settings?.timezone || 'UTC',
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
            <Globe className="w-8 h-8" />
            System Preferences
          </h1>
          <p className="text-muted-foreground">
            Configure system-wide preferences and regional settings
          </p>
        </div>
        <Button onClick={handleSave} size="lg">
          Save Changes
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Regional Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="default_language">Default Language</Label>
              <Select
                value={formData.default_language}
                onValueChange={(value) => handleInputChange('default_language', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ur">Urdu</SelectItem>
                  <SelectItem value="ar">Arabic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={formData.timezone}
                onValueChange={(value) => handleInputChange('timezone', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="Asia/Karachi">Pakistan (PKT)</SelectItem>
                  <SelectItem value="America/New_York">Eastern Time</SelectItem>
                  <SelectItem value="Europe/London">London Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="currency_symbol">Currency Symbol</Label>
              <Input
                id="currency_symbol"
                value={formData.currency_symbol}
                onChange={(e) => handleInputChange('currency_symbol', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="date_format">Date Format</Label>
              <Select
                value={formData.date_format}
                onValueChange={(value) => handleInputChange('date_format', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="time_format">Time Format</Label>
              <Select
                value={formData.time_format}
                onValueChange={(value) => handleInputChange('time_format', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12h">12 Hour</SelectItem>
                  <SelectItem value="24h">24 Hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}