import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Settings, School, Palette, Bell, Globe, DollarSign, Calendar } from 'lucide-react';
import { useSystemSettings, useUpdateSystemSettings } from '@/hooks/useSystemSettings';
import { useAuth } from '@/hooks/useAuth';

export default function SettingsPage() {
  const { user } = useAuth();
  const { data: settings } = useSystemSettings();
  const updateSettings = useUpdateSystemSettings();

  const [formData, setFormData] = useState({
    // School Information
    school_name: 'School Management System',
    school_logo_url: '',
    school_address: '',
    school_phone: '',
    school_email: '',
    school_website: '',
    
    // Academic Settings
    academic_year_start_month: 4,
    academic_year_end_month: 3,
    max_students_per_class: 30,
    passing_grade_percentage: 60,
    
    // System Preferences
    default_language: 'en',
    currency_symbol: '$',
    date_format: 'DD/MM/YYYY',
    time_format: '24h',
    timezone: 'UTC',
    
    // Appearance
    primary_color: '#3b82f6',
    secondary_color: '#64748b',
    accent_color: '#06b6d4',
    
    // Reports
    report_header_text: '',
    report_footer_text: '',
    
    // Communication
    enable_notifications: true,
    enable_sms: false,
    enable_email: true,
    
    // Financial
    late_fee_amount: 0,
  });

  useEffect(() => {
    if (settings) {
      setFormData(prev => ({ ...prev, ...settings }));
    }
  }, [settings]);

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
            <Settings className="w-8 h-8" />
            System Settings
          </h1>
          <p className="text-muted-foreground">
            Configure your school management system settings and preferences
          </p>
        </div>
        <Button onClick={handleSave} size="lg">
          Save All Changes
        </Button>
      </div>

      <Tabs defaultValue="school" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="school" className="flex items-center gap-2">
            <School className="w-4 h-4" />
            School
          </TabsTrigger>
          <TabsTrigger value="academic" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Academic
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            System
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="communication" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Communication
          </TabsTrigger>
          <TabsTrigger value="financial" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Financial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="school" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>School Information</CardTitle>
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
        </TabsContent>

        <TabsContent value="academic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Academic Year Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="academic_year_start_month">Academic Year Start Month</Label>
                  <Select
                    value={formData.academic_year_start_month.toString()}
                    onValueChange={(value) => handleInputChange('academic_year_start_month', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        { value: 1, label: 'January' }, { value: 2, label: 'February' },
                        { value: 3, label: 'March' }, { value: 4, label: 'April' },
                        { value: 5, label: 'May' }, { value: 6, label: 'June' },
                        { value: 7, label: 'July' }, { value: 8, label: 'August' },
                        { value: 9, label: 'September' }, { value: 10, label: 'October' },
                        { value: 11, label: 'November' }, { value: 12, label: 'December' }
                      ].map((month) => (
                        <SelectItem key={month.value} value={month.value.toString()}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="academic_year_end_month">Academic Year End Month</Label>
                  <Select
                    value={formData.academic_year_end_month.toString()}
                    onValueChange={(value) => handleInputChange('academic_year_end_month', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        { value: 1, label: 'January' }, { value: 2, label: 'February' },
                        { value: 3, label: 'March' }, { value: 4, label: 'April' },
                        { value: 5, label: 'May' }, { value: 6, label: 'June' },
                        { value: 7, label: 'July' }, { value: 8, label: 'August' },
                        { value: 9, label: 'September' }, { value: 10, label: 'October' },
                        { value: 11, label: 'November' }, { value: 12, label: 'December' }
                      ].map((month) => (
                        <SelectItem key={month.value} value={month.value.toString()}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="max_students_per_class">Max Students Per Class</Label>
                  <Input
                    id="max_students_per_class"
                    type="number"
                    value={formData.max_students_per_class}
                    onChange={(e) => handleInputChange('max_students_per_class', parseInt(e.target.value) || 30)}
                  />
                </div>
                <div>
                  <Label htmlFor="passing_grade_percentage">Passing Grade Percentage</Label>
                  <Input
                    id="passing_grade_percentage"
                    type="number"
                    value={formData.passing_grade_percentage}
                    onChange={(e) => handleInputChange('passing_grade_percentage', parseFloat(e.target.value) || 60)}
                    min="0"
                    max="100"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Preferences</CardTitle>
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
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
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

              <Separator />

              <div className="space-y-4">
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="communication" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Communication Settings</CardTitle>
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
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Financial Settings</CardTitle>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}