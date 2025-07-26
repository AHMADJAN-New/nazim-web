// Nazim School Management System - Settings & Configuration
import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Settings,
  School,
  Users,
  Bell,
  Shield,
  Database,
  Palette,
  Globe,
  Save,
  Upload,
  Download,
  RefreshCw,
  Eye,
  EyeOff,
  Check
} from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

export default function SettingsPage() {
  const { t, language, setLanguage } = useLanguage();
  const [showApiKey, setShowApiKey] = useState(false);
  const [schoolSettings, setSchoolSettings] = useState({
    name: "Nazim Islamic School",
    address: "Street 45, Block C, Model Town, Lahore",
    phone: "+92-42-12345678",
    email: "info@nazimschool.edu.pk",
    website: "www.nazimschool.edu.pk",
    established: "1995",
    logo: "",
    motto: "Education with Islamic Values"
  });

  const [systemSettings, setSystemSettings] = useState({
    timeZone: "Asia/Karachi",
    dateFormat: "DD/MM/YYYY",
    currency: "PKR",
    academicYear: "2024-2025",
    sessionStart: "April",
    sessionEnd: "March",
    workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    weekStart: "Monday"
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: true,
    pushNotifications: false,
    attendanceAlerts: true,
    feeReminders: true,
    examNotifications: true,
    eventReminders: true,
    systemAlerts: true
  });

  const [securitySettings, setSecuritySettings] = useState({
    passwordMinLength: 8,
    passwordComplexity: true,
    sessionTimeout: 30,
    twoFactorAuth: false,
    loginAttempts: 5,
    accountLockout: 15,
    auditLogs: true,
    dataEncryption: true
  });

  const [backupSettings, setBackupSettings] = useState({
    autoBackup: true,
    backupFrequency: "daily",
    backupTime: "02:00",
    retentionDays: 30,
    cloudBackup: false,
    backupLocation: "local"
  });

  const [integrationSettings, setIntegrationSettings] = useState({
    smsProvider: "twilio",
    smsApiKey: "sk_test_****",
    emailProvider: "smtp",
    emailServer: "smtp.gmail.com",
    emailPort: "587",
    emailUsername: "",
    emailPassword: "",
    paymentGateway: "stripe",
    paymentApiKey: "pk_test_****"
  });

  return (
    <MainLayout
      title={t('nav.settings')}
      showBreadcrumb={true}
      breadcrumbItems={[
        { label: t('nav.settings') }
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">System Settings</h2>
            <p className="text-muted-foreground">
              Configure school information, system preferences, and integrations
            </p>
          </div>
          <Button>
            <Save className="h-4 w-4 mr-2" />
            Save All Changes
          </Button>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="school" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-7 lg:w-auto">
            <TabsTrigger value="school" className="flex items-center gap-2">
              <School className="h-4 w-4" />
              <span className="hidden sm:inline">School</span>
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">System</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="backup" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Backup</span>
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Integrations</span>
            </TabsTrigger>
          </TabsList>

          {/* School Information Tab */}
          <TabsContent value="school" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>School Information</CardTitle>
                <CardDescription>
                  Basic information about your school that appears on reports and documents
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="school-name">School Name</Label>
                    <Input
                      id="school-name"
                      value={schoolSettings.name}
                      onChange={(e) => setSchoolSettings({...schoolSettings, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="established">Established Year</Label>
                    <Input
                      id="established"
                      value={schoolSettings.established}
                      onChange={(e) => setSchoolSettings({...schoolSettings, established: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={schoolSettings.address}
                    onChange={(e) => setSchoolSettings({...schoolSettings, address: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={schoolSettings.phone}
                      onChange={(e) => setSchoolSettings({...schoolSettings, phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={schoolSettings.email}
                      onChange={(e) => setSchoolSettings({...schoolSettings, email: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={schoolSettings.website}
                      onChange={(e) => setSchoolSettings({...schoolSettings, website: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="motto">School Motto</Label>
                    <Input
                      id="motto"
                      value={schoolSettings.motto}
                      onChange={(e) => setSchoolSettings({...schoolSettings, motto: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>School Logo</Label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 border-2 border-dashed border-muted-foreground rounded-lg flex items-center justify-center">
                      <School className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="space-y-2">
                      <Button variant="outline" size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Logo
                      </Button>
                      <p className="text-sm text-muted-foreground">
                        Recommended size: 200x200px, PNG or JPG
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Settings Tab */}
          <TabsContent value="system" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Regional Settings</CardTitle>
                  <CardDescription>
                    Configure timezone, date formats, and currency
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select value={language} onValueChange={(value: 'en' | 'ps' | 'fa' | 'ar') => setLanguage(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="ps">پښتو (Pashto)</SelectItem>
                        <SelectItem value="fa">دری (Dari)</SelectItem>
                        <SelectItem value="ar">العربية (Arabic)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Time Zone</Label>
                    <Select value={systemSettings.timeZone} onValueChange={(value) => setSystemSettings({...systemSettings, timeZone: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asia/Karachi">Asia/Karachi (PKT)</SelectItem>
                        <SelectItem value="Asia/Dubai">Asia/Dubai (GST)</SelectItem>
                        <SelectItem value="Asia/Riyadh">Asia/Riyadh (AST)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Date Format</Label>
                    <Select value={systemSettings.dateFormat} onValueChange={(value) => setSystemSettings({...systemSettings, dateFormat: value})}>
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

                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select value={systemSettings.currency} onValueChange={(value) => setSystemSettings({...systemSettings, currency: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PKR">PKR - Pakistani Rupee</SelectItem>
                        <SelectItem value="USD">USD - US Dollar</SelectItem>
                        <SelectItem value="SAR">SAR - Saudi Riyal</SelectItem>
                        <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Academic Settings</CardTitle>
                  <CardDescription>
                    Configure academic year and session settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Academic Year</Label>
                    <Input
                      value={systemSettings.academicYear}
                      onChange={(e) => setSystemSettings({...systemSettings, academicYear: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Session Start</Label>
                      <Select value={systemSettings.sessionStart} onValueChange={(value) => setSystemSettings({...systemSettings, sessionStart: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="January">January</SelectItem>
                          <SelectItem value="April">April</SelectItem>
                          <SelectItem value="September">September</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Session End</Label>
                      <Select value={systemSettings.sessionEnd} onValueChange={(value) => setSystemSettings({...systemSettings, sessionEnd: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="December">December</SelectItem>
                          <SelectItem value="March">March</SelectItem>
                          <SelectItem value="June">June</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Week Start</Label>
                    <Select value={systemSettings.weekStart} onValueChange={(value) => setSystemSettings({...systemSettings, weekStart: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sunday">Sunday</SelectItem>
                        <SelectItem value="Monday">Monday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Working Days</Label>
                    <div className="text-sm text-muted-foreground">
                      {systemSettings.workingDays.join(", ")}
                    </div>
                    <Button variant="outline" size="sm">
                      Configure Working Days
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users & Roles Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Configure user roles, permissions, and access controls
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Default User Roles</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { role: "Super Admin", count: 1, color: "destructive" },
                      { role: "Admin", count: 3, color: "default" },
                      { role: "Teacher", count: 45, color: "secondary" },
                      { role: "Accountant", count: 2, color: "outline" },
                      { role: "Librarian", count: 1, color: "outline" },
                      { role: "Parent", count: 1250, color: "outline" }
                    ].map((item) => (
                      <div key={item.role} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{item.role}</p>
                          <p className="text-xs text-muted-foreground">{item.count} users</p>
                        </div>
                        <Badge variant={item.color as any}>Active</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Permission Settings</h4>
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Configure Permissions
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Allow user registration</Label>
                        <Switch defaultChecked={false} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Require email verification</Label>
                        <Switch defaultChecked={true} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Auto-approve teacher accounts</Label>
                        <Switch defaultChecked={false} />
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Allow password reset</Label>
                        <Switch defaultChecked={true} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Force password change</Label>
                        <Switch defaultChecked={false} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Multi-branch access</Label>
                        <Switch defaultChecked={true} />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Channels</CardTitle>
                  <CardDescription>
                    Enable or disable notification methods
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Email Notifications</Label>
                      <p className="text-xs text-muted-foreground">Send notifications via email</p>
                    </div>
                    <Switch 
                      checked={notificationSettings.emailNotifications}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, emailNotifications: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">SMS Notifications</Label>
                      <p className="text-xs text-muted-foreground">Send notifications via SMS</p>
                    </div>
                    <Switch 
                      checked={notificationSettings.smsNotifications}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, smsNotifications: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Push Notifications</Label>
                      <p className="text-xs text-muted-foreground">Browser push notifications</p>
                    </div>
                    <Switch 
                      checked={notificationSettings.pushNotifications}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, pushNotifications: checked})}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Notification Types</CardTitle>
                  <CardDescription>
                    Configure which events trigger notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Attendance Alerts</Label>
                    <Switch 
                      checked={notificationSettings.attendanceAlerts}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, attendanceAlerts: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Fee Reminders</Label>
                    <Switch 
                      checked={notificationSettings.feeReminders}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, feeReminders: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Exam Notifications</Label>
                    <Switch 
                      checked={notificationSettings.examNotifications}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, examNotifications: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Event Reminders</Label>
                    <Switch 
                      checked={notificationSettings.eventReminders}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, eventReminders: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm">System Alerts</Label>
                    <Switch 
                      checked={notificationSettings.systemAlerts}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, systemAlerts: checked})}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Password Policy</CardTitle>
                  <CardDescription>
                    Configure password requirements and security
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Minimum Password Length</Label>
                    <Select value={securitySettings.passwordMinLength.toString()} onValueChange={(value) => setSecuritySettings({...securitySettings, passwordMinLength: parseInt(value)})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6">6 characters</SelectItem>
                        <SelectItem value="8">8 characters</SelectItem>
                        <SelectItem value="10">10 characters</SelectItem>
                        <SelectItem value="12">12 characters</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Password Complexity</Label>
                      <p className="text-xs text-muted-foreground">Require uppercase, lowercase, numbers, symbols</p>
                    </div>
                    <Switch 
                      checked={securitySettings.passwordComplexity}
                      onCheckedChange={(checked) => setSecuritySettings({...securitySettings, passwordComplexity: checked})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Session Timeout (minutes)</Label>
                    <Input
                      type="number"
                      value={securitySettings.sessionTimeout}
                      onChange={(e) => setSecuritySettings({...securitySettings, sessionTimeout: parseInt(e.target.value)})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Two-Factor Authentication</Label>
                      <p className="text-xs text-muted-foreground">Require 2FA for admin accounts</p>
                    </div>
                    <Switch 
                      checked={securitySettings.twoFactorAuth}
                      onCheckedChange={(checked) => setSecuritySettings({...securitySettings, twoFactorAuth: checked})}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Access Control</CardTitle>
                  <CardDescription>
                    Configure login attempts and account security
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Max Login Attempts</Label>
                    <Input
                      type="number"
                      value={securitySettings.loginAttempts}
                      onChange={(e) => setSecuritySettings({...securitySettings, loginAttempts: parseInt(e.target.value)})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Account Lockout Duration (minutes)</Label>
                    <Input
                      type="number"
                      value={securitySettings.accountLockout}
                      onChange={(e) => setSecuritySettings({...securitySettings, accountLockout: parseInt(e.target.value)})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Audit Logs</Label>
                      <p className="text-xs text-muted-foreground">Track user activities and changes</p>
                    </div>
                    <Switch 
                      checked={securitySettings.auditLogs}
                      onCheckedChange={(checked) => setSecuritySettings({...securitySettings, auditLogs: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Data Encryption</Label>
                      <p className="text-xs text-muted-foreground">Encrypt sensitive data at rest</p>
                    </div>
                    <Switch 
                      checked={securitySettings.dataEncryption}
                      onCheckedChange={(checked) => setSecuritySettings({...securitySettings, dataEncryption: checked})}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Backup & Data Tab */}
          <TabsContent value="backup" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Backup Settings</CardTitle>
                  <CardDescription>
                    Configure automatic backups and data protection
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Automatic Backup</Label>
                      <p className="text-xs text-muted-foreground">Schedule regular database backups</p>
                    </div>
                    <Switch 
                      checked={backupSettings.autoBackup}
                      onCheckedChange={(checked) => setBackupSettings({...backupSettings, autoBackup: checked})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Backup Frequency</Label>
                    <Select value={backupSettings.backupFrequency} onValueChange={(value) => setBackupSettings({...backupSettings, backupFrequency: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Backup Time</Label>
                    <Input
                      type="time"
                      value={backupSettings.backupTime}
                      onChange={(e) => setBackupSettings({...backupSettings, backupTime: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Retention Period (days)</Label>
                    <Input
                      type="number"
                      value={backupSettings.retentionDays}
                      onChange={(e) => setBackupSettings({...backupSettings, retentionDays: parseInt(e.target.value)})}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Backup Management</CardTitle>
                  <CardDescription>
                    Manual backup operations and restore options
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Button className="w-full">
                      <Database className="h-4 w-4 mr-2" />
                      Create Manual Backup
                    </Button>
                    
                    <Button variant="outline" className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Download Latest Backup
                    </Button>
                    
                    <Button variant="outline" className="w-full">
                      <Upload className="h-4 w-4 mr-2" />
                      Restore from Backup
                    </Button>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Recent Backups</Label>
                    <div className="space-y-2">
                      {[
                        { date: "2024-03-01 02:00", size: "125 MB", status: "completed" },
                        { date: "2024-02-29 02:00", size: "123 MB", status: "completed" },
                        { date: "2024-02-28 02:00", size: "121 MB", status: "completed" }
                      ].map((backup, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded text-sm">
                          <div>
                            <p className="font-medium">{backup.date}</p>
                            <p className="text-xs text-muted-foreground">{backup.size}</p>
                          </div>
                          <Badge variant="outline" className="bg-success text-success-foreground">
                            <Check className="h-3 w-3 mr-1" />
                            {backup.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="space-y-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>SMS Integration</CardTitle>
                  <CardDescription>
                    Configure SMS service provider for notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>SMS Provider</Label>
                    <Select value={integrationSettings.smsProvider} onValueChange={(value) => setIntegrationSettings({...integrationSettings, smsProvider: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="twilio">Twilio</SelectItem>
                        <SelectItem value="vonage">Vonage (Nexmo)</SelectItem>
                        <SelectItem value="textlocal">TextLocal</SelectItem>
                        <SelectItem value="custom">Custom Provider</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <div className="flex gap-2">
                      <Input
                        type={showApiKey ? "text" : "password"}
                        value={integrationSettings.smsApiKey}
                        onChange={(e) => setIntegrationSettings({...integrationSettings, smsApiKey: e.target.value})}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <Button variant="outline">
                    Test SMS Connection
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Email Integration</CardTitle>
                  <CardDescription>
                    Configure email service for notifications and communications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email Provider</Label>
                      <Select value={integrationSettings.emailProvider} onValueChange={(value) => setIntegrationSettings({...integrationSettings, emailProvider: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="smtp">SMTP</SelectItem>
                          <SelectItem value="sendgrid">SendGrid</SelectItem>
                          <SelectItem value="mailgun">Mailgun</SelectItem>
                          <SelectItem value="ses">Amazon SES</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>SMTP Server</Label>
                      <Input
                        value={integrationSettings.emailServer}
                        onChange={(e) => setIntegrationSettings({...integrationSettings, emailServer: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Port</Label>
                      <Input
                        value={integrationSettings.emailPort}
                        onChange={(e) => setIntegrationSettings({...integrationSettings, emailPort: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Username</Label>
                      <Input
                        value={integrationSettings.emailUsername}
                        onChange={(e) => setIntegrationSettings({...integrationSettings, emailUsername: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Password</Label>
                      <Input
                        type="password"
                        value={integrationSettings.emailPassword}
                        onChange={(e) => setIntegrationSettings({...integrationSettings, emailPassword: e.target.value})}
                      />
                    </div>
                  </div>

                  <Button variant="outline">
                    Test Email Connection
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment Gateway</CardTitle>
                  <CardDescription>
                    Configure online payment processing for fees
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Payment Provider</Label>
                    <Select value={integrationSettings.paymentGateway} onValueChange={(value) => setIntegrationSettings({...integrationSettings, paymentGateway: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stripe">Stripe</SelectItem>
                        <SelectItem value="paypal">PayPal</SelectItem>
                        <SelectItem value="razorpay">Razorpay</SelectItem>
                        <SelectItem value="easypaisa">EasyPaisa</SelectItem>
                        <SelectItem value="jazzcash">JazzCash</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input
                      type="password"
                      value={integrationSettings.paymentApiKey}
                      onChange={(e) => setIntegrationSettings({...integrationSettings, paymentApiKey: e.target.value})}
                    />
                  </div>

                  <Button variant="outline">
                    Test Payment Gateway
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}