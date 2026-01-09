import { 
  GraduationCap, 
  CheckCircle, 
  FileText, 
  DollarSign, 
  BookOpen, 
  CreditCard, 
  Award 
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/hooks/useLanguage';
import { AdmissionsSection } from './AdmissionsSection';
import { AttendanceSection } from './AttendanceSection';
import { ExamsSection } from './ExamsSection';
import { FeesSection } from './FeesSection';
import { LibrarySection } from './LibrarySection';
import { IdCardsSection } from './IdCardsSection';
import { CoursesSection } from './CoursesSection';
import { GraduationsSection } from './GraduationsSection';
import type { HistorySections } from '@/types/domain/studentHistory';

interface StudentHistoryTabsProps {
  sections: HistorySections;
  defaultTab?: string;
}

export function StudentHistoryTabs({ sections, defaultTab = 'admissions' }: StudentHistoryTabsProps) {
  const { t } = useLanguage();

  const tabs = [
    { 
      id: 'admissions', 
      label: t('studentHistory.admissions') || 'Admissions', 
      icon: <GraduationCap className="h-4 w-4" />,
      count: sections.admissions.length,
    },
    { 
      id: 'attendance', 
      label: t('studentHistory.attendance') || 'Attendance', 
      icon: <CheckCircle className="h-4 w-4" />,
      count: sections.attendance.summary.totalRecords,
    },
    { 
      id: 'exams', 
      label: t('studentHistory.exams') || 'Exams', 
      icon: <FileText className="h-4 w-4" />,
      count: sections.exams.summary.totalExams,
    },
    { 
      id: 'fees', 
      label: t('studentHistory.fees') || 'Fees', 
      icon: <DollarSign className="h-4 w-4" />,
      count: sections.fees.assignments.length,
    },
    { 
      id: 'library', 
      label: t('studentHistory.library') || 'Library', 
      icon: <BookOpen className="h-4 w-4" />,
      count: sections.library.summary.totalLoans,
    },
    { 
      id: 'idCards', 
      label: t('studentHistory.idCards') || 'ID Cards', 
      icon: <CreditCard className="h-4 w-4" />,
      count: sections.idCards.summary.totalCards,
    },
    { 
      id: 'courses', 
      label: t('studentHistory.courses') || 'Courses', 
      icon: <Award className="h-4 w-4" />,
      count: sections.courses.summary.totalCourses,
    },
    { 
      id: 'graduations', 
      label: t('studentHistory.graduations') || 'Graduations', 
      icon: <GraduationCap className="h-4 w-4" />,
      count: sections.graduations.summary.totalGraduations,
    },
  ];

  return (
    <Tabs defaultValue={defaultTab} className="space-y-4">
      <TabsList className="flex flex-wrap h-auto gap-1 p-1">
        {tabs.map((tab) => (
          <TabsTrigger 
            key={tab.id} 
            value={tab.id} 
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.count > 0 && (
              <span className="hidden md:inline ml-1 px-1.5 py-0.5 text-xs rounded-full bg-muted text-muted-foreground data-[state=active]:bg-primary-foreground/20 data-[state=active]:text-primary-foreground">
                {tab.count}
              </span>
            )}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="admissions" className="mt-4">
        <AdmissionsSection admissions={sections.admissions} />
      </TabsContent>

      <TabsContent value="attendance" className="mt-4">
        <AttendanceSection attendance={sections.attendance} />
      </TabsContent>

      <TabsContent value="exams" className="mt-4">
        <ExamsSection exams={sections.exams} />
      </TabsContent>

      <TabsContent value="fees" className="mt-4">
        <FeesSection fees={sections.fees} />
      </TabsContent>

      <TabsContent value="library" className="mt-4">
        <LibrarySection library={sections.library} />
      </TabsContent>

      <TabsContent value="idCards" className="mt-4">
        <IdCardsSection idCards={sections.idCards} />
      </TabsContent>

      <TabsContent value="courses" className="mt-4">
        <CoursesSection courses={sections.courses} />
      </TabsContent>

      <TabsContent value="graduations" className="mt-4">
        <GraduationsSection graduations={sections.graduations} />
      </TabsContent>
    </Tabs>
  );
}

