import { memo } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { useIndexTranslations } from './translations/useIndexTranslations';
import { FeatureCard } from './FeatureCard';
import {
  Clipboard,
  Calendar,
  GraduationCap,
  CreditCard,
  BookOpen,
  Heart,
  Activity,
  FileText,
  Clock,
  HelpCircle,
  CalendarDays,
  Users,
  DollarSign,
  Banknote,
  History,
  ShieldCheck,
  Settings,
  Award,
} from 'lucide-react';

export const FeaturesGrid = memo(function FeaturesGrid() {
  const { isRTL } = useLanguage();
  const { t } = useIndexTranslations();

  const { get } = useIndexTranslations();
  
  // Helper to get feature items as array
  const getFeatureItems = (featureKey: string): string[] => {
    const items = get(`features.${featureKey}.items`);
    return Array.isArray(items) ? items : [];
  };
  
  const features = [
    {
      id: 'registration',
      title: t('features.registration.title') as string,
      icon: Clipboard,
      items: getFeatureItems('registration'),
    },
    {
      id: 'attendance',
      title: t('features.attendance.title') as string,
      icon: Calendar,
      items: getFeatureItems('attendance'),
    },
    {
      id: 'curriculum',
      title: t('features.curriculum.title') as string,
      icon: GraduationCap,
      items: getFeatureItems('curriculum'),
    },
    {
      id: 'exams',
      title: t('features.exams.title') as string,
      icon: GraduationCap,
      items: getFeatureItems('exams'),
    },
    {
      id: 'documents',
      title: t('features.documents.title') as string,
      icon: CreditCard,
      items: getFeatureItems('documents'),
    },
    {
      id: 'library',
      title: t('features.library.title') as string,
      icon: BookOpen,
      items: getFeatureItems('library'),
    },
    {
      id: 'finance',
      title: t('features.finance.title') as string,
      icon: DollarSign,
      items: getFeatureItems('finance'),
    },
    {
      id: 'donations',
      title: t('features.donations.title') as string,
      icon: Heart,
      items: getFeatureItems('donations'),
    },
    {
      id: 'activity',
      title: t('features.activity.title') as string,
      icon: Activity,
      items: getFeatureItems('activity'),
    },
    {
      id: 'events',
      title: t('features.events.title') as string,
      icon: CalendarDays,
      items: getFeatureItems('events'),
    },
    {
      id: 'dms',
      title: t('features.dms.title') as string,
      icon: FileText,
      items: getFeatureItems('dms'),
    },
    {
      id: 'courses',
      title: t('features.courses.title') as string,
      icon: Award,
      items: getFeatureItems('courses'),
    },
    {
      id: 'graduation',
      title: t('features.graduation.title') as string,
      icon: Award,
      items: getFeatureItems('graduation'),
    },
    {
      id: 'timetable',
      title: t('features.timetable.title') as string,
      icon: Clock,
      items: getFeatureItems('timetable'),
    },
    {
      id: 'question-bank',
      title: t('features.questionBank.title') as string,
      icon: HelpCircle,
      items: getFeatureItems('questionBank'),
    },
    {
      id: 'leave',
      title: t('features.leave.title') as string,
      icon: CalendarDays,
      items: getFeatureItems('leave'),
    },
    {
      id: 'assignments',
      title: t('features.assignments.title') as string,
      icon: Users,
      items: getFeatureItems('assignments'),
    },
    {
      id: 'id-cards',
      title: t('features.idCards.title') as string,
      icon: CreditCard,
      items: getFeatureItems('idCards'),
    },
    {
      id: 'finance-details',
      title: t('features.financeDetails.title') as string,
      icon: DollarSign,
      items: getFeatureItems('financeDetails'),
    },
    {
      id: 'fee-details',
      title: t('features.feeDetails.title') as string,
      icon: Banknote,
      items: getFeatureItems('feeDetails'),
    },
    {
      id: 'library-details',
      title: t('features.libraryDetails.title') as string,
      icon: BookOpen,
      items: getFeatureItems('libraryDetails'),
    },
    {
      id: 'report-templates',
      title: t('features.reportTemplates.title') as string,
      icon: FileText,
      items: getFeatureItems('reportTemplates'),
    },
    {
      id: 'student-history',
      title: t('features.studentHistory.title') as string,
      icon: History,
      items: getFeatureItems('studentHistory'),
    },
    {
      id: 'certificate-verification',
      title: t('features.certificateVerification.title') as string,
      icon: ShieldCheck,
      items: getFeatureItems('certificateVerification'),
    },
    {
      id: 'exam-details',
      title: t('features.examDetails.title') as string,
      icon: Settings,
      items: getFeatureItems('examDetails'),
    },
    {
      id: 'misc',
      title: t('features.misc.title') as string,
      icon: Settings,
      items: getFeatureItems('misc'),
    },
  ];

  return (
    <section className="px-6 py-6">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-[#0b0b56] mb-4" dir={isRTL ? "rtl" : "ltr"}>
          {t('features.title')}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map((feature) => (
            <FeatureCard key={feature.id} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
});
