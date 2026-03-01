import { Loader2, Download, Eye, Printer, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useIdCardTemplate } from '@/hooks/useIdCardTemplates';
import { useLanguage } from '@/hooks/useLanguage';
import { useStudentIdCard } from '@/hooks/useStudentIdCards';
import { renderIdCardToCanvas, renderIdCardToDataUrl } from '@/lib/idCards/idCardCanvasRenderer';
import { exportIdCardToPdf } from '@/lib/idCards/idCardPdfExporter';
import { DEFAULT_ID_CARD_PADDING_PX, getDefaultPrintRenderSize, getDefaultScreenRenderSize } from '@/lib/idCards/idCardRenderMetrics';
import { showToast } from '@/lib/toast';
import type { IdCardTemplate } from '@/types/domain/idCardTemplate';
import type { Student } from '@/types/domain/student';
import type { StudentIdCard } from '@/types/domain/studentIdCard';

interface StudentIdCardPreviewProps {
  card: StudentIdCard | null;
  template?: IdCardTemplate | null;
  side?: 'front' | 'back';
  showControls?: boolean;
  className?: string;
}

/**
 * StudentIdCardPreview component - Displays ID card preview using backend-rendered images
 * Shows the actual rendered card image from the backend API
 */
export function StudentIdCardPreview({
  card,
  template: providedTemplate,
  side: initialSide = 'front',
  showControls = true,
  className = '',
}: StudentIdCardPreviewProps) {
  const { t } = useLanguage();
  const [side, setSide] = useState<'front' | 'back'>(initialSide);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const screenRenderSize = getDefaultScreenRenderSize();
  const printRenderSize = getDefaultPrintRenderSize();
  
  // Fetch full card data if only ID is provided
  const cardId = card?.id;
  const { data: fullCard, isLoading: cardLoading } = useStudentIdCard(cardId || null);
  const actualCard = fullCard || card;
  
  // Fetch template if not provided
  const templateId = providedTemplate?.id || actualCard?.idCardTemplateId;
  const { data: fetchedTemplate, isLoading: templateLoading } = useIdCardTemplate(templateId || null);
  const actualTemplate = providedTemplate || fetchedTemplate;
  
  // Convert StudentIdCard to Student format for renderer
  // Handles both regular students and course students
  const getStudentForRenderer = (card: StudentIdCard | null): Student | null => {
    if (!card) return null;

    // Handle course students
    if (card.courseStudentId && card.courseStudent) {
      const courseStudent = card.courseStudent;
      const courseName = courseStudent.course?.name || null;
      const student: Student = {
        id: courseStudent.id,
        fullName: courseStudent.fullName || '',
        fatherName: courseStudent.fatherName || '',
        admissionNumber: courseStudent.admissionNo || '',
        studentCode: null,
        cardNumber: card.cardNumber || null,
        rollNumber: null,
        picturePath: courseStudent.picturePath || null,
        currentClass: courseName
          ? {
              id: courseStudent.course?.id || `course-${courseStudent.id}`,
              name: courseName,
              gradeLevel: undefined,
            }
          : null,
        school: card.organization ? {
          id: card.organization.id,
          schoolName: card.organization.name,
        } : null,
        // Add required fields with defaults
        organizationId: card.organizationId,
        schoolId: card.schoolId,
        firstName: courseStudent.fullName?.split(' ')[0] || '',
        lastName: courseStudent.fullName?.split(' ').slice(1).join(' ') || '',
        gender: 'male' as any,
        status: 'active' as any,
        admissionFeeStatus: 'paid' as any,
        isOrphan: false,
        address: {
          street: '',
          city: '',
          state: '',
          country: '',
          postalCode: '',
        },
        guardians: [],
        previousSchools: [],
        healthInfo: {},
        documents: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      if (import.meta.env.DEV) {
        console.log('[StudentIdCardPreview] Course student data for renderer:', {
          fullName: student.fullName,
          fatherName: student.fatherName,
          admissionNumber: student.admissionNumber,
          course: courseStudent.course?.name,
        });
      }
      
      return student;
    }

    // Handle regular students
    if (!card.student) return null;
    const className = card.class?.name || card.classAcademicYear?.sectionName || null;
    
    const student: Student = {
      id: card.student.id,
      fullName: card.student.fullName || '',
      fatherName: card.student.fatherName || '',
      admissionNumber: card.student.admissionNumber || '',
      studentCode: card.student.studentCode || null,
      cardNumber: card.cardNumber || card.student.cardNumber || null,
      rollNumber: (card.student as any).rollNumber || null,
      picturePath: card.student.picturePath || null,
      currentClass: className ? {
        id: card.class?.id || card.classAcademicYear?.id || `class-${card.id}`,
        name: className,
        gradeLevel: card.class?.gradeLevel,
      } : null,
      school: card.organization ? {
        id: card.organization.id,
        schoolName: card.organization.name,
      } : null,
      // Add required fields with defaults
      organizationId: card.organizationId,
      schoolId: card.schoolId,
      firstName: card.student.fullName?.split(' ')[0] || '',
      lastName: card.student.fullName?.split(' ').slice(1).join(' ') || '',
      gender: (card.student.gender as any) || 'male',
      status: 'active' as any,
      admissionFeeStatus: 'paid' as any,
      isOrphan: false,
      address: {
        street: '',
        city: '',
        state: '',
        country: '',
        postalCode: '',
      },
      guardians: [],
      previousSchools: [],
      healthInfo: {},
      documents: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    if (import.meta.env.DEV) {
      console.log('[StudentIdCardPreview] Student data for renderer:', {
        fullName: student.fullName,
        fatherName: student.fatherName,
        admissionNumber: student.admissionNumber,
        studentCode: student.studentCode,
        currentClass: student.currentClass?.name,
        school: student.school?.schoolName,
      });
    }
    
    return student;
  };

  // Load preview image when card or side changes (auto-load on mount)
  useEffect(() => {
    if (!actualCard || !actualTemplate || cardLoading || templateLoading) {
      setPreviewImageUrl(null);
      return;
    }

    const student = getStudentForRenderer(actualCard);
    if (!student) {
      setPreviewImageUrl(null);
      return;
    }

    // Generate preview using the same rendering function and quality as export
    // This ensures preview matches exactly what will be exported to JPG/PDF
    const loadPreview = async () => {
      setIsLoadingPreview(true);
      try {
        // Revoke previous URL if exists
        if (previewImageUrl && previewImageUrl.startsWith('blob:')) {
          URL.revokeObjectURL(previewImageUrl);
        }

        // Use screen quality to match export exactly
        // Both preview and export now use the same dimensions and font sizes
        const dataUrl = await renderIdCardToDataUrl(
          actualTemplate,
          student,
          side,
          {
            quality: 'screen', // Use screen dimensions to match export
            renderWidthPx: screenRenderSize.width,
            renderHeightPx: screenRenderSize.height,
            paddingPx: DEFAULT_ID_CARD_PADDING_PX,
            scale: 1,
            mimeType: 'image/jpeg',
            jpegQuality: 0.95,
            notes: actualCard?.notes || null,
            expiryDate: actualCard?.printedAt ? new Date(actualCard.printedAt.getTime() + 365 * 24 * 60 * 60 * 1000) : null, // 1 year from print date
          }
        );
        setPreviewImageUrl(dataUrl);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[StudentIdCardPreview] Error loading preview:', error);
        }
        setPreviewImageUrl(null);
      } finally {
        setIsLoadingPreview(false);
      }
    };

    void loadPreview();
    
    // Cleanup: revoke object URL when component unmounts
    return () => {
      if (previewImageUrl && previewImageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewImageUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actualCard?.id, actualTemplate?.id, side, cardLoading, templateLoading]);

  // Check if we have the necessary data (handles both regular and course students)
  const hasStudentData = actualCard && (actualCard.student || actualCard.courseStudent);

  // Use the fetched template if available
  const templateForPreview = actualTemplate || (actualCard?.template ? {
    id: actualCard.template.id,
    name: actualCard.template.name,
    description: actualCard.template.description || null,
    layout_config_front: actualTemplate?.layoutConfigFront || null,
    layout_config_back: actualTemplate?.layoutConfigBack || null,
    background_image_path_front: actualTemplate?.backgroundImagePathFront || null,
    background_image_path_back: actualTemplate?.backgroundImagePathBack || null,
    card_size: actualTemplate?.cardSize || 'CR80',
    isActive: actualCard.template.isActive ?? true,
  } : null);

  const handleDownload = async () => {
    if (!actualCard || !actualTemplate) return;

    const student = getStudentForRenderer(actualCard);
    if (!student) {
      showToast.error(t('toast.idCardDownloadFailed') || 'Student data not available');
      return;
    }

    try {
      setIsLoadingPreview(true);
      const canvas = await renderIdCardToCanvas(actualTemplate, student, side, { 
        quality: 'print',
        renderWidthPx: printRenderSize.width,
        renderHeightPx: printRenderSize.height,
        paddingPx: DEFAULT_ID_CARD_PADDING_PX,
        notes: actualCard?.notes || null,
        expiryDate: actualCard?.printedAt ? new Date(actualCard.printedAt.getTime() + 365 * 24 * 60 * 60 * 1000) : null,
      });
      const dataUrl = canvas.toDataURL('image/png');
      
      // Create download link
      const link = document.createElement('a');
      link.href = dataUrl;
      const admissionNumber = actualCard.courseStudentId
        ? actualCard.courseStudent?.admissionNo
        : actualCard.student?.admissionNumber;
      link.download = `id-card-${admissionNumber || actualCard.id}-${side}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast.success(t('toast.idCardExported') || 'ID card downloaded');
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[StudentIdCardPreview] Download error:', error);
      }
      showToast.error(error instanceof Error ? error.message : (t('toast.idCardDownloadFailed') || 'Failed to download ID card'));
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleDownloadPdf = async (exportSide?: 'front' | 'back' | 'both') => {
    if (!actualCard || !actualTemplate) return;

    const student = getStudentForRenderer(actualCard);
    if (!student) {
      showToast.error(t('toast.idCardDownloadFailed') || 'Student data not available');
      return;
    }

    try {
      setIsLoadingPreview(true);
      
      // Determine which sides to export
      const sidesToExport: ('front' | 'back')[] = 
        exportSide === 'both' ? ['front', 'back'] :
        exportSide === 'back' ? ['back'] :
        exportSide === 'front' ? ['front'] :
        [side]; // Default to current side

      // Filter out sides that don't have layouts
      const validSides = sidesToExport.filter(s => {
        const layout = s === 'front' ? actualTemplate.layoutConfigFront : actualTemplate.layoutConfigBack;
        return layout && layout.enabledFields && layout.enabledFields.length > 0;
      });

      if (validSides.length === 0) {
        throw new Error('No valid card sides to export');
      }

      const admissionNumber = actualCard.courseStudentId
        ? actualCard.courseStudent?.admissionNo
        : actualCard.student?.admissionNumber;
      const baseFilename = `id-card-${admissionNumber || actualCard.id}`;
      const notes = actualCard.notes || null;
      const expiryDate = actualCard.printedAt ? new Date(actualCard.printedAt.getTime() + 365 * 24 * 60 * 60 * 1000) : null;

      // Export each side
      for (const exportSideValue of validSides) {
        await exportIdCardToPdf(
          actualTemplate,
          student,
          exportSideValue,
          validSides.length > 1 ? `${baseFilename}-${exportSideValue}` : baseFilename,
          notes,
          expiryDate
        );
      }
      
      showToast.success(t('toast.idCardExported') || 'ID card PDF downloaded');
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[StudentIdCardPreview] PDF download error:', error);
      }
      showToast.error(error instanceof Error ? error.message : (t('toast.idCardDownloadFailed') || 'Failed to download ID card PDF'));
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handlePreview = async () => {
    if (!actualCard || !actualTemplate) return;
    
    const student = getStudentForRenderer(actualCard);
    if (!student) {
      showToast.error(t('toast.idCardPreviewFailed') || 'Student data not available');
      return;
    }

    setIsLoadingPreview(true);
    try {
      // Revoke previous URL if exists
      if (previewImageUrl && previewImageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewImageUrl);
      }
      
      // Use the same quality settings as export (print quality, scale 2)
      // This ensures preview matches exactly what will be exported
      const dataUrl = await renderIdCardToDataUrl(
        actualTemplate,
        student,
        side,
        {
          quality: 'screen',
          renderWidthPx: screenRenderSize.width,
          renderHeightPx: screenRenderSize.height,
          paddingPx: DEFAULT_ID_CARD_PADDING_PX,
          scale: 1,
          mimeType: 'image/jpeg',
          jpegQuality: 0.95,
          notes: actualCard?.notes || null,
          expiryDate: actualCard?.printedAt ? new Date(actualCard.printedAt.getTime() + 365 * 24 * 60 * 60 * 1000) : null,
        }
      );
      setPreviewImageUrl(dataUrl);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[StudentIdCardPreview] Preview error:', error);
      }
      showToast.error(t('toast.idCardPreviewFailed') || 'Failed to load preview');
      setPreviewImageUrl(null);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  if (cardLoading || templateLoading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!actualCard || !hasStudentData) {
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
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-2">
              <Button
                variant={side === 'front' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSide('front')}
                disabled={isLoadingPreview}
              >
                {t('idCards.front') || 'Front'}
              </Button>
              {templateForPreview && (
                <Button
                  variant={side === 'back' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSide('back')}
                  disabled={isLoadingPreview}
                >
                  {t('events.back') || 'Back'}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreview}
                disabled={isLoadingPreview || !actualCard || !actualTemplate}
              >
                {isLoadingPreview ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4 mr-2" />
                )}
                {t('events.preview') || 'Preview'}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={isLoadingPreview || !actualCard || !actualTemplate}
              >
                {isLoadingPreview ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {t('events.download') || 'Download PNG'}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isLoadingPreview || !actualCard || !actualTemplate}
                  >
                    {isLoadingPreview ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    {t('events.downloadPdf') || 'Download PDF'}
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleDownloadPdf('front')}
                    disabled={!actualTemplate?.layoutConfigFront?.enabledFields?.length}
                  >
                    {t('idCards.front') || 'Front Only'}
                  </DropdownMenuItem>
                  {actualTemplate?.layoutConfigBack?.enabledFields?.length > 0 && (
                    <DropdownMenuItem
                      onClick={() => handleDownloadPdf('back')}
                    >
                      {t('events.back') || 'Back Only'}
                    </DropdownMenuItem>
                  )}
                  {actualTemplate?.layoutConfigFront?.enabledFields?.length > 0 && 
                   actualTemplate?.layoutConfigBack?.enabledFields?.length > 0 && (
                    <DropdownMenuItem
                      onClick={() => handleDownloadPdf('both')}
                    >
                      {t('idCards.both') || 'Both Sides'}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (previewImageUrl) {
                    const printWindow = window.open();
                    if (printWindow) {
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>Print ID Card</title>
                            <style>
                              body { margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; }
                              img { max-width: 100%; height: auto; }
                            </style>
                          </head>
                          <body>
                            <img src="${previewImageUrl}" alt="ID Card ${side} side" />
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                      setTimeout(() => {
                        printWindow.print();
                      }, 250);
                    }
                  }
                }}
                disabled={!previewImageUrl}
              >
                <Printer className="h-4 w-4 mr-2" />
                {t('events.print') || 'Print'}
              </Button>
            </div>
          </div>
        )}

        {/* Show preview image if available, otherwise show fallback */}
        {previewImageUrl ? (
          <div className="border rounded-lg overflow-hidden bg-white flex items-center justify-center p-4">
            <img
              src={previewImageUrl}
              alt={`ID Card ${side} side`}
              className="w-full h-auto max-w-md shadow-sm"
              style={{ maxHeight: '600px', objectFit: 'contain' }}
            />
          </div>
        ) : isLoadingPreview ? (
          <div className="flex items-center justify-center py-12 border rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">
              {t('common.loading') || 'Loading preview...'}
            </span>
          </div>
        ) : (
          <div className="border rounded-lg bg-muted/50 p-8 text-center">
            <p className="text-muted-foreground mb-2">
              {t('idCards.noPreviewAvailable') || 'Preview not available'}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {t('idCards.clickPreviewToGenerate') || 'Click Preview button to generate card image'}
            </p>
            {!templateForPreview && (
              <p className="text-xs text-muted-foreground">
                {t('idCards.templateNotLoaded') || 'Template not loaded'}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
