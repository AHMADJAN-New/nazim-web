import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Palette } from 'lucide-react';
import { useSystemSettings, useUpdateSystemSettings } from '@/hooks/useSystemSettings';
import { useAuth } from '@/hooks/useAuth';

export default function AppearanceSettingsPage() {
  const { user } = useAuth();
  const { data: settings } = useSystemSettings();
  const updateSettings = useUpdateSystemSettings();

  const [formData, setFormData] = useState({
    primary_color: settings?.primary_color || '#3b82f6',
    secondary_color: settings?.secondary_color || '#64748b',
    accent_color: settings?.accent_color || '#06b6d4',
    report_header_text: settings?.report_header_text || '',
    report_footer_text: settings?.report_footer_text || '',
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
            <Palette className="w-8 h-8" />
            Appearance Settings
          </h1>
          <p className="text-muted-foreground">
            Customize the visual appearance and branding of your system
          </p>
        </div>
        <Button onClick={handleSave} size="lg">
          Save Changes
        </Button>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Color Theme</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="primary_color">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primary_color"
                    type="color"
                    value={formData.primary_color}
                    onChange={(e) => handleInputChange('primary_color', e.target.value)}
                    className="w-16 h-10"
                  />
                  <Input
                    value={formData.primary_color}
                    onChange={(e) => handleInputChange('primary_color', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="secondary_color">Secondary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="secondary_color"
                    type="color"
                    value={formData.secondary_color}
                    onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                    className="w-16 h-10"
                  />
                  <Input
                    value={formData.secondary_color}
                    onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="accent_color">Accent Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="accent_color"
                    type="color"
                    value={formData.accent_color}
                    onChange={(e) => handleInputChange('accent_color', e.target.value)}
                    className="w-16 h-10"
                  />
                  <Input
                    value={formData.accent_color}
                    onChange={(e) => handleInputChange('accent_color', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Report Customization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="report_header_text">Report Header Text</Label>
              <Textarea
                id="report_header_text"
                value={formData.report_header_text}
                onChange={(e) => handleInputChange('report_header_text', e.target.value)}
                placeholder="Text to appear at the top of reports"
              />
            </div>
            <div>
              <Label htmlFor="report_footer_text">Report Footer Text</Label>
              <Textarea
                id="report_footer_text"
                value={formData.report_footer_text}
                onChange={(e) => handleInputChange('report_footer_text', e.target.value)}
                placeholder="Text to appear at the bottom of reports"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}