import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

const settingsItems = [
  {
    title: 'School Information',
    description: 'Configure basic school details and branding',
    path: '/settings/school-info',
    icon: '🏫',
  },
  {
    title: 'Academic Settings',
    description: 'Set academic year and educational parameters',
    path: '/settings/academic',
    icon: '📚',
  },
  {
    title: 'System Preferences',
    description: 'Configure language, timezone, and regional settings',
    path: '/settings/system',
    icon: '🌐',
  },
  {
    title: 'Appearance',
    description: 'Customize colors, themes, and visual elements',
    path: '/settings/appearance',
    icon: '🎨',
  },
  {
    title: 'Communication',
    description: 'Configure notification and messaging settings',
    path: '/settings/communication',
    icon: '📢',
  },
  {
    title: 'Financial',
    description: 'Set up fee structures and financial parameters',
    path: '/settings/financial',
    icon: '💰',
  },
];

export default function SettingsPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="w-8 h-8" />
          System Settings
        </h1>
        <p className="text-muted-foreground">
          Configure your school management system settings and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {settingsItems.map((item) => (
          <Link key={item.path} to={item.path}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <span className="text-2xl">{item.icon}</span>
                  {item.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}