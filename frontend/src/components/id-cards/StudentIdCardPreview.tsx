import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Download, Printer } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { CardPreview } from './CardPreview';
import { useExportIndividualIdCard } from '@/hooks/useStudentIdCards';
import type { StudentIdCard } from '@/types/domain/studentIdCard';
import type { IdCardTemplate } from '@/types/domain/idCardTemplate';
import type { Student } from '@/types/domain/student';

interface StudentIdCardPreviewProps {
  card: StudentIdCard | null;
  template?: IdCardTemplate | null;
  side?: 'front' | 'back';
  showControls?: boolean;
  className?: string;
}

/**
 * StudentIdCardPreview component - Wraps CardPreview for StudentIdCard objects
 * Converts StudentIdCard to Student format for CardPreview component
 */
export function StudentIdCardPreview({
  card,
  template,
  side: initialSide = 'front',
  showControls = true,
  className = '',
}: StudentIdCardPreviewProps) {
  const { t } = useLanguage();
  const [side, setSide] = useState<'front' | 'back'>(initialSide);
  const previewCard = usePreviewIdCard();
  const exportCard = useExportIndividualIdCard();

  // Convert StudentIdCard to Student format for CardPreview
  const studentForPreview: Student | null = card && card.student ? {
    id: card.student.id,
    organizationId: card.organizationId,
    schoolId: null,
    admissionNumber: card.student.admissionNumber,
    studentCode: card.student.studentCode || null,
    cardNumber: card.cardNumber || card.student.cardNumber || null,
    rollNumber: undefined,
    fullName: card.student.fullName,
    firstName: card.student.fullName.split(' ')[0] || '',
    lastName: card.student.fullName.split(' ').slice(1).join(' ') || '',
    fatherName: card.student.fatherName || '',
    grandfatherName: null,
    motherName: null,
    gender: (card.student.gender || 'male') as 'male' | 'female',
    dateOfBirth: undefined,
    birthYear: null,
    birthDate: null,
    age: null,
    bloodGroup: undefined,
    religion: undefined,
    nationality: null,
    preferredLanguage: null,
    phone: undefined,
    email: undefined,
    address: {
      street: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
    },
    homeAddress: null,
    guardians: [],
    guardianName: null,
    guardianRelation: null,
    guardianPhone: null,
    guardianTazkira: null,
    guardianPicturePath: null,
    zaminName: null,
    zaminPhone: null,
    zaminTazkira: null,
    zaminAddress: null,
    admissionYear: null,
    applyingGrade: null,
    previousSchool: null,
    previousSchools: [],
    origProvince: null,
    origDistrict: null,
    origVillage: null,
    currProvince: null,
    currDistrict: null,
    currVillage: null,
    picturePath: card.student.picturePath || null,
    status: 'active' as const,
    admissionFeeStatus: 'paid' as const,
    isOrphan: false,
    documents: [],
    healthInfo: {
      emergencyContact: {
        name: '',
        relationship: '',
        phone: '',
      },
      bloodGroup: undefined,
      allergies: undefined,
      medications: undefined,
      medicalConditions: undefined,
      height: undefined,
      weight: undefined,
      lastCheckupDate: undefined,
    },
    createdAt: card.createdAt,
    updatedAt: card.updatedAt,
    deletedAt: null,
    currentClass: card.class ? {
      id: card.class.id,
      name: card.class.name,
      gradeLevel: card.class.gradeLevel || null,
    } : undefined,
    school: undefined,
  } : null;

  const templateForPreview = template || (card?.template ? {
    id: card.template.id,
    name: card.template.name,
    layout_config_front: null, // Will be loaded from template
    layout_config_back: null,
    background_image_path_front: null,
    background_image_path_back: null,
    card_size: 'CR80',
  } : null);

  const handleDownload = async () => {
    if (!card) return;

    try {
      await exportCard.mutateAsync({
        id: card.id,
        format: 'png',
      });
    } catch (error) {
      // Error handled by hook
    }
  };

  const handlePrint = () => {
    if (!card) return;
    window.print();
  };

  if (!card || !studentForPreview) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground py-8">
            {t('idCards.selectStudentAndTemplate') || 'Please select a student and template to preview'}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="pt-6 space-y-4">
        {showControls && (
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                variant={side === 'front' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSide('front')}
              >
                {t('idCards.frontSide') || 'Front'}
              </Button>
              {templateForPreview && (
                <Button
                  variant={side === 'back' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSide('back')}
                >
                  {t('idCards.backSide') || 'Back'}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={exportCard.isPending}
              >
                {exportCard.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {t('common.download') || 'Download'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
              >
                <Printer className="h-4 w-4 mr-2" />
                {t('common.print') || 'Print'}
              </Button>
            </div>
          </div>
        )}

        <CardPreview
          student={studentForPreview}
          template={templateForPreview}
          side={side}
          printQuality={false}
          onSideChange={setSide}
          showControls={false}
        />
      </CardContent>
    </Card>
  );
}

