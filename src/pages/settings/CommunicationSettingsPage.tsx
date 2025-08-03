import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Bell } from 'lucide-react';
import { useSystemSettings, useUpdateSystemSettings } from '@/hooks/useSystemSettings';
import { useAuth } from '@/hooks/useAuth';

export default function CommunicationSettingsPage() {
  const { user } = useAuth();
  const { data: settings } = useSystemSettings();
  const updateSettings = useUpdateSystemSettings();

  const [formData, setFormData] = useState({
    enable_notifications: settings?.enable_notifications ?? true,
    enable_sms: settings?.enable_sms ?? false,
    enable_email: settings?.enable_email ?? true,
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
            <Bell className="w-8 h-8" />
            Communication Settings
          </h1>
          <p className="text-muted-foreground">
            Configure how the system communicates with users
          </p>
        </div>
        <Button onClick={handleSave} size="lg">
          Save Changes
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Communication Channels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="enable_notifications">Enable Notifications</Label>
                <p className="text-sm text-muted-foreground">Allow system to send notifications</p>
              </div>
              <Switch
                id="enable_notifications"
                checked={formData.enable_notifications}
                onCheckedChange={(checked) => handleInputChange('enable_notifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="enable_email">Enable Email</Label>
                <p className="text-sm text-muted-foreground">Allow system to send emails</p>
              </div>
              <Switch
                id="enable_email"
                checked={formData.enable_email}
                onCheckedChange={(checked) => handleInputChange('enable_email', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="enable_sms">Enable SMS</Label>
                <p className="text-sm text-muted-foreground">Allow system to send SMS messages</p>
              </div>
              <Switch
                id="enable_sms"
                checked={formData.enable_sms}
                onCheckedChange={(checked) => handleInputChange('enable_sms', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}