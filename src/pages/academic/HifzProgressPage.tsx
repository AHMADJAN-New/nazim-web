import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useLanguage } from '@/hooks/useLanguage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DailyProgressEntry } from '@/components/hifz/DailyProgressEntry';
import { RevisionHistory } from '@/components/hifz/RevisionHistory';
import { ProgressAnalytics } from '@/components/hifz/ProgressAnalytics';
import { MistakeLog } from '@/components/hifz/MistakeLog';
import { MotivationWall } from '@/components/hifz/MotivationWall';
import { TeacherFeedback } from '@/components/hifz/TeacherFeedback';
import { ExportReports } from '@/components/hifz/ExportReports';
import { BookOpen, History, BarChart3, AlertTriangle, Trophy, MessageCircle, Download } from 'lucide-react';

export default function HifzProgressPage() {
  const { t, isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState('daily');

  return (
    <MainLayout
      title={t('Hifz Progress Tracking')}
      showBreadcrumb
      breadcrumbItems={[
        { label: t('Academic'), href: '/academic' },
        { label: t('Hifz Progress') }
      ]}
    >
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6">
          <h1 className="text-2xl font-bold text-primary mb-2">
            {t('Qur\'ān Memorization Journey')}
          </h1>
          <p className="text-muted-foreground">
            {t('Track your spiritual progress, log daily sessions, and celebrate milestones')}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="daily" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              {t('Today\'s Session')}
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              {t('Revision History')}
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {t('Analytics')}
            </TabsTrigger>
            <TabsTrigger value="mistakes" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {t('Mistake Log')}
            </TabsTrigger>
            <TabsTrigger value="motivation" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              {t('Motivation')}
            </TabsTrigger>
            <TabsTrigger value="feedback" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              {t('Teacher Feedback')}
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              {t('Export Reports')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="space-y-6">
            <DailyProgressEntry />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <RevisionHistory />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <ProgressAnalytics />
          </TabsContent>

          <TabsContent value="mistakes" className="space-y-6">
            <MistakeLog />
          </TabsContent>

          <TabsContent value="motivation" className="space-y-6">
            <MotivationWall />
          </TabsContent>

          <TabsContent value="feedback" className="space-y-6">
            <TeacherFeedback />
          </TabsContent>

          <TabsContent value="export" className="space-y-6">
            <ExportReports />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}