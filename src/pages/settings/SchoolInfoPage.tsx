import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Settings, School } from 'lucide-react';
import { useSystemSettings, useUpdateSystemSettings } from '@/hooks/useSystemSettings';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';

export default function SchoolInfoPage() {
  const { user } = useAuth();
  const { data: settings } = useSystemSettings();
  const updateSettings = useUpdateSystemSettings();

  const [formData, setFormData] = useState({
    school_name: settings?.school_name || 'School Management System',
    school_logo_url: settings?.school_logo_url || '',
    school_address: settings?.school_address || '',
    school_phone: settings?.school_phone || '',
    school_email: settings?.school_email || '',
    school_website: settings?.school_website || '',
  });

  const handleSave = async () => {
    if (!user) return;
    await updateSettings.mutateAsync(formData);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <MainLayout title="School Information">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <School className="w-8 h-8" />
            School Information
          </h1>
          <p className="text-muted-foreground">
            Configure your school's basic information and branding
          </p>
        </div>
        <Button onClick={handleSave} size="lg">
          Save Changes
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>School Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="school_name">School Name</Label>
              <Input
                id="school_name"
                value={formData.school_name}
                onChange={(e) => handleInputChange('school_name', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="school_website">Website</Label>
              <Input
                id="school_website"
                value={formData.school_website}
                onChange={(e) => handleInputChange('school_website', e.target.value)}
                placeholder="https://www.school.com"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="school_address">Address</Label>
            <Textarea
              id="school_address"
              value={formData.school_address}
              onChange={(e) => handleInputChange('school_address', e.target.value)}
              placeholder="Enter complete school address"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="school_phone">Phone Number</Label>
              <Input
                id="school_phone"
                value={formData.school_phone}
                onChange={(e) => handleInputChange('school_phone', e.target.value)}
                placeholder="+1 234 567 8900"
              />
            </div>
            <div>
              <Label htmlFor="school_email">Email</Label>
              <Input
                id="school_email"
                type="email"
                value={formData.school_email}
                onChange={(e) => handleInputChange('school_email', e.target.value)}
                placeholder="info@school.com"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="school_logo_url">School Logo URL</Label>
            <Input
              id="school_logo_url"
              value={formData.school_logo_url}
              onChange={(e) => handleInputChange('school_logo_url', e.target.value)}
              placeholder="https://example.com/logo.png"
            />
            {formData.school_logo_url && (
              <div className="mt-2">
                <img 
                  src={formData.school_logo_url} 
                  alt="School Logo Preview" 
                  className="w-20 h-20 object-contain border rounded"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </MainLayout>
  );
}