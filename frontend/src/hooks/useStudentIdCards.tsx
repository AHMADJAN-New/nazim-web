import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from './useAuth';
import { useLanguage } from './useLanguage';

import { studentIdCardsApi } from '@/lib/api/client';
import { renderIdCardToCanvas } from '@/lib/idCards/idCardCanvasRenderer';
import { exportIdCardToPdf, exportBulkIdCardsToPdf } from '@/lib/idCards/idCardPdfExporter';
import { DEFAULT_ID_CARD_PADDING_PX, getDefaultPrintRenderSize, getDefaultScreenRenderSize } from '@/lib/idCards/idCardRenderMetrics';
import { exportIdCardsToZip } from '@/lib/idCards/idCardZipExporter';
import { showToast } from '@/lib/toast';
import { 
  mapStudentIdCardApiToDomain, 
  mapStudentIdCardDomainToInsert,
  mapStudentIdCardDomainToUpdate,
  mapAssignIdCardRequestDomainToApi,
  mapStudentIdCardFiltersDomainToApi,
} from '@/mappers/studentIdCardMapper';
import type * as StudentIdCardApi from '@/types/api/studentIdCard';
import type { IdCardTemplate } from '@/types/domain/idCardTemplate';
import type { Student } from '@/types/domain/student';
import type { 
  StudentIdCard, 
  StudentIdCardInsert, 
  StudentIdCardUpdate,
  IdCardFilters as StudentIdCardFilters,
  AssignIdCardRequest,
  IdCardExportRequest as ExportIdCardRequest,
} from '@/types/domain/studentIdCard';

// Re-export domain types for convenience
export type { 
  StudentIdCard, 
  StudentIdCardInsert, 
  StudentIdCardUpdate,
  StudentIdCardFilters,
  AssignIdCardRequest,
  ExportIdCardRequest,
} from '@/types/domain/studentIdCard';

/**
 * List student ID cards with filters
 */
export const useStudentIdCards = (filters?: StudentIdCardFilters) => {
  const { user, profile } = useAuth();
  const { t } = useLanguage();

  return useQuery<StudentIdCard[]>({
    queryKey: ['student-id-cards', profile?.organization_id, profile?.default_school_id ?? null, filters],
    queryFn: async () => {
      if (!user || !profile) {
        if (import.meta.env.DEV) {
          console.log('[useStudentIdCards] No user or profile');
        }
        return [];
      }

      try {
        const apiFilters = mapStudentIdCardFiltersDomainToApi({
          ...filters,
          // Always filter by organization
        });

        const apiCards = await studentIdCardsApi.list(apiFilters);
        
        // Map API models to domain models
        return (apiCards as StudentIdCardApi.StudentIdCard[]).map(mapStudentIdCardApiToDomain);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[useStudentIdCards] Error fetching ID cards:', error);
        }
        throw error;
      }
    },
    enabled: !!user && !!profile && !!profile.organization_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

/**
 * Get single student ID card
 */
export const useStudentIdCard = (id: string | null) => {
  const { user, profile } = useAuth();
  const { t } = useLanguage();

  return useQuery<StudentIdCard | null>({
    queryKey: ['student-id-card', id],
    queryFn: async () => {
      if (!id || !user || !profile) {
        return null;
      }

      try {
        const apiCard = await studentIdCardsApi.get(id);
        return mapStudentIdCardApiToDomain(apiCard as StudentIdCardApi.StudentIdCard);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[useStudentIdCard] Error fetching ID card:', error);
        }
        throw error;
      }
    },
    enabled: !!id && !!user && !!profile,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

/**
 * Bulk assign ID card template to students
 */
export const useAssignIdCards = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (data: AssignIdCardRequest) => {
      if (!profile?.organization_id) {
        throw new Error('User must be assigned to an organization');
      }

      const apiData = mapAssignIdCardRequestDomainToApi(data);
      const result = await studentIdCardsApi.assign(apiData);
      
      // Map response back to domain models
      if (Array.isArray(result)) {
        return (result as StudentIdCardApi.StudentIdCard[]).map(mapStudentIdCardApiToDomain);
      }
      return [];
    },
    onSuccess: async () => {
      showToast.success(t('toast.idCardsAssigned'));
      await queryClient.invalidateQueries({ queryKey: ['student-id-cards'] });
      await queryClient.refetchQueries({ queryKey: ['student-id-cards'] });
      // Invalidate finance queries if income entries were created
      await queryClient.invalidateQueries({ queryKey: ['income-entries'] });
      await queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
      await queryClient.invalidateQueries({ queryKey: ['finance-dashboard'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.idCardAssignFailed'));
    },
  });
};

/**
 * Update student ID card
 */
export const useUpdateStudentIdCard = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & StudentIdCardUpdate) => {
      if (!profile) {
        throw new Error('User not authenticated');
      }

      const apiUpdates = mapStudentIdCardDomainToUpdate(updates);
      const apiCard = await studentIdCardsApi.update(id, apiUpdates);
      return mapStudentIdCardApiToDomain(apiCard as StudentIdCardApi.StudentIdCard);
    },
    onSuccess: async () => {
      showToast.success(t('toast.idCardUpdated'));
      await queryClient.invalidateQueries({ queryKey: ['student-id-cards'] });
      await queryClient.refetchQueries({ queryKey: ['student-id-cards'] });
      await queryClient.invalidateQueries({ queryKey: ['student-id-card'] });
      // Invalidate finance queries if income entries were created/updated
      await queryClient.invalidateQueries({ queryKey: ['income-entries'] });
      await queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
      await queryClient.invalidateQueries({ queryKey: ['finance-dashboard'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.idCardUpdateFailed'));
    },
  });
};

/**
 * Mark card as printed
 */
export const useMarkCardPrinted = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (id: string) => {
      const apiCard = await studentIdCardsApi.markPrinted(id);
      return mapStudentIdCardApiToDomain(apiCard as StudentIdCardApi.StudentIdCard);
    },
    onSuccess: () => {
      showToast.success(t('toast.idCardMarkedPrinted'));
      void queryClient.invalidateQueries({ queryKey: ['student-id-cards'] });
      void queryClient.invalidateQueries({ queryKey: ['student-id-card'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.idCardMarkPrintedFailed'));
    },
  });
};

/**
 * Mark card fee as paid
 */
export const useMarkCardFeePaid = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ 
      id, 
      paidDate, 
      accountId, 
      incomeCategoryId 
    }: { 
      id: string; 
      paidDate?: Date;
      accountId?: string | null;
      incomeCategoryId?: string | null;
    }) => {
      const apiCard = await studentIdCardsApi.markFeePaid(id, {
        card_fee_paid: true,
        card_fee_paid_date: paidDate?.toISOString() ?? new Date().toISOString(),
        account_id: accountId || null,
        income_category_id: incomeCategoryId || null,
      });
      return mapStudentIdCardApiToDomain(apiCard as StudentIdCardApi.StudentIdCard);
    },
    onSuccess: async () => {
      showToast.success(t('toast.idCardFeeMarkedPaid'));
      await queryClient.invalidateQueries({ queryKey: ['student-id-cards'] });
      await queryClient.refetchQueries({ queryKey: ['student-id-cards'] });
      await queryClient.invalidateQueries({ queryKey: ['student-id-card'] });
      // Invalidate finance queries if income entries were created
      await queryClient.invalidateQueries({ queryKey: ['income-entries'] });
      await queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
      await queryClient.invalidateQueries({ queryKey: ['finance-dashboard'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.idCardFeeMarkPaidFailed'));
    },
  });
};

/**
 * Delete student ID card (soft delete)
 */
export const useDeleteStudentIdCard = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (id: string) => {
      await studentIdCardsApi.delete(id);
    },
    onSuccess: async () => {
      showToast.success(t('toast.idCardDeleted'));
      await queryClient.invalidateQueries({ queryKey: ['student-id-cards'] });
      await queryClient.refetchQueries({ queryKey: ['student-id-cards'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.idCardDeleteFailed'));
    },
  });
};

/**
 * Convert StudentIdCard to Student format for renderer
 * Handles both regular students and course students
 */
function getStudentForRenderer(card: StudentIdCard): Student | null {
  // Handle course students
  if (card.courseStudentId && card.courseStudent) {
    const courseStudent = card.courseStudent;
    const courseName = courseStudent.course?.name || null;
    return {
      id: courseStudent.id,
      fullName: courseStudent.fullName,
      fatherName: courseStudent.fatherName || '',
      admissionNumber: courseStudent.admissionNo,
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
    } as Student;
  }

  // Handle regular students
  if (!card.student) return null;
  const className = card.class?.name || card.classAcademicYear?.sectionName || null;
  
  return {
    id: card.student.id,
    fullName: card.student.fullName,
    fatherName: card.student.fatherName || '',
    admissionNumber: card.student.admissionNumber,
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
  } as Student;
}

/**
 * Export ID cards (ZIP/PDF) using Canvas rendering
 */
export const useExportIdCards = () => {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ExportIdCardRequest) => {
      // Get cards to export
      let cardsToExport: StudentIdCard[] = [];
      
      if (data.cardIds && data.cardIds.length > 0) {
        // Fetch specific cards
        const cardPromises = data.cardIds.map(id => 
          queryClient.fetchQuery({
            queryKey: ['student-id-card', id],
            queryFn: async () => {
              const apiCard = await studentIdCardsApi.get(id);
              return mapStudentIdCardApiToDomain(apiCard as StudentIdCardApi.StudentIdCard);
            },
          })
        );
        cardsToExport = await Promise.all(cardPromises);
      } else if (data.filters) {
        // Fetch cards by filters
        const apiFilters = mapStudentIdCardFiltersDomainToApi(data.filters);
        const apiCards = await studentIdCardsApi.list(apiFilters);
        cardsToExport = (apiCards as StudentIdCardApi.StudentIdCard[]).map(mapStudentIdCardApiToDomain);
      } else {
        throw new Error('Either cardIds or filters must be provided');
      }

      // Apply filters
      if (data.includeUnprinted === false) {
        cardsToExport = cardsToExport.filter(card => card.isPrinted);
      }
      if (data.includeUnpaid === false) {
        cardsToExport = cardsToExport.filter(card => card.cardFeePaid);
      }

      if (cardsToExport.length === 0) {
        throw new Error('No cards found to export');
      }

      // Fetch templates for all cards
      const templateIds = [...new Set(cardsToExport.map(card => card.idCardTemplateId))];
      const { idCardTemplatesApi } = await import('@/lib/api/client');
      const { mapIdCardTemplateApiToDomain } = await import('@/mappers/idCardTemplateMapper');
      
      const templatePromises = templateIds.map(async (id) => {
        try {
          const apiTemplate = await idCardTemplatesApi.get(id);
          return mapIdCardTemplateApiToDomain(apiTemplate as any);
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error(`[useExportIdCards] Failed to fetch template ${id}:`, error);
          }
          return null;
        }
      });
      
      const templates = (await Promise.all(templatePromises)).filter((t): t is IdCardTemplate => t !== null);
      const templateMap = new Map(templates.map(t => [t.id, t]));

      // Convert sides
      const sidesArray: ('front' | 'back')[] = 
        data.sides === 'both' ? ['front', 'back'] :
        data.sides === 'front' ? ['front'] :
        ['back'];

      // Prepare cards for export
      const exportCards: Array<{ template: IdCardTemplate; student: Student; side: 'front' | 'back'; notes?: string | null; expiryDate?: Date | null }> = [];
      
      for (const card of cardsToExport) {
        const template = templateMap.get(card.idCardTemplateId);
        if (!template) {
          if (import.meta.env.DEV) {
            console.warn(`[useExportIdCards] Template not found for card ${card.id}`);
          }
          continue;
        }

        const student = getStudentForRenderer(card);
        if (!student) {
          if (import.meta.env.DEV) {
            console.warn(`[useExportIdCards] Student not found for card ${card.id}`);
          }
          continue;
        }

        // Calculate expiry date (1 year from print date, or null if not printed)
        const expiryDate = card.printedAt ? new Date(card.printedAt.getTime() + 365 * 24 * 60 * 60 * 1000) : null;

        for (const side of sidesArray) {
          // Check if layout exists for this side
          const layout = side === 'front' ? template.layoutConfigFront : template.layoutConfigBack;
          if (layout) {
            exportCards.push({ 
              template, 
              student, 
              side,
              notes: card.notes || null,
              expiryDate,
            });
          }
        }
      }

      if (exportCards.length === 0) {
        throw new Error('No valid cards to export');
      }

      // Export based on format
      const quality = data.quality || 'high';
      if (data.format === 'zip') {
        await exportIdCardsToZip(exportCards, `id-cards-${Date.now()}`, quality);
      } else {
        await exportBulkIdCardsToPdf(exportCards, data.cardsPerPage || 6, `id-cards-${Date.now()}`, quality);
      }
    },
    onSuccess: () => {
      showToast.success(t('toast.idCardsExported'));
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.idCardExportFailed'));
    },
  });
};

/**
 * Preview ID card image using Canvas rendering
 */
export const usePreviewIdCard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, side }: { id: string; side: 'front' | 'back' }): Promise<string> => {
      // Fetch card data
      const apiCard = await studentIdCardsApi.get(id);
      const card = mapStudentIdCardApiToDomain(apiCard as StudentIdCardApi.StudentIdCard);

      if (!card.student) {
        throw new Error('Student data not found for this ID card');
      }

      // Fetch template
      const { idCardTemplatesApi } = await import('@/lib/api/client');
      const { mapIdCardTemplateApiToDomain } = await import('@/mappers/idCardTemplateMapper');
      const apiTemplate = await idCardTemplatesApi.get(card.idCardTemplateId);
      const template = mapIdCardTemplateApiToDomain(apiTemplate as any);

      const student = getStudentForRenderer(card);
      if (!student) {
        throw new Error('Student data not available');
      }

      const screenRenderSize = getDefaultScreenRenderSize();

      // Render card to Canvas and return data URL
      const canvas = await renderIdCardToCanvas(template, student, side, { 
        quality: 'screen',
        renderWidthPx: screenRenderSize.width,
        renderHeightPx: screenRenderSize.height,
        paddingPx: DEFAULT_ID_CARD_PADDING_PX,
        notes: card.notes || null,
        expiryDate: card.printedAt ? new Date(card.printedAt.getTime() + 365 * 24 * 60 * 60 * 1000) : null,
      });
      return canvas.toDataURL('image/png');
    },
  });
};

/**
 * Export individual ID card using Canvas rendering
 */
export const useExportIndividualIdCard = () => {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, format, side }: { id: string; format: 'png' | 'pdf'; side?: 'front' | 'back' | 'both' }) => {
      // Fetch card data
      const apiCard = await studentIdCardsApi.get(id);
      const card = mapStudentIdCardApiToDomain(apiCard as StudentIdCardApi.StudentIdCard);

      if (!card.student) {
        throw new Error('Student data not found for this ID card');
      }

      // Fetch template
      const { idCardTemplatesApi } = await import('@/lib/api/client');
      const { mapIdCardTemplateApiToDomain } = await import('@/mappers/idCardTemplateMapper');
      const apiTemplate = await idCardTemplatesApi.get(card.idCardTemplateId);
      const template = mapIdCardTemplateApiToDomain(apiTemplate as any);

      const student = getStudentForRenderer(card);
      if (!student) {
        throw new Error('Student data not available');
      }

      // Determine which sides to export
      const sidesToExport: ('front' | 'back')[] = 
        side === 'both' ? ['front', 'back'] :
        side === 'back' ? ['back'] :
        ['front']; // Default to front

      // Filter out sides that don't have layouts
      const validSides = sidesToExport.filter(s => {
        const layout = s === 'front' ? template.layoutConfigFront : template.layoutConfigBack;
        return layout && layout.enabledFields && layout.enabledFields.length > 0;
      });

      if (validSides.length === 0) {
        throw new Error('No valid card sides to export');
      }

      const notes = card.notes || null;
      const expiryDate = card.printedAt ? new Date(card.printedAt.getTime() + 365 * 24 * 60 * 60 * 1000) : null;
      const baseFilename = `id-card-${card.student.admissionNumber || card.id}`;
      const printRenderSize = getDefaultPrintRenderSize();

      if (format === 'pdf') {
        // For PDF, export each side separately if both sides requested
        for (const exportSide of validSides) {
          await exportIdCardToPdf(
            template,
            student,
            exportSide,
            validSides.length > 1 ? `${baseFilename}-${exportSide}` : baseFilename,
            notes,
            expiryDate
          );
        }
      } else {
        // PNG export - export each side separately
        for (const exportSide of validSides) {
          const canvas = await renderIdCardToCanvas(template, student, exportSide, { 
            quality: 'print',
            renderWidthPx: printRenderSize.width,
            renderHeightPx: printRenderSize.height,
            paddingPx: DEFAULT_ID_CARD_PADDING_PX,
            notes,
            expiryDate,
          });
          const dataUrl = canvas.toDataURL('image/png');
          
          // Trigger download
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = validSides.length > 1 ? `${baseFilename}-${exportSide}.png` : `${baseFilename}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
    },
    onSuccess: () => {
      showToast.success(t('toast.idCardExported'));
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.idCardExportFailed'));
    },
  });
};
