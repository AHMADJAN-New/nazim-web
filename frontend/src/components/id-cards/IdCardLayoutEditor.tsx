import { GripVertical, Save, RotateCcw, Eye, ChevronDown, AlignEndHorizontal, AlignStartHorizontal, Rows3, AlignStartVertical, AlignEndVertical, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/hooks/useLanguage';
import { useStudents } from '@/hooks/useStudents';
import { idCardTemplatesApi } from '@/lib/api/client';
import {
  formatIdCardFontFamilyToken,
  ID_CARD_RTL_FONT_FALLBACK_STACK,
  normalizeIdCardText,
  resolveIdCardDefaultFontFamily,
  resolveIdCardFieldValue,
  scaleUniformImageDimensions,
} from '@/lib/idCards/idCardFieldUtils';
import { generateLocalQrCodeDataUrl } from '@/lib/idCards/idCardQr';
import {
  CARD_ASPECT_RATIO,
  DEFAULT_ID_CARD_PADDING_PX,
  DEFAULT_SCREEN_HEIGHT_PX,
  DEFAULT_SCREEN_WIDTH_PX,
  createIdCardRenderMetrics,
  isIdCardRenderDebugEnabled,
} from '@/lib/idCards/idCardRenderMetrics';
import type { IdCardLayoutConfig } from '@/types/domain/idCardTemplate';
import type { Student } from '@/types/domain/student';

// Available fonts for ID card templates
const AVAILABLE_FONTS = [
  { value: 'Arial', label: 'Arial' },
  { value: 'Inter', label: 'Inter' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Segoe UI', label: 'Segoe UI' },
  { value: 'Calibri', label: 'Calibri' },
  { value: 'Cambria', label: 'Cambria' },
  { value: 'Bahij Nassim', label: 'Bahij Nassim' },
  { value: 'Bahij Titr', label: 'Bahij Titr' },
  { value: 'Noto Sans Arabic', label: 'Noto Sans Arabic' },
  { value: 'Noto Naskh Arabic', label: 'Noto Naskh Arabic' },
  { value: 'Noto Nastaliq Urdu', label: 'Noto Nastaliq Urdu' },
  { value: 'Amiri', label: 'Amiri' },
  { value: 'Scheherazade New', label: 'Scheherazade New' },
  { value: 'Cairo', label: 'Cairo' },
  { value: 'Almarai', label: 'Almarai' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Palatino', label: 'Palatino' },
  { value: 'Garamond', label: 'Garamond' },
  { value: 'Comic Sans MS', label: 'Comic Sans MS' },
  { value: 'Trebuchet MS', label: 'Trebuchet MS' },
  { value: 'Impact', label: 'Impact' },
  { value: 'Tahoma', label: 'Tahoma' },
  { value: 'Arial Unicode MS', label: 'Arial Unicode MS' },
];

const DEFAULT_STUDENT_PHOTO_WIDTH = 18;
const DEFAULT_STUDENT_PHOTO_HEIGHT = 28;
const DEFAULT_QR_CODE_SIZE = 10;

const backgroundImageBlobCache = new Map<string, Blob>();
const studentPhotoBlobCache = new Map<string, Blob | null>();

interface FieldConfig {
  id: string;
  label: string;
  key: keyof IdCardLayoutConfig;
  sampleText: string;
  defaultFontSize?: number;
  isImage?: boolean;
  defaultWidth?: number;
  defaultHeight?: number;
}

const DEFAULT_LABEL_TEXTS: Record<string, string> = {
  studentNameLabel: 'نوم:',
  fatherNameLabel: 'د پلار نوم:',
  classLabel: 'درجه:',
  roomLabel: 'خونه:',
  admissionNumberLabel: 'داخله نمبر:',
  studentCodeLabel: 'ID:',
  cardNumberLabel: 'کارت نمبر:',
};

const LABEL_FIELD_IDS = Object.keys(DEFAULT_LABEL_TEXTS);
const FRONT_DEFAULT_ENABLED_FIELDS = [
  'studentNameLabel',
  'studentName',
  'fatherNameLabel',
  'fatherName',
  'classLabel',
  'class',
  'roomLabel',
  'room',
  'admissionNumberLabel',
  'admissionNumber',
  'studentCodeLabel',
  'studentCode',
  'studentPhoto',
  'qrCode',
];
const BACK_DEFAULT_ENABLED_FIELDS = ['schoolName', 'cardNumberLabel', 'cardNumber', 'expiryDate'];
const EDITABLE_TEXT_FIELDS = new Set<string>(['notes', 'expiryDate', 'schoolName', ...LABEL_FIELD_IDS]);

const withDefaultLabelValues = (fieldValues?: Record<string, string | null>): Record<string, string | null> => ({
  ...DEFAULT_LABEL_TEXTS,
  ...(fieldValues || {}),
});

const mergeEnabledFields = (enabledFields: string[] | undefined, defaults: string[]): string[] =>
  Array.from(new Set([...(enabledFields || []), ...defaults]));

const getFieldPreviewText = (
  field: FieldConfig,
  config: IdCardLayoutConfig,
  sampleStudent: Student | null,
  locale: string
): string => {
  return (
    normalizeIdCardText(
      resolveIdCardFieldValue(
        field.id,
        config,
        {
          student: sampleStudent,
          notes: sampleStudent?.notes ?? null,
          createdDate: sampleStudent?.createdAt ?? null,
          locale,
        },
        field.sampleText
      )
    ) ||
    field.sampleText
  );
};

// Front side fields - includes all fields from both front and back
const FRONT_FIELDS: FieldConfig[] = [
  { id: 'studentNameLabel', label: 'Label: Name (نوم)', key: 'studentNameLabelPosition', sampleText: DEFAULT_LABEL_TEXTS.studentNameLabel, defaultFontSize: 10 },
  { id: 'studentName', label: 'Student Name', key: 'studentNamePosition', sampleText: 'Ahmad Mohammad', defaultFontSize: 14 },
  { id: 'fatherNameLabel', label: 'Label: Father Name (د پلار نوم)', key: 'fatherNameLabelPosition', sampleText: DEFAULT_LABEL_TEXTS.fatherNameLabel, defaultFontSize: 10 },
  { id: 'fatherName', label: 'Father Name', key: 'fatherNamePosition', sampleText: 'Mohammad', defaultFontSize: 12 },
  { id: 'classLabel', label: 'Label: Class (درجه)', key: 'classLabelPosition', sampleText: DEFAULT_LABEL_TEXTS.classLabel, defaultFontSize: 10 },
  { id: 'roomLabel', label: 'Label: Room (خونه)', key: 'roomLabelPosition', sampleText: DEFAULT_LABEL_TEXTS.roomLabel, defaultFontSize: 10 },
  { id: 'admissionNumberLabel', label: 'Label: Admission Number (داخله نمبر)', key: 'admissionNumberLabelPosition', sampleText: DEFAULT_LABEL_TEXTS.admissionNumberLabel, defaultFontSize: 10 },
  { id: 'studentCodeLabel', label: 'Label: ID (ID)', key: 'studentCodeLabelPosition', sampleText: DEFAULT_LABEL_TEXTS.studentCodeLabel, defaultFontSize: 10 },
  { id: 'studentCode', label: 'Student Code', key: 'studentCodePosition', sampleText: 'STU-2024-001', defaultFontSize: 10 },
  { id: 'admissionNumber', label: 'Admission Number', key: 'admissionNumberPosition', sampleText: 'ADM-2024-001', defaultFontSize: 10 },
  { id: 'class', label: 'Class', key: 'classPosition', sampleText: 'Grade 10 - Section A', defaultFontSize: 10 },
  { id: 'room', label: 'Room', key: 'roomPosition', sampleText: 'Room 12', defaultFontSize: 10 },
  { id: 'schoolName', label: 'School Name', key: 'schoolNamePosition', sampleText: 'Islamic School', defaultFontSize: 12 },
  { id: 'cardNumberLabel', label: 'Label: Card Number (کارت نمبر)', key: 'cardNumberLabelPosition', sampleText: DEFAULT_LABEL_TEXTS.cardNumberLabel, defaultFontSize: 10 },
  { id: 'cardNumber', label: 'Card Number', key: 'cardNumberPosition', sampleText: 'CARD-2024-001', defaultFontSize: 10 },
  { id: 'createdDate', label: 'Created Date', key: 'createdDatePosition', sampleText: 'Apr 13, 2026', defaultFontSize: 10 },
  { id: 'expiryDate', label: 'Expiry Date', key: 'expiryDatePosition', sampleText: 'Dec 31, 2025', defaultFontSize: 10 },
  { id: 'notes', label: 'Notes', key: 'notesPosition', sampleText: 'Additional information', defaultFontSize: 10 },
  { id: 'studentPhoto', label: 'Student Photo', key: 'studentPhotoPosition', sampleText: '📷', isImage: true, defaultWidth: DEFAULT_STUDENT_PHOTO_WIDTH, defaultHeight: DEFAULT_STUDENT_PHOTO_HEIGHT, defaultFontSize: 12 },
  { id: 'qrCode', label: 'QR Code', key: 'qrCodePosition', sampleText: 'QR', isImage: true, defaultWidth: DEFAULT_QR_CODE_SIZE, defaultHeight: DEFAULT_QR_CODE_SIZE, defaultFontSize: 12 },
];

// Back side fields
const BACK_FIELDS: FieldConfig[] = [
  { id: 'createdDate', label: 'Created Date', key: 'createdDatePosition', sampleText: 'Apr 13, 2026', defaultFontSize: 10 },
  { id: 'schoolName', label: 'School Name', key: 'schoolNamePosition', sampleText: 'Islamic School', defaultFontSize: 12 },
  { id: 'roomLabel', label: 'Label: Room (خونه)', key: 'roomLabelPosition', sampleText: DEFAULT_LABEL_TEXTS.roomLabel, defaultFontSize: 10 },
  { id: 'room', label: 'Room', key: 'roomPosition', sampleText: 'Room 12', defaultFontSize: 10 },
  { id: 'cardNumberLabel', label: 'Label: Card Number (کارت نمبر)', key: 'cardNumberLabelPosition', sampleText: DEFAULT_LABEL_TEXTS.cardNumberLabel, defaultFontSize: 10 },
  { id: 'expiryDate', label: 'Expiry Date', key: 'expiryDatePosition', sampleText: 'Dec 31, 2025', defaultFontSize: 10 },
  { id: 'cardNumber', label: 'Card Number', key: 'cardNumberPosition', sampleText: 'CARD-2024-001', defaultFontSize: 10 },
];

interface IdCardLayoutEditorProps {
  templateId: string;
  backgroundImageUrlFront: string | null;
  backgroundImageUrlBack: string | null;
  layoutConfigFront: IdCardLayoutConfig;
  layoutConfigBack: IdCardLayoutConfig;
  onSave: (configFront: IdCardLayoutConfig, configBack: IdCardLayoutConfig) => void;
  onCancel: () => void;
}

export function IdCardLayoutEditor({
  templateId,
  backgroundImageUrlFront,
  backgroundImageUrlBack,
  layoutConfigFront,
  layoutConfigBack,
  onSave,
  onCancel,
}: IdCardLayoutEditorProps) {
  const { t, language, isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState<'front' | 'back'>('front');
  
  const [configFront, setConfigFront] = useState<IdCardLayoutConfig>(() => ({
    ...layoutConfigFront,
    enabledFields: mergeEnabledFields(layoutConfigFront.enabledFields, FRONT_DEFAULT_ENABLED_FIELDS),
    fieldFonts: layoutConfigFront.fieldFonts || {},
    fieldValues: withDefaultLabelValues(layoutConfigFront.fieldValues),
  }));

  const [configBack, setConfigBack] = useState<IdCardLayoutConfig>(() => ({
    ...layoutConfigBack,
    enabledFields: mergeEnabledFields(layoutConfigBack.enabledFields, BACK_DEFAULT_ENABLED_FIELDS),
    fieldFonts: layoutConfigBack.fieldFonts || {},
    fieldValues: withDefaultLabelValues(layoutConfigBack.fieldValues),
  }));

  // Update configs when props change
  useEffect(() => {
    const updatedConfig = {
      ...layoutConfigFront,
      enabledFields: mergeEnabledFields(layoutConfigFront.enabledFields, FRONT_DEFAULT_ENABLED_FIELDS),
      fieldFonts: layoutConfigFront.fieldFonts || {},
      fieldValues: withDefaultLabelValues(layoutConfigFront.fieldValues),
    };

    // Ensure default width/height for image fields if missing
    if (updatedConfig.studentPhotoPosition) {
      const photoPos = updatedConfig.studentPhotoPosition as any;
      if (!photoPos.width || !photoPos.height) {
        updatedConfig.studentPhotoPosition = {
          ...photoPos,
          width: photoPos.width ?? DEFAULT_STUDENT_PHOTO_WIDTH,
          height: photoPos.height ?? DEFAULT_STUDENT_PHOTO_HEIGHT,
        };
      }
    }

    if (updatedConfig.qrCodePosition) {
      const qrPos = updatedConfig.qrCodePosition as any;
      if (!qrPos.width || !qrPos.height) {
        updatedConfig.qrCodePosition = {
          ...qrPos,
          width: qrPos.width ?? DEFAULT_QR_CODE_SIZE,
          height: qrPos.height ?? DEFAULT_QR_CODE_SIZE,
        };
      }
    }

    setConfigFront(updatedConfig);
  }, [layoutConfigFront]);

  useEffect(() => {
    setConfigBack({
      ...layoutConfigBack,
      enabledFields: mergeEnabledFields(layoutConfigBack.enabledFields, BACK_DEFAULT_ENABLED_FIELDS),
      fieldFonts: layoutConfigBack.fieldFonts || {},
      fieldValues: withDefaultLabelValues(layoutConfigBack.fieldValues),
    });
  }, [layoutConfigBack]);

  const [draggingField, setDraggingField] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const didMouseMoveRef = useRef(false);
  const suppressCanvasClickRef = useRef(false);
  const dragStartPositionRef = useRef<{ x: number; y: number } | null>(null);
  const shiftLockedDirectionRef = useRef<'horizontal' | 'vertical' | null>(null);
  const [alignmentGuides, setAlignmentGuides] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });
  const [backgroundImageLoadedFront, setBackgroundImageLoadedFront] = useState(false);
  const [backgroundImageLoadedBack, setBackgroundImageLoadedBack] = useState(false);
  const [backgroundImageErrorFront, setBackgroundImageErrorFront] = useState(false);
  const [backgroundImageErrorBack, setBackgroundImageErrorBack] = useState(false);
  const [imageUrlFront, setImageUrlFront] = useState<string | null>(null);
  const [imageUrlBack, setImageUrlBack] = useState<string | null>(null);
  const [imageScale, setImageScale] = useState(1);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  const [studentPhotoUrl, setStudentPhotoUrl] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [previewStudent, setPreviewStudent] = useState<Student | null>(null);
  const [showFieldList, setShowFieldList] = useState(true);
  const [showGlobalSettings, setShowGlobalSettings] = useState(true);
  const [showFieldSettings, setShowFieldSettings] = useState(true);
  const renderMetrics = useMemo(() => {
    const width = containerDimensions.width || DEFAULT_SCREEN_WIDTH_PX;
    const height = containerDimensions.height || DEFAULT_SCREEN_HEIGHT_PX;
    return createIdCardRenderMetrics({
      totalWidth: width,
      totalHeight: height,
      paddingPx: DEFAULT_ID_CARD_PADDING_PX,
      designWidthPx: DEFAULT_SCREEN_WIDTH_PX,
      designHeightPx: DEFAULT_SCREEN_HEIGHT_PX,
    });
  }, [containerDimensions.height, containerDimensions.width]);
  const renderDebug = useMemo(() => isIdCardRenderDebugEnabled(), []);
  const isSelectedFieldEditableText = selectedField ? EDITABLE_TEXT_FIELDS.has(selectedField) : false;

  const getEditableFieldLabel = (fieldId: string): string => {
    switch (fieldId) {
      case 'notes':
        return t('idCards.fieldValue') || 'Field Value';
      case 'expiryDate':
        return t('idCards.expiryDateValue') || 'Expiry Date';
      case 'schoolName':
        return t('idCards.schoolNameValue') || 'School Name';
      case 'studentNameLabel':
        return 'Name Label';
      case 'fatherNameLabel':
        return 'Father Name Label';
      case 'classLabel':
        return 'Class Label';
      case 'roomLabel':
        return 'Room Label';
      case 'admissionNumberLabel':
        return 'Admission Number Label';
      case 'studentCodeLabel':
        return 'ID Label';
      case 'cardNumberLabel':
        return 'Card Number Label';
      default:
        return t('idCards.fieldValue') || 'Field Value';
    }
  };

  const getEditableFieldPlaceholder = (fieldId: string): string => {
    switch (fieldId) {
      case 'notes':
        return t('idCards.notesPlaceholder') || 'Enter notes text...';
      case 'schoolName':
        return t('idCards.schoolNamePlaceholder') || 'Enter school name...';
      case 'studentNameLabel':
        return 'e.g., نوم';
      case 'fatherNameLabel':
        return 'e.g., د پلار نوم';
      case 'classLabel':
        return 'e.g., درجه';
      case 'roomLabel':
        return 'e.g., خونه';
      case 'admissionNumberLabel':
        return 'e.g., داخله نمبر';
      case 'studentCodeLabel':
        return 'e.g., ID';
      case 'cardNumberLabel':
        return 'e.g., کارت نمبر';
      default:
        return '';
    }
  };

  const getEditableFieldDescription = (fieldId: string): string => {
    switch (fieldId) {
      case 'notes':
        return t('idCards.notesDescription') || 'Custom text to display. Leave empty to use card notes.';
      case 'schoolName':
        return t('idCards.schoolNameDescription') || 'Custom school name. Leave empty to use student\'s school name.';
      case 'studentNameLabel':
      case 'fatherNameLabel':
      case 'classLabel':
      case 'roomLabel':
      case 'admissionNumberLabel':
      case 'studentCodeLabel':
      case 'cardNumberLabel':
        return 'Custom label text. Move this label independently to align it with the database value field.';
      default:
        return '';
    }
  };

  const setCurrentConfig = activeTab === 'front' ? setConfigFront : setConfigBack;
  const currentConfig = activeTab === 'front' ? configFront : configBack;
  const currentFields = activeTab === 'front' ? FRONT_FIELDS : BACK_FIELDS;
  const currentBackgroundUrl = activeTab === 'front' ? backgroundImageUrlFront : backgroundImageUrlBack;
  const currentImageUrl = activeTab === 'front' ? imageUrlFront : imageUrlBack;
  const currentImageLoaded = activeTab === 'front' ? backgroundImageLoadedFront : backgroundImageLoadedBack;
  const currentImageError = activeTab === 'front' ? backgroundImageErrorFront : backgroundImageErrorBack;

  const getImageFieldSizePercent = useCallback(
    (fieldId: 'studentPhoto' | 'qrCode') => {
      if (fieldId === 'qrCode') {
        return (currentConfig.qrCodePosition as { width?: number } | undefined)?.width ?? DEFAULT_QR_CODE_SIZE;
      }

      return (currentConfig.studentPhotoPosition as { width?: number } | undefined)?.width ?? DEFAULT_STUDENT_PHOTO_WIDTH;
    },
    [currentConfig.qrCodePosition, currentConfig.studentPhotoPosition]
  );

  const setImageFieldSizePercent = useCallback(
    (fieldId: 'studentPhoto' | 'qrCode', nextSize: number) => {
      const boundedSize = Math.max(1, Math.min(100, Number.isFinite(nextSize) ? nextSize : 1));

      setCurrentConfig((prev) => {
        if (fieldId === 'qrCode') {
          const current = (prev.qrCodePosition as { x?: number; y?: number; width?: number; height?: number } | undefined) || {
            x: 80,
            y: 50,
            width: DEFAULT_QR_CODE_SIZE,
            height: DEFAULT_QR_CODE_SIZE,
          };

          return {
            ...prev,
            qrCodePosition: {
              ...current,
              width: boundedSize,
              height: boundedSize,
            },
          };
        }

        const current = (prev.studentPhotoPosition as { x?: number; y?: number; width?: number; height?: number } | undefined) || {
          x: 20,
          y: 50,
          width: DEFAULT_STUDENT_PHOTO_WIDTH,
          height: DEFAULT_STUDENT_PHOTO_HEIGHT,
        };
        const currentWidth = current.width ?? DEFAULT_STUDENT_PHOTO_WIDTH;
        const currentHeight = current.height ?? DEFAULT_STUDENT_PHOTO_HEIGHT;
        const nextDimensions = scaleUniformImageDimensions(currentWidth, currentHeight, boundedSize);

        return {
          ...prev,
          studentPhotoPosition: {
            ...current,
            width: nextDimensions.width,
            height: nextDimensions.height,
          },
        };
      });
    },
    [setCurrentConfig]
  );

  // Sync RTL from language so alignment and canvas render correctly for RTL languages
  useEffect(() => {
    setCurrentConfig((prev) => {
      if (prev.rtl === isRTL) return prev;
      return { ...prev, rtl: isRTL };
    });
  }, [isRTL, activeTab]);

  const handleFieldClick = useCallback((e: React.MouseEvent, fieldId: string) => {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      setSelectedFields((prev) => {
        const next = new Set(prev);
        if (next.has(fieldId)) {
          next.delete(fieldId);
          setSelectedField(next.size > 0 ? Array.from(next).pop()! : null);
        } else {
          next.add(fieldId);
          setSelectedField(fieldId);
        }
        return next;
      });
    } else {
      setSelectedFields(new Set([fieldId]));
      setSelectedField(fieldId);
    }
  }, []);

  const handleCanvasBackgroundClick = useCallback(() => {
    if (suppressCanvasClickRef.current) {
      return;
    }
    setSelectedField(null);
    setSelectedFields(new Set());
  }, []);


  // Fetch students for sample data
  const { data: students = [] } = useStudents();
  const sampleStudent = students.length > 0 ? students[0] : null;
  const livePreviewStudent = previewStudent ?? sampleStudent;

  // Update preview student when students change
  useEffect(() => {
    if (students.length > 0 && !previewStudent) {
      setPreviewStudent(students[0]);
    } else if (previewStudent && !students.find(s => s.id === previewStudent.id)) {
      // If current preview student is no longer in list, use first student
      setPreviewStudent(students.length > 0 ? students[0] : null);
    }
  }, [students, previewStudent]);

  // Load background images
  useEffect(() => {
    if (!backgroundImageUrlFront) {
      setBackgroundImageErrorFront(true);
      return;
    }

    const loadImage = async () => {
      try {
        setBackgroundImageLoadedFront(false);
        setBackgroundImageErrorFront(false);

        const cacheKey = `${templateId}:front:${backgroundImageUrlFront}`;
        const cachedBlob = backgroundImageBlobCache.get(cacheKey);
        const blob =
          cachedBlob ??
          (await idCardTemplatesApi.getBackgroundImage(templateId, 'front')).blob;

        if (!cachedBlob) {
          backgroundImageBlobCache.set(cacheKey, blob);
        }

        const url = URL.createObjectURL(blob);
        setImageUrlFront(url);
        
        const img = new Image();
        img.onload = () => {
          setBackgroundImageLoadedFront(true);
          const maxWidth = 400; // CR80 width scaled for preview
          const scale = img.width > maxWidth ? maxWidth / img.width : 1;
          setImageScale(scale);
        };
        img.onerror = () => {
          setBackgroundImageErrorFront(true);
        };
        img.src = url;
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Failed to load front background image:', error);
        }
        setBackgroundImageErrorFront(true);
      }
    };

    loadImage();

    return () => {
      if (imageUrlFront) {
        URL.revokeObjectURL(imageUrlFront);
      }
    };
  }, [backgroundImageUrlFront, templateId]);

  useEffect(() => {
    if (!backgroundImageUrlBack) {
      setBackgroundImageErrorBack(true);
      return;
    }

    const loadImage = async () => {
      try {
        setBackgroundImageLoadedBack(false);
        setBackgroundImageErrorBack(false);

        const cacheKey = `${templateId}:back:${backgroundImageUrlBack}`;
        const cachedBlob = backgroundImageBlobCache.get(cacheKey);
        const blob =
          cachedBlob ??
          (await idCardTemplatesApi.getBackgroundImage(templateId, 'back')).blob;

        if (!cachedBlob) {
          backgroundImageBlobCache.set(cacheKey, blob);
        }

        const url = URL.createObjectURL(blob);
        setImageUrlBack(url);
        
        const img = new Image();
        img.onload = () => {
          setBackgroundImageLoadedBack(true);
          const maxWidth = 400;
          const scale = img.width > maxWidth ? maxWidth / img.width : 1;
          setImageScale(scale);
        };
        img.onerror = () => {
          setBackgroundImageErrorBack(true);
        };
        img.src = url;
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Failed to load back background image:', error);
        }
        setBackgroundImageErrorBack(true);
      }
    };

    loadImage();

    return () => {
      if (imageUrlBack) {
        URL.revokeObjectURL(imageUrlBack);
      }
    };
  }, [backgroundImageUrlBack, templateId]);

  // Load student photo for preview
  useEffect(() => {
    const loadStudentPhoto = async () => {
      const picturePathForPreview = previewStudent?.picturePath?.trim() || previewStudent?.profilePhoto?.trim();
      if (!previewStudent?.id || activeTab !== 'front' || !picturePathForPreview) {
        setStudentPhotoUrl(null);
        return;
      }

      try {
        const { apiClient } = await import('@/lib/api/client');
        const token = apiClient.getToken();
        const cacheKey = `${previewStudent.id}:${picturePathForPreview}`;
        const cachedBlob = studentPhotoBlobCache.get(cacheKey);
        if (cachedBlob === null) {
          setStudentPhotoUrl(null);
          return;
        }

        if (cachedBlob) {
          setStudentPhotoUrl(URL.createObjectURL(cachedBlob));
          return;
        }

        const url = `/api/students/${previewStudent.id}/picture`;

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'image/*',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          credentials: 'include',
        });

        if (response.ok) {
          const blob = await response.blob();
          studentPhotoBlobCache.set(cacheKey, blob);
          const blobUrl = URL.createObjectURL(blob);
          setStudentPhotoUrl(blobUrl);
        } else {
          studentPhotoBlobCache.set(cacheKey, null);
          setStudentPhotoUrl(null);
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('[IdCardLayoutEditor] Failed to load student photo:', error);
        }
        setStudentPhotoUrl(null);
      }
    };

    loadStudentPhoto();
  }, [previewStudent?.id ?? null, previewStudent?.picturePath ?? null, previewStudent?.profilePhoto ?? null, activeTab]);

  // Cleanup student photo blob URL
  useEffect(() => {
    return () => {
      if (studentPhotoUrl && studentPhotoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(studentPhotoUrl);
      }
    };
  }, [studentPhotoUrl]);

  // Generate QR code for preview
  useEffect(() => {
    const generateQRCode = async () => {
      if (!previewStudent || activeTab !== 'front') {
        setQrCodeUrl(null);
        return;
      }

      try {
        const valueSource = currentConfig.qrCodeValueSource || 'student_code';

        let qrValue: string | null | undefined = null;
        switch (valueSource) {
          case 'student_id':
            qrValue = previewStudent.id;
            break;
          case 'student_code':
            qrValue = previewStudent.studentCode;
            break;
          case 'admission_number':
            qrValue = previewStudent.admissionNumber;
            break;
          case 'card_number':
            qrValue = previewStudent.cardNumber;
            break;
          case 'roll_number':
            qrValue = previewStudent.rollNumber;
            break;
          default:
            qrValue = previewStudent.studentCode || previewStudent.admissionNumber || previewStudent.id;
        }

        if (!qrValue) {
          qrValue = previewStudent.studentCode || previewStudent.admissionNumber || previewStudent.id;
        }

        if (!qrValue) {
          setQrCodeUrl(null);
          return;
        }

        const qrDataUrl = await generateLocalQrCodeDataUrl(qrValue, 200);
        setQrCodeUrl(qrDataUrl);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('[IdCardLayoutEditor] Failed to generate QR code:', error);
        }
        setQrCodeUrl(null);
      }
    };

    if (currentConfig.enabledFields?.includes('qrCode')) {
      generateQRCode();
    } else {
      setQrCodeUrl(null);
    }
  }, [previewStudent?.id ?? null, previewStudent?.studentCode ?? null, previewStudent?.admissionNumber ?? null, previewStudent?.cardNumber ?? null, previewStudent?.rollNumber ?? null, currentConfig.enabledFields, currentConfig.qrCodeValueSource, activeTab]);

  // Cleanup QR code blob URL
  useEffect(() => {
    return () => {
      if (qrCodeUrl && qrCodeUrl.startsWith('blob:')) {
        URL.revokeObjectURL(qrCodeUrl);
      }
    };
  }, [qrCodeUrl]);

  // Track container dimensions for image sizing
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setContainerDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    // Initial measurement
    updateDimensions();

    // Update on window resize
    window.addEventListener('resize', updateDimensions);
    
    // Also update when background image loads (might change container size)
    if (currentImageLoaded) {
      // Small delay to ensure layout has settled
      setTimeout(updateDimensions, 100);
    }
    
    return () => window.removeEventListener('resize', updateDimensions);
  }, [currentImageLoaded, activeTab]);

  const getFieldPosition = (fieldKey: keyof IdCardLayoutConfig) => {
    const position = currentConfig[fieldKey] as { x: number; y: number; width?: number; height?: number } | undefined;
    if (position) return position;
    
    // Default positions for ID card (CR80). RTL: labels on the RIGHT (high x), values on the LEFT (low x).
    const defaultPositions: Record<string, { x: number; y: number; width?: number; height?: number }> = {
      studentNameLabelPosition: { x: 72, y: 40 },
      studentNamePosition: { x: 28, y: 40 },
      fatherNameLabelPosition: { x: 72, y: 50 },
      fatherNamePosition: { x: 28, y: 50 },
      studentCodeLabelPosition: { x: 72, y: 60 },
      studentCodePosition: { x: 28, y: 60 },
      admissionNumberLabelPosition: { x: 72, y: 70 },
      admissionNumberPosition: { x: 28, y: 70 },
      classLabelPosition: { x: 72, y: 80 },
      classPosition: { x: 28, y: 80 },
      roomLabelPosition: { x: 72, y: 88 },
      roomPosition: { x: 28, y: 88 },
      studentPhotoPosition: { x: 20, y: 50, width: DEFAULT_STUDENT_PHOTO_WIDTH, height: DEFAULT_STUDENT_PHOTO_HEIGHT }, // ID-card portrait frame
      qrCodePosition: { x: 80, y: 50, width: DEFAULT_QR_CODE_SIZE, height: DEFAULT_QR_CODE_SIZE }, // Square
      schoolNamePosition: { x: 50, y: 30 },
      cardNumberLabelPosition: { x: 72, y: 80 },
      createdDatePosition: { x: 50, y: 52 },
      expiryDatePosition: { x: 50, y: 60 },
      cardNumberPosition: { x: 28, y: 80 },
      notesPosition: { x: 50, y: 90 },
    };
    
    return defaultPositions[fieldKey] || { x: 50, y: 50 };
  };

  const updateFieldPosition = (fieldKey: keyof IdCardLayoutConfig, x: number, y: number, width?: number, height?: number) => {
    setCurrentConfig((prev) => {
      const currentPosition = (prev[fieldKey] as any) || {};
      // Preserve width and height when updating position
      return {
        ...prev,
        [fieldKey]: { 
          ...currentPosition,
          x, 
          y,
          // Set default width/height if not already set
          width: width !== undefined ? width : (currentPosition.width ?? (fieldKey === 'qrCodePosition' ? DEFAULT_QR_CODE_SIZE : fieldKey === 'studentPhotoPosition' ? DEFAULT_STUDENT_PHOTO_WIDTH : undefined)),
          height: height !== undefined ? height : (currentPosition.height ?? (fieldKey === 'qrCodePosition' ? DEFAULT_QR_CODE_SIZE : fieldKey === 'studentPhotoPosition' ? DEFAULT_STUDENT_PHOTO_HEIGHT : undefined)),
        },
      };
    });
  };

  const LABEL_POSITION_KEYS: (keyof IdCardLayoutConfig)[] = [
    'studentNameLabelPosition', 'fatherNameLabelPosition', 'studentCodeLabelPosition',
    'admissionNumberLabelPosition', 'classLabelPosition', 'roomLabelPosition', 'cardNumberLabelPosition',
  ];
  const VALUE_POSITION_KEYS: (keyof IdCardLayoutConfig)[] = [
    'studentNamePosition', 'fatherNamePosition', 'studentCodePosition', 'admissionNumberPosition',
    'classPosition', 'roomPosition', 'cardNumberPosition',
  ];
  const LABEL_DEFAULT_Y: Record<string, number> = {
    studentNameLabelPosition: 40, fatherNameLabelPosition: 50, studentCodeLabelPosition: 60,
    admissionNumberLabelPosition: 70, classLabelPosition: 80, roomLabelPosition: 88, cardNumberLabelPosition: 80,
  };
  const VALUE_DEFAULT_Y: Record<string, number> = {
    studentNamePosition: 40, fatherNamePosition: 50, studentCodePosition: 60, admissionNumberPosition: 70,
    classPosition: 80, roomPosition: 88, cardNumberPosition: 80,
  };

  const alignLabelsRight = () => {
    setCurrentConfig((prev) => {
      const next = { ...prev };
      LABEL_POSITION_KEYS.forEach((key) => {
        const cur = prev[key] as { x: number; y: number; width?: number; height?: number } | undefined;
        const y = cur?.y ?? LABEL_DEFAULT_Y[key as string] ?? 50;
        (next as any)[key] = { ...(cur || {}), x: 72, y };
      });
      return next;
    });
  };

  const alignValuesLeft = () => {
    setCurrentConfig((prev) => {
      const next = { ...prev };
      VALUE_POSITION_KEYS.forEach((key) => {
        const cur = prev[key] as { x: number; y: number; width?: number; height?: number } | undefined;
        const y = cur?.y ?? VALUE_DEFAULT_Y[key as string] ?? 50;
        (next as any)[key] = { ...(cur || {}), x: 28, y };
      });
      return next;
    });
  };

  const distributeRows = () => {
    setCurrentConfig((prev) => {
      const next = { ...prev };
      const rowPairs: Array<{ labelKey: keyof IdCardLayoutConfig; valueKey: keyof IdCardLayoutConfig; y: number }> = [
        { labelKey: 'studentNameLabelPosition', valueKey: 'studentNamePosition', y: 38 },
        { labelKey: 'fatherNameLabelPosition', valueKey: 'fatherNamePosition', y: 48 },
        { labelKey: 'studentCodeLabelPosition', valueKey: 'studentCodePosition', y: 58 },
        { labelKey: 'admissionNumberLabelPosition', valueKey: 'admissionNumberPosition', y: 68 },
        { labelKey: 'classLabelPosition', valueKey: 'classPosition', y: 78 },
        { labelKey: 'roomLabelPosition', valueKey: 'roomPosition', y: 88 },
      ];
      rowPairs.forEach(({ labelKey, valueKey, y }) => {
        const labelCur = (prev[labelKey] as { x: number; y: number } | undefined) || {};
        const valueCur = (prev[valueKey] as { x: number; y: number } | undefined) || {};
        (next as any)[labelKey] = { ...labelCur, x: (labelCur as any).x ?? 72, y };
        (next as any)[valueKey] = { ...valueCur, x: (valueCur as any).x ?? 28, y };
      });
      return next;
    });
  };

  // Get position config key for a field id
  const getPositionKeyForFieldId = (fieldId: string): keyof IdCardLayoutConfig | null => {
    const field = currentFields.find((f) => f.id === fieldId);
    return field ? (field.key as keyof IdCardLayoutConfig) : null;
  };

  // Align selected fields (multi-select with Ctrl+click). Uses min/max so works correctly for RTL and LTR.
  const selectedPositionKeys = useMemo(() => {
    return Array.from(selectedFields)
      .map(getPositionKeyForFieldId)
      .filter((k): k is keyof IdCardLayoutConfig => k != null);
  }, [selectedFields, currentFields]);

  const alignSelectedToStart = () => {
    if (selectedPositionKeys.length === 0) return;
    const positions = selectedPositionKeys.map((key) => getFieldPosition(key));
    const minX = Math.min(...positions.map((p) => p.x));
    setCurrentConfig((prev) => {
      const next = { ...prev };
      selectedPositionKeys.forEach((key) => {
        const cur = (prev[key] as { x: number; y: number; width?: number; height?: number } | undefined) || {};
        (next as any)[key] = { ...cur, x: minX, y: cur.y ?? 50 };
      });
      return next;
    });
  };

  const alignSelectedToEnd = () => {
    if (selectedPositionKeys.length === 0) return;
    const positions = selectedPositionKeys.map((key) => getFieldPosition(key));
    const maxX = Math.max(...positions.map((p) => p.x));
    setCurrentConfig((prev) => {
      const next = { ...prev };
      selectedPositionKeys.forEach((key) => {
        const cur = (prev[key] as { x: number; y: number; width?: number; height?: number } | undefined) || {};
        (next as any)[key] = { ...cur, x: maxX, y: cur.y ?? 50 };
      });
      return next;
    });
  };

  const alignSelectedToTop = () => {
    if (selectedPositionKeys.length === 0) return;
    const positions = selectedPositionKeys.map((key) => getFieldPosition(key));
    const minY = Math.min(...positions.map((p) => p.y));
    setCurrentConfig((prev) => {
      const next = { ...prev };
      selectedPositionKeys.forEach((key) => {
        const cur = (prev[key] as { x: number; y: number; width?: number; height?: number } | undefined) || {};
        (next as any)[key] = { ...cur, x: cur.x ?? 50, y: minY };
      });
      return next;
    });
  };

  const alignSelectedToBottom = () => {
    if (selectedPositionKeys.length === 0) return;
    const positions = selectedPositionKeys.map((key) => getFieldPosition(key));
    const maxY = Math.max(...positions.map((p) => p.y));
    setCurrentConfig((prev) => {
      const next = { ...prev };
      selectedPositionKeys.forEach((key) => {
        const cur = (prev[key] as { x: number; y: number; width?: number; height?: number } | undefined) || {};
        (next as any)[key] = { ...cur, x: cur.x ?? 50, y: maxY };
      });
      return next;
    });
  };

  const distributeSelectedVertically = () => {
    if (selectedPositionKeys.length < 2) return;
    const keysWithY = selectedPositionKeys.map((key) => ({ key, y: getFieldPosition(key).y }));
    keysWithY.sort((a, b) => a.y - b.y);
    const minY = keysWithY[0].y;
    const maxY = keysWithY[keysWithY.length - 1].y;
    const step = (maxY - minY) / (keysWithY.length - 1);
    setCurrentConfig((prev) => {
      const next = { ...prev };
      keysWithY.forEach(({ key }, i) => {
        const cur = (prev[key] as { x: number; y: number; width?: number; height?: number } | undefined) || {};
        const newY = keysWithY.length === 1 ? minY : minY + i * step;
        (next as any)[key] = { ...cur, x: cur.x ?? 50, y: newY };
      });
      return next;
    });
  };

  const handleMouseDown = useCallback((e: React.MouseEvent, fieldId: string) => {
    e.preventDefault();
    e.stopPropagation();
    didMouseMoveRef.current = false;
    if (e.ctrlKey || e.metaKey) {
      dragStartPositionRef.current = null;
      shiftLockedDirectionRef.current = null;
      handleFieldClick(e, fieldId);
      return;
    }
    setSelectedFields(new Set([fieldId]));
    setSelectedField(fieldId);
    setDraggingField(fieldId);

    const field = currentFields.find((f) => f.id === fieldId);
    if (!field || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const totalWidth = containerRef.current.clientWidth;
    const totalHeight = containerRef.current.clientHeight;
    const position = getFieldPosition(field.key);
    const metrics = createIdCardRenderMetrics({
      totalWidth,
      totalHeight,
      paddingPx: DEFAULT_ID_CARD_PADDING_PX,
      designWidthPx: DEFAULT_SCREEN_WIDTH_PX,
      designHeightPx: DEFAULT_SCREEN_HEIGHT_PX,
    });
    const fieldX = metrics.pctToX(position.x);
    const fieldY = metrics.pctToY(position.y);
    dragStartPositionRef.current = { x: position.x, y: position.y };
    shiftLockedDirectionRef.current = null;
    setAlignmentGuides({ x: null, y: null });

    const borderWidth = (rect.width - totalWidth) / 2;
    setDragOffset({
      x: e.clientX - rect.left - borderWidth - fieldX,
      y: e.clientY - rect.top - borderWidth - fieldY,
    });
  }, [currentConfig, currentFields, handleFieldClick]);

  const handleResizeStart = useCallback((e: React.MouseEvent, fieldId: string, direction?: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (import.meta.env.DEV) {
      console.log('[IdCardLayoutEditor] Resize start:', { fieldId, direction, clientX: e.clientX, clientY: e.clientY });
    }

    setSelectedField(fieldId);
    setIsResizing(true);
    setResizeHandle(direction || null);

    const el = containerRef.current;
    if (!el) {
      if (import.meta.env.DEV) {
        console.warn('[IdCardLayoutEditor] No container ref found');
      }
      return;
    }
    const rect = el.getBoundingClientRect();
    const totalWidth = el.clientWidth;
    const totalHeight = el.clientHeight;
    const borderWidth = (rect.width - totalWidth) / 2;

    const metrics = createIdCardRenderMetrics({
      totalWidth,
      totalHeight,
      paddingPx: DEFAULT_ID_CARD_PADDING_PX,
      designWidthPx: DEFAULT_SCREEN_WIDTH_PX,
      designHeightPx: DEFAULT_SCREEN_HEIGHT_PX,
    });
    const startX = metrics.xToPct(e.clientX - rect.left - borderWidth);
    const startY = metrics.yToPct(e.clientY - rect.top - borderWidth);

    // Get current position and width/height
    let currentX = 20;
    let currentY = 50;
    let currentWidth = 8; // default (ID card photo width)
    let currentHeight = 12; // default (ID card photo height)

    if (fieldId === 'studentPhoto') {
      const pos = currentConfig.studentPhotoPosition as any;
      currentX = pos?.x ?? 20;
      currentY = pos?.y ?? 50;
      currentWidth = pos?.width ?? DEFAULT_STUDENT_PHOTO_WIDTH;
      currentHeight = pos?.height ?? DEFAULT_STUDENT_PHOTO_HEIGHT;
    } else if (fieldId === 'qrCode') {
      const pos = currentConfig.qrCodePosition as any;
      currentX = pos?.x ?? 80;
      currentY = pos?.y ?? 50;
      currentWidth = pos?.width ?? DEFAULT_QR_CODE_SIZE;
      currentHeight = pos?.height ?? DEFAULT_QR_CODE_SIZE;
    }

    if (import.meta.env.DEV) {
      console.log('[IdCardLayoutEditor] Initial resize values:', {
        startX, startY, currentX, currentY, currentWidth, currentHeight, direction
      });
    }

    setResizeStart({
      x: startX,
      y: startY,
      width: currentWidth,
      height: currentHeight,
    });
  }, [currentConfig]);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isResizing && selectedField && containerRef.current) {
        didMouseMoveRef.current = true;
        setAlignmentGuides((prev) => (prev.x === null && prev.y === null ? prev : { x: null, y: null }));
        const rect = containerRef.current.getBoundingClientRect();
        const totalWidth = containerRef.current.clientWidth;
        const totalHeight = containerRef.current.clientHeight;
        const borderWidth = (rect.width - totalWidth) / 2;
        const metrics = createIdCardRenderMetrics({
          totalWidth,
          totalHeight,
          paddingPx: DEFAULT_ID_CARD_PADDING_PX,
          designWidthPx: DEFAULT_SCREEN_WIDTH_PX,
          designHeightPx: DEFAULT_SCREEN_HEIGHT_PX,
        });
        const currentX = metrics.xToPct(e.clientX - rect.left - borderWidth);
        const currentY = metrics.yToPct(e.clientY - rect.top - borderWidth);

        const deltaX = currentX - resizeStart.x;
        const deltaY = currentY - resizeStart.y;
        const resizeContributions: number[] = [];

        if (resizeHandle?.includes('e')) {
          resizeContributions.push(deltaX);
        }
        if (resizeHandle?.includes('w')) {
          resizeContributions.push(-deltaX);
        }
        if (resizeHandle?.includes('s')) {
          resizeContributions.push(deltaY);
        }
        if (resizeHandle?.includes('n')) {
          resizeContributions.push(-deltaY);
        }
        if (resizeContributions.length === 0) {
          resizeContributions.push(deltaX, deltaY);
        }

        const sizeDelta =
          resizeContributions.reduce((sum, value) => sum + value, 0) / resizeContributions.length;
        const nextSize = Math.max(1, Math.min(100, resizeStart.width + sizeDelta));

        let newWidth = nextSize;
        let newHeight = nextSize;

        if (import.meta.env.DEV) {
          console.log('[IdCardLayoutEditor] Resize values:', {
            currentX, currentY, deltaX, deltaY, resizeHandle, sizeDelta, nextSize
          });
        }

        if (selectedField === 'qrCode') {
          newWidth = nextSize;
          newHeight = nextSize;
        } else if (selectedField === 'studentPhoto') {
          const nextDimensions = scaleUniformImageDimensions(resizeStart.width, resizeStart.height, nextSize);
          newWidth = nextDimensions.width;
          newHeight = nextDimensions.height;
        }

        // Update width and height in config
        if (selectedField === 'studentPhoto') {
          setCurrentConfig(prev => ({
            ...prev,
            studentPhotoPosition: {
              ...(prev.studentPhotoPosition as any),
              width: newWidth,
              height: newHeight,
            },
          }));
        } else if (selectedField === 'qrCode') {
          setCurrentConfig(prev => ({
            ...prev,
            qrCodePosition: {
              ...(prev.qrCodePosition as any),
              width: newWidth,
              height: newHeight,
            },
          }));
        }
      } else if (draggingField && containerRef.current) {
        didMouseMoveRef.current = true;
        const field = currentFields.find((f) => f.id === draggingField);
        if (!field) return;

        const rect = containerRef.current.getBoundingClientRect();
        const totalWidth = containerRef.current.clientWidth;
        const totalHeight = containerRef.current.clientHeight;
        const borderWidth = (rect.width - totalWidth) / 2;
        const metrics = createIdCardRenderMetrics({
          totalWidth,
          totalHeight,
          paddingPx: DEFAULT_ID_CARD_PADDING_PX,
          designWidthPx: DEFAULT_SCREEN_WIDTH_PX,
          designHeightPx: DEFAULT_SCREEN_HEIGHT_PX,
        });
        const x = metrics.xToPct(e.clientX - rect.left - borderWidth - dragOffset.x);
        const y = metrics.yToPct(e.clientY - rect.top - borderWidth - dragOffset.y);

        // Clamp to container bounds
        const clampedX = Math.max(0, Math.min(100, x));
        const clampedY = Math.max(0, Math.min(100, y));
        let nextX = clampedX;
        let nextY = clampedY;

        // Photoshop-like Shift lock: move in a straight horizontal/vertical line.
        const dragStart = dragStartPositionRef.current;
        if (e.shiftKey && dragStart) {
          if (!shiftLockedDirectionRef.current) {
            const deltaX = Math.abs(nextX - dragStart.x);
            const deltaY = Math.abs(nextY - dragStart.y);
            shiftLockedDirectionRef.current = deltaX >= deltaY ? 'horizontal' : 'vertical';
          }

          if (shiftLockedDirectionRef.current === 'horizontal') {
            nextY = dragStart.y;
          } else {
            nextX = dragStart.x;
          }
        } else {
          shiftLockedDirectionRef.current = null;
        }

        // Smart guides + snap to other enabled fields (Photoshop/Word style alignment)
        const SNAP_THRESHOLD = 0.8; // percent
        const enabledIds = new Set(currentConfig.enabledFields || []);
        const otherFieldPositions = currentFields
          .filter((f) => f.id !== draggingField && enabledIds.has(f.id))
          .map((f) => getFieldPosition(f.key));

        let guideX: number | null = null;
        let guideY: number | null = null;

        if (otherFieldPositions.length > 0) {
          let nearestX: number | null = null;
          let nearestXDiff = Number.POSITIVE_INFINITY;
          let nearestY: number | null = null;
          let nearestYDiff = Number.POSITIVE_INFINITY;

          for (const pos of otherFieldPositions) {
            const xDiff = Math.abs(pos.x - nextX);
            if (xDiff < nearestXDiff) {
              nearestXDiff = xDiff;
              nearestX = pos.x;
            }

            const yDiff = Math.abs(pos.y - nextY);
            if (yDiff < nearestYDiff) {
              nearestYDiff = yDiff;
              nearestY = pos.y;
            }
          }

          if (nearestX !== null && nearestXDiff <= SNAP_THRESHOLD) {
            nextX = nearestX;
            guideX = nearestX;
          }

          if (nearestY !== null && nearestYDiff <= SNAP_THRESHOLD) {
            nextY = nearestY;
            guideY = nearestY;
          }
        }

        setAlignmentGuides((prev) => (prev.x === guideX && prev.y === guideY ? prev : { x: guideX, y: guideY }));
        updateFieldPosition(field.key, nextX, nextY);
      }
    },
    [draggingField, dragOffset, isResizing, selectedField, resizeStart, resizeHandle, currentFields, currentConfig, setCurrentConfig]
  );

  const handleMouseUp = useCallback(() => {
    if (didMouseMoveRef.current) {
      suppressCanvasClickRef.current = true;
      // Clear after the click generated by mouseup has been processed
      setTimeout(() => {
        suppressCanvasClickRef.current = false;
      }, 0);
    }
    setDraggingField(null);
    setIsResizing(false);
    setResizeHandle(null);
    didMouseMoveRef.current = false;
    dragStartPositionRef.current = null;
    shiftLockedDirectionRef.current = null;
    setAlignmentGuides({ x: null, y: null });
  }, []);

  useEffect(() => {
    if (draggingField || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingField, isResizing, handleMouseMove, handleMouseUp]);

  const toggleFieldEnabled = (fieldId: string) => {
    setCurrentConfig((prev) => {
      const enabledFields = prev.enabledFields || [];
      const newEnabledFields = enabledFields.includes(fieldId)
        ? enabledFields.filter((id) => id !== fieldId)
        : [...enabledFields, fieldId];
      return {
        ...prev,
        enabledFields: newEnabledFields,
      };
    });
  };

  // Helper functions for per-field font customization
  const updateFieldFont = (fieldId: string, property: 'fontSize' | 'fontFamily' | 'textColor' | 'textAlign', value: number | string) => {
    setCurrentConfig((prev) => {
      const newFieldFonts = { ...(prev.fieldFonts || {}) };
      if (!newFieldFonts[fieldId]) {
        newFieldFonts[fieldId] = {};
      }
      newFieldFonts[fieldId] = {
        ...newFieldFonts[fieldId],
        [property]: value,
      };
      return {
        ...prev,
        fieldFonts: newFieldFonts,
      };
    });
  };

  const clearFieldFont = (fieldId: string, property: 'fontSize' | 'fontFamily' | 'textColor' | 'textAlign') => {
    setCurrentConfig((prev) => {
      const newFieldFonts = { ...(prev.fieldFonts || {}) };
      if (newFieldFonts[fieldId]) {
        const updated = { ...newFieldFonts[fieldId] };
        delete updated[property];
        if (Object.keys(updated).length === 0) {
          delete newFieldFonts[fieldId];
        } else {
          newFieldFonts[fieldId] = updated;
        }
      }
      return {
        ...prev,
        fieldFonts: newFieldFonts,
      };
    });
  };

  const getFieldStyle = (field: FieldConfig) => {
    const position = getFieldPosition(field.key);
    const baseFontSize = currentConfig.fontSize || field.defaultFontSize || 12;
    
    // Get per-field font settings if available
    const fieldFont = currentConfig.fieldFonts?.[field.id];
    
    // Use per-field font family or fall back to global/default (same rules as idCardCanvasRenderer)
    const isRtl = currentConfig.rtl !== false;
    const defaultFontFamily = resolveIdCardDefaultFontFamily(isRtl, currentConfig.fontFamily);
    let fontFamily = defaultFontFamily;
    if (fieldFont?.fontFamily) {
      const tok = formatIdCardFontFamilyToken(fieldFont.fontFamily);
      fontFamily = isRtl ? `${tok}, ${ID_CARD_RTL_FONT_FALLBACK_STACK}` : tok;
    }
    
    // Calculate font size: use per-field custom size, or use base size directly (no multiplier)
    let fontSize = baseFontSize;
    if (fieldFont?.fontSize !== undefined) {
      // Use custom font size for this field (absolute value)
      fontSize = fieldFont.fontSize;
    }
    
    // Scale font size relative to the design preview size for consistent rendering
    const scaledFontSize = fontSize * renderMetrics.fontScale;
    
    // Get text color: use per-field custom color, or fall back to global/default
    let textColor = currentConfig.textColor || '#000000';
    if (fieldFont?.textColor) {
      textColor = fieldFont.textColor;
    }
    
    const isSelected = selectedFields.has(field.id);
    const isDragging = draggingField === field.id;

    if (field.isImage) {
      const imagePosition = position as { x: number; y: number; width?: number; height?: number };
      
      const imageWidthPercent = imagePosition.width ?? (field.id === 'studentPhoto' ? DEFAULT_STUDENT_PHOTO_WIDTH : DEFAULT_QR_CODE_SIZE);
      const imageHeightPercent = imagePosition.height ?? (field.id === 'studentPhoto' ? DEFAULT_STUDENT_PHOTO_HEIGHT : DEFAULT_QR_CODE_SIZE);
      
      // Calculate pixel dimensions from percentages and container dimensions
      let imageWidthPx = renderMetrics.pctToWidth(imageWidthPercent);
      let imageHeightPx = renderMetrics.pctToHeight(imageHeightPercent);
      
      // For QR codes, force square dimensions (use smaller dimension)
      if (field.id === 'qrCode') {
        const qrSizePx = Math.min(imageWidthPx, imageHeightPx);
        imageWidthPx = qrSizePx;
        imageHeightPx = qrSizePx;
      }
      
      return {
        position: 'absolute' as const,
        left: `${renderMetrics.pctToX(imagePosition.x)}px`,
        top: `${renderMetrics.pctToY(imagePosition.y)}px`,
        transform: 'translate(-50%, -50%)',
        width: `${imageWidthPx}px`,
        height: `${imageHeightPx}px`,
        border: isSelected ? '2px dashed #3b82f6' : '2px dashed transparent',
        backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.8)' : 'transparent',
        cursor: 'move',
        zIndex: isSelected || isDragging ? 10 : 1,
        opacity: isDragging ? 0.7 : 1,
        pointerEvents: 'auto' as const,
      };
    }

    const isLabelField = LABEL_FIELD_IDS.includes(field.id);
    const isCenterField = ['schoolName', 'notes', 'createdDate', 'expiryDate'].includes(field.id);

    // Resolve text alignment: per-field override > default based on field type
    const defaultAlign = isLabelField ? 'right' : isCenterField ? 'center' : 'left';
    const fieldTextAlign = (currentConfig.fieldFonts?.[field.id]?.textAlign) ?? defaultAlign;
    const transformX = fieldTextAlign === 'right' ? '-100%' : fieldTextAlign === 'center' ? '-50%' : '0';

    return {
      position: 'absolute' as const,
      left: `${renderMetrics.pctToX(position.x)}px`,
      top: `${renderMetrics.pctToY(position.y)}px`,
      transform: `translate(${transformX}, -50%)`,
      fontSize: `${scaledFontSize}px`,
      fontFamily,
      color: textColor,
      textAlign: fieldTextAlign as 'left' | 'center' | 'right',
      cursor: 'move',
      userSelect: 'none' as const,
      zIndex: isSelected || isDragging ? 10 : 1,
      opacity: isDragging ? 0.7 : 1,
      border: isSelected ? '2px dashed #3b82f6' : '2px dashed transparent',
      padding: '2px 4px',
      backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
      borderRadius: '2px',
      whiteSpace: 'nowrap' as const,
      pointerEvents: 'auto' as const,
      direction: currentConfig.rtl !== false ? ('rtl' as const) : ('ltr' as const),
      unicodeBidi: 'plaintext' as const,
    };
  };

  const handleSave = () => {
    // Ensure default widths/heights are set for image fields before saving
    const configFrontToSave = { ...configFront };
    const configBackToSave = { ...configBack };
    
    // Ensure studentPhotoPosition has default width/height if not set
    if (configFrontToSave.studentPhotoPosition) {
      const photoPos = configFrontToSave.studentPhotoPosition as any;
      if (!photoPos.width || !photoPos.height) {
        configFrontToSave.studentPhotoPosition = {
          ...photoPos,
          width: photoPos.width ?? DEFAULT_STUDENT_PHOTO_WIDTH,
          height: photoPos.height ?? DEFAULT_STUDENT_PHOTO_HEIGHT,
        };
      }
    }
    
    // Ensure qrCodePosition has default width/height if not set
    if (configFrontToSave.qrCodePosition) {
      const qrPos = configFrontToSave.qrCodePosition as any;
      if (!qrPos.width || !qrPos.height) {
        configFrontToSave.qrCodePosition = {
          ...qrPos,
          width: qrPos.width ?? DEFAULT_QR_CODE_SIZE,
          height: qrPos.height ?? DEFAULT_QR_CODE_SIZE,
        };
      }
    }
    
    onSave(configFrontToSave, configBackToSave);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t('idCards.layoutEditor') || 'Layout Editor'}</h3>
          <p className="text-sm text-muted-foreground">
            {t('idCards.layoutEditorDescription') || 'Drag fields to position them on the ID card. Click to select a field.'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            {t('events.cancel')}
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            {t('events.save')}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'front' | 'back')}>
        <TabsList>
          <TabsTrigger value="front">{t('idCards.frontSide') || 'Front Side'}</TabsTrigger>
          <TabsTrigger value="back">{t('idCards.backSide') || 'Back Side'}</TabsTrigger>
        </TabsList>

        <TabsContent value="front" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Preview Canvas */}
            <div className="lg:col-span-2 lg:sticky lg:top-4 self-start">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{t('idCards.frontPreview') || 'Front Preview'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    ref={containerRef}
                    className="relative w-full bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg overflow-visible"
                    style={{
                      aspectRatio: CARD_ASPECT_RATIO,
                      maxHeight: `${DEFAULT_SCREEN_HEIGHT_PX}px`,
                      padding: 0,
                    }}
                    onClick={handleCanvasBackgroundClick}
                  >
                    {currentImageError ? (
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <p>{t('idCards.backgroundNotAvailable') || 'Background image not available'}</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {!currentImageLoaded && currentImageUrl && (
                          <div className="absolute inset-0 flex items-center justify-center z-0">
                            <p className="text-muted-foreground">{t('common.loading')}</p>
                          </div>
                        )}
                        {currentImageUrl && (
                          <img
                            src={currentImageUrl}
                            alt="ID Card Background"
                            className="w-full h-full object-fill"
                            style={{ display: currentImageLoaded ? 'block' : 'none' }}
                          />
                        )}
                      </>
                    )}

                    {renderDebug && (
                      <>
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            border: '1px solid rgba(220, 38, 38, 0.6)',
                            pointerEvents: 'none',
                            zIndex: 2,
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            left: `${renderMetrics.paddingPx}px`,
                            top: `${renderMetrics.paddingPx}px`,
                            width: `${renderMetrics.contentWidth}px`,
                            height: `${renderMetrics.contentHeight}px`,
                            border: '1px dashed rgba(37, 99, 235, 0.7)',
                            pointerEvents: 'none',
                            zIndex: 2,
                          }}
                        />
                        {currentFields
                          .filter((field) => currentConfig.enabledFields?.includes(field.id))
                          .map((field) => {
                            const position = getFieldPosition(field.key);
                            return (
                              <div
                                key={`debug-${field.id}`}
                                style={{
                                  position: 'absolute',
                                  left: `${renderMetrics.pctToX(position.x)}px`,
                                  top: `${renderMetrics.pctToY(position.y)}px`,
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  backgroundColor: 'rgba(37, 99, 235, 0.9)',
                                  transform: 'translate(-50%, -50%)',
                                  pointerEvents: 'none',
                                  zIndex: 3,
                                }}
                              />
                            );
                          })}
                      </>
                    )}

                    {(alignmentGuides.x !== null || alignmentGuides.y !== null) && (
                      <>
                        {alignmentGuides.x !== null && (
                          <div
                            style={{
                              position: 'absolute',
                              left: `${renderMetrics.pctToX(alignmentGuides.x)}px`,
                              top: `${renderMetrics.paddingPx}px`,
                              width: '1px',
                              height: `${renderMetrics.contentHeight}px`,
                              backgroundColor: 'rgba(37, 99, 235, 0.9)',
                              boxShadow: '0 0 0 1px rgba(191, 219, 254, 0.8)',
                              pointerEvents: 'none',
                              zIndex: 20,
                            }}
                          />
                        )}
                        {alignmentGuides.y !== null && (
                          <div
                            style={{
                              position: 'absolute',
                              left: `${renderMetrics.paddingPx}px`,
                              top: `${renderMetrics.pctToY(alignmentGuides.y)}px`,
                              width: `${renderMetrics.contentWidth}px`,
                              height: '1px',
                              backgroundColor: 'rgba(37, 99, 235, 0.9)',
                              boxShadow: '0 0 0 1px rgba(191, 219, 254, 0.8)',
                              pointerEvents: 'none',
                              zIndex: 20,
                            }}
                          />
                        )}
                      </>
                    )}

                    {/* Draggable Fields */}
                    {currentFields.filter(field => currentConfig.enabledFields?.includes(field.id)).map((field) => {
                      const isImageField = field.isImage;
                      const displayText = getFieldPreviewText(field, currentConfig, livePreviewStudent, language);

                      const fieldStyle = getFieldStyle(field);
                      const isStudentName = field.id === 'studentName';
                      
                      return (
                        <div
                          key={field.id}
                          style={fieldStyle}
                          onMouseDown={(e) => handleMouseDown(e, field.id)}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isImageField ? (
                            <div 
                              className="relative rounded p-2" 
                              style={{ 
                                width: '100%',
                                height: '100%',
                                minHeight: '40px', 
                                minWidth: '40px', 
                                pointerEvents: 'auto',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: selectedField === field.id ? '2px dashed #3b82f6' : '2px dashed transparent',
                                backgroundColor: selectedField === field.id ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                              }}
                            >
                              {/* Resize handles - only show when a single field is selected */}
                              {selectedField === field.id && selectedFields.size === 1 && (
                                <>
                                  <div
                                    className="absolute -top-1 -left-1 w-4 h-4 bg-blue-500 rounded-full cursor-nw-resize border-2 border-white shadow-lg hover:bg-blue-600"
                                    onMouseDown={(e) => handleResizeStart(e, field.id, 'nw')}
                                    style={{ zIndex: 30 }}
                                    title="Resize from top-left"
                                  />
                                  <div
                                    className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full cursor-ne-resize border-2 border-white shadow-lg hover:bg-blue-600"
                                    onMouseDown={(e) => handleResizeStart(e, field.id, 'ne')}
                                    style={{ zIndex: 30 }}
                                    title="Resize from top-right"
                                  />
                                  <div
                                    className="absolute -bottom-1 -left-1 w-4 h-4 bg-blue-500 rounded-full cursor-sw-resize border-2 border-white shadow-lg hover:bg-blue-600"
                                    onMouseDown={(e) => handleResizeStart(e, field.id, 'sw')}
                                    style={{ zIndex: 30 }}
                                    title="Resize from bottom-left"
                                  />
                                  <div
                                    className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full cursor-se-resize border-2 border-white shadow-lg hover:bg-blue-600"
                                    onMouseDown={(e) => handleResizeStart(e, field.id, 'se')}
                                    style={{ zIndex: 30 }}
                                    title="Resize from bottom-right"
                                  />
                                  <div
                                    className="absolute -top-1 left-1/2 -translate-x-1/2 h-4 w-3 rounded bg-blue-500 border-2 border-white shadow-lg hover:bg-blue-600 cursor-n-resize"
                                    onMouseDown={(e) => handleResizeStart(e, field.id, 'n')}
                                    style={{ zIndex: 30 }}
                                    title="Resize from top"
                                  />
                                  <div
                                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-4 w-3 rounded bg-blue-500 border-2 border-white shadow-lg hover:bg-blue-600 cursor-s-resize"
                                    onMouseDown={(e) => handleResizeStart(e, field.id, 's')}
                                    style={{ zIndex: 30 }}
                                    title="Resize from bottom"
                                  />
                                  <div
                                    className="absolute -left-1 top-1/2 -translate-y-1/2 h-3 w-4 rounded bg-blue-500 border-2 border-white shadow-lg hover:bg-blue-600 cursor-w-resize"
                                    onMouseDown={(e) => handleResizeStart(e, field.id, 'w')}
                                    style={{ zIndex: 30 }}
                                    title="Resize from left"
                                  />
                                  <div
                                    className="absolute -right-1 top-1/2 -translate-y-1/2 h-3 w-4 rounded bg-blue-500 border-2 border-white shadow-lg hover:bg-blue-600 cursor-e-resize"
                                    onMouseDown={(e) => handleResizeStart(e, field.id, 'e')}
                                    style={{ zIndex: 30 }}
                                    title="Resize from right"
                                  />
                                </>
                              )}

                              <div className="flex items-center justify-center gap-1">
                                <GripVertical className="h-4 w-4 opacity-50" />
                                {field.id === 'studentPhoto' && studentPhotoUrl ? (
                                  <div
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      padding: '4px',
                                      borderRadius: '6px',
                                      backgroundColor: 'rgba(255, 255, 255, 0.92)',
                                      border: '1px solid rgba(148, 163, 184, 0.85)',
                                      boxShadow: '0 2px 6px rgba(15, 23, 42, 0.14)',
                                      overflow: 'hidden',
                                      pointerEvents: 'none',
                                    }}
                                  >
                                    <img
                                      src={studentPhotoUrl}
                                      alt="Student Photo"
                                      style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        objectPosition: 'center top',
                                        borderRadius: '4px',
                                        pointerEvents: 'none',
                                      }}
                                    />
                                  </div>
                                ) : field.id === 'qrCode' && qrCodeUrl ? (
                                  <div
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      padding: '4px',
                                      borderRadius: '6px',
                                      backgroundColor: 'rgba(255, 255, 255, 0.92)',
                                      border: '1px solid rgba(148, 163, 184, 0.85)',
                                      boxShadow: '0 2px 6px rgba(15, 23, 42, 0.14)',
                                      overflow: 'hidden',
                                      pointerEvents: 'none',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <img
                                      src={qrCodeUrl}
                                      alt="QR Code"
                                      style={{
                                        width: '100%',
                                        height: '100%',
                                        maxWidth: '100%',
                                        maxHeight: '100%',
                                        objectFit: 'contain',
                                        pointerEvents: 'none',
                                        aspectRatio: '1 / 1',
                                        borderRadius: '4px',
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <>
                                    <span className="text-2xl" style={{ pointerEvents: 'none' }}>{displayText}</span>
                                    <span className="text-xs" style={{ pointerEvents: 'none' }}>{field.id === 'qrCode' ? 'QR' : 'Photo'}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <GripVertical className="h-3 w-3 opacity-50" />
                              <span style={{ 
                                color: fieldStyle.color,
                                fontFamily: fieldStyle.fontFamily,
                                fontSize: fieldStyle.fontSize,
                                fontWeight: isStudentName ? 'bold' : 'normal',
                                direction: currentConfig.rtl !== false ? 'rtl' : 'ltr',
                                unicodeBidi: 'plaintext',
                              }}>{displayText}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Field List & Settings */}
            <ScrollArea className="h-[72vh] pr-2">
              <div className="space-y-4">
              <Card>
                <Collapsible open={showFieldList} onOpenChange={setShowFieldList}>
                  <CardHeader className="pb-2">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="h-auto justify-between px-0">
                        <CardTitle className="text-sm">{t('idCards.fields') || 'Fields'}</CardTitle>
                        <ChevronDown className={`h-4 w-4 transition-transform ${showFieldList ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="space-y-2">
                      {currentFields.map((field) => (
                        <div key={field.id} className="flex items-center space-x-2">
                          <Checkbox
                            checked={currentConfig.enabledFields?.includes(field.id) || false}
                            onCheckedChange={() => toggleFieldEnabled(field.id)}
                          />
                          <Label className="text-sm cursor-pointer">{field.label}</Label>
                        </div>
                      ))}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t('idCards.alignFields') || 'Align Fields'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {t('idCards.alignFieldsDescription') || 'Align labels to the right and values to the left, or distribute rows evenly.'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={alignLabelsRight}
                      title={t('idCards.alignLabelsRight') || 'Align labels right'}
                    >
                      <AlignEndHorizontal className="h-4 w-4 shrink-0" />
                      <span className="hidden sm:inline ml-1">{t('idCards.alignLabelsRight') || 'Labels right'}</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={alignValuesLeft}
                      title={t('idCards.alignValuesLeft') || 'Align values left'}
                    >
                      <AlignStartHorizontal className="h-4 w-4 shrink-0" />
                      <span className="hidden sm:inline ml-1">{t('idCards.alignValuesLeft') || 'Values left'}</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={distributeRows}
                      title={t('idCards.distributeRows') || 'Distribute rows evenly'}
                    >
                      <Rows3 className="h-4 w-4 shrink-0" />
                      <span className="hidden sm:inline ml-1">{t('idCards.distributeRows') || 'Distribute rows'}</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t('idCards.alignSelected') || 'Align Selected'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {t('idCards.ctrlClickToSelectMultiple') || 'Ctrl+click (Cmd+click on Mac) to select multiple fields, then align them.'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={selectedFields.size < 2}
                      onClick={alignSelectedToStart}
                      title={t('idCards.alignSelectedToStart') || 'Align selected to start (left)'}
                    >
                      <AlignStartHorizontal className="h-4 w-4 shrink-0" />
                      <span className="hidden sm:inline ml-1">{t('idCards.alignSelectedToStart') || 'Align start'}</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={selectedFields.size < 2}
                      onClick={alignSelectedToEnd}
                      title={t('idCards.alignSelectedToEnd') || 'Align selected to end (right)'}
                    >
                      <AlignEndHorizontal className="h-4 w-4 shrink-0" />
                      <span className="hidden sm:inline ml-1">{t('idCards.alignSelectedToEnd') || 'Align end'}</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={selectedFields.size < 2}
                      onClick={alignSelectedToTop}
                      title={t('idCards.alignSelectedToTop') || 'Align selected to top'}
                    >
                      <AlignStartVertical className="h-4 w-4 shrink-0" />
                      <span className="hidden sm:inline ml-1">{t('idCards.alignSelectedToTop') || 'Align top'}</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={selectedFields.size < 2}
                      onClick={alignSelectedToBottom}
                      title={t('idCards.alignSelectedToBottom') || 'Align selected to bottom'}
                    >
                      <AlignEndVertical className="h-4 w-4 shrink-0" />
                      <span className="hidden sm:inline ml-1">{t('idCards.alignSelectedToBottom') || 'Align bottom'}</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={selectedFields.size < 2}
                      onClick={distributeSelectedVertically}
                      title={t('idCards.distributeSelectedVertically') || 'Distribute selected vertically'}
                    >
                      <Rows3 className="h-4 w-4 shrink-0" />
                      <span className="hidden sm:inline ml-1">{t('idCards.distributeSelectedVertically') || 'Distribute Y'}</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <Collapsible open={showGlobalSettings} onOpenChange={setShowGlobalSettings}>
                  <CardHeader className="pb-2">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="h-auto justify-between px-0">
                        <CardTitle className="text-sm">{t('idCards.globalSettings') || 'Global Settings'}</CardTitle>
                        <ChevronDown className={`h-4 w-4 transition-transform ${showGlobalSettings ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm">{t('idCards.fontSize') || 'Font Size'}</Label>
                        <Input
                          type="number"
                          value={currentConfig.fontSize || 12}
                          onChange={(e) => setCurrentConfig({ ...currentConfig, fontSize: parseInt(e.target.value) || 12 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">{t('idCards.fontFamily') || 'Font Family'}</Label>
                        <Select
                          value={currentConfig.fontFamily || 'Arial'}
                          onValueChange={(value) => setCurrentConfig({ ...currentConfig, fontFamily: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('idCards.selectFont') || 'Select font'} />
                          </SelectTrigger>
                          <SelectContent>
                            {AVAILABLE_FONTS.map((font) => (
                              <SelectItem key={font.value} value={font.value}>
                                <span style={{ fontFamily: font.value }}>{font.label}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">{t('idCards.textColor') || 'Text Color'}</Label>
                        <Input
                          type="color"
                          value={currentConfig.textColor || '#000000'}
                          onChange={(e) => setCurrentConfig({ ...currentConfig, textColor: e.target.value })}
                        />
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>

              {/* Field Settings Panel - appears when a field is selected */}
              {selectedField && (
                <Card>
                  <Collapsible open={showFieldSettings} onOpenChange={setShowFieldSettings}>
                    <CardHeader className="pb-2">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="h-auto justify-between px-0 text-left whitespace-normal">
                          <CardTitle className="text-sm">
                            {t('idCards.fieldSettings') || 'Field Settings'} - {currentFields.find(f => f.id === selectedField)?.label || selectedField}
                          </CardTitle>
                          <ChevronDown className={`h-4 w-4 transition-transform ${showFieldSettings ? 'rotate-180' : ''}`} />
                        </Button>
                      </CollapsibleTrigger>
                    </CardHeader>
                    <CollapsibleContent>
                      <CardContent className="space-y-4">
                    {/* Image Field Settings */}
                    {(selectedField === 'studentPhoto' || selectedField === 'qrCode') && (
                      <div className="space-y-3 pt-2 border-t">
                        <div className="space-y-2">
                          <Label className="text-sm">{selectedField === 'qrCode' ? 'QR Code Size (%)' : 'Photo Size (%)'}</Label>
                          <Input
                            type="number"
                            value={getImageFieldSizePercent(selectedField)}
                            onChange={(e) => {
                              const value = Number(e.target.value);
                              if (!Number.isNaN(value)) {
                                setImageFieldSizePercent(selectedField, value);
                              }
                            }}
                            min="1"
                            max="100"
                          />
                          <p className="text-xs text-muted-foreground">
                            {selectedField === 'qrCode'
                              ? 'One size control keeps the QR square in preview and export.'
                              : 'One size control keeps the photo proportional and matches export framing.'}
                          </p>
                        </div>
                        
                        {/* QR Code Value Source Selector */}
                        {selectedField === 'qrCode' && (
                          <div className="space-y-2 pt-2 border-t">
                            <Label className="text-sm">QR Code Value Source</Label>
                            <Select
                              value={currentConfig.qrCodeValueSource || 'student_code'}
                              onValueChange={(value) =>
                                setCurrentConfig({
                                  ...currentConfig,
                                  qrCodeValueSource: value as 'student_id' | 'student_code' | 'admission_number' | 'card_number' | 'roll_number',
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select QR value source" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="student_id">Student ID</SelectItem>
                                <SelectItem value="student_code">Student Code</SelectItem>
                                <SelectItem value="admission_number">Admission Number</SelectItem>
                                <SelectItem value="card_number">Card Number</SelectItem>
                                <SelectItem value="roll_number">Roll Number</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                              Select what data should be encoded into the QR code.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Per-Field Font Settings (for text fields) */}
                    {!currentFields.find(f => f.id === selectedField)?.isImage && (
                      <div className="space-y-3 pt-2 border-t">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-semibold">{t('idCards.fieldSpecificFontSettings') || 'Field-Specific Font Settings'}</Label>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              clearFieldFont(selectedField, 'fontSize');
                              clearFieldFont(selectedField, 'fontFamily');
                              clearFieldFont(selectedField, 'textColor');
                              clearFieldFont(selectedField, 'textAlign');
                            }}
                            className="text-xs"
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            {t('events.reset') || 'Reset'}
                          </Button>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-xs">{t('idCards.fontFamily') || 'Font Family'}</Label>
                          <Select
                            value={currentConfig.fieldFonts?.[selectedField]?.fontFamily || 'global'}
                            onValueChange={(value) => {
                              if (value && value !== 'global') {
                                updateFieldFont(selectedField, 'fontFamily', value);
                              } else {
                                clearFieldFont(selectedField, 'fontFamily');
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder={t('idCards.useGlobalFont') || 'Use global font'} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="global">{t('idCards.useGlobalFont') || 'Use Global Font'}</SelectItem>
                              {AVAILABLE_FONTS.map((font) => (
                                <SelectItem key={font.value} value={font.value}>
                                  <span style={{ fontFamily: font.value }}>{font.label}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            {t('idCards.selectUseGlobalFont') || 'Select "Use Global Font" to use the global font setting'}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">{t('idCards.fontSize') || 'Font Size'} (px)</Label>
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              value={currentConfig.fieldFonts?.[selectedField]?.fontSize || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === '') {
                                  clearFieldFont(selectedField, 'fontSize');
                                } else {
                                  const numValue = parseInt(value);
                                  if (!isNaN(numValue) && numValue > 0) {
                                    updateFieldFont(selectedField, 'fontSize', numValue);
                                  }
                                }
                              }}
                              placeholder={t('idCards.autoBasedOnGlobal') || 'Auto (based on global)'}
                              className="h-8 text-xs"
                              min="8"
                              max="72"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => clearFieldFont(selectedField, 'fontSize')}
                              className="h-8 px-2"
                              title={t('events.resetToDefault') || 'Reset to default'}
                            >
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {t('idCards.leaveEmptyToUseGlobal') || 'Leave empty to use global font size'}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">{t('idCards.textColor') || 'Text Color'}</Label>
                          <div className="flex gap-2 items-center">
                            <Input
                              type="color"
                              value={currentConfig.fieldFonts?.[selectedField]?.textColor || currentConfig.textColor || '#000000'}
                              onChange={(e) => updateFieldFont(selectedField, 'textColor', e.target.value)}
                              className="h-8 w-16 p-1 cursor-pointer"
                            />
                            <Input
                              type="text"
                              value={currentConfig.fieldFonts?.[selectedField]?.textColor || currentConfig.textColor || '#000000'}
                              onChange={(e) => {
                                const value = e.target.value.trim();
                                if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
                                  updateFieldFont(selectedField, 'textColor', value);
                                }
                              }}
                              placeholder="#000000"
                              className="h-8 text-xs flex-1"
                              maxLength={7}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => clearFieldFont(selectedField, 'textColor')}
                              className="h-8 px-2"
                              title={t('events.resetToDefault') || 'Reset to default'}
                            >
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {t('idCards.fieldColorDescription') || 'Set custom color for this field, or reset to use global color'}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">{t('idCards.textAlignment') || 'Text Alignment'}</Label>
                          <div className="flex gap-1">
                            {(['left', 'center', 'right'] as const).map((align) => {
                              const isLabelField = LABEL_FIELD_IDS.includes(selectedField);
                              const isCenterField = ['schoolName', 'notes', 'createdDate', 'expiryDate'].includes(selectedField);
                              const defaultAlign = isLabelField ? 'right' : isCenterField ? 'center' : 'left';
                              const currentAlign = currentConfig.fieldFonts?.[selectedField]?.textAlign ?? defaultAlign;
                              const isActive = currentAlign === align;
                              const Icon = align === 'left' ? AlignLeft : align === 'center' ? AlignCenter : AlignRight;
                              return (
                                <Button
                                  key={align}
                                  size="sm"
                                  variant={isActive ? 'default' : 'outline'}
                                  className="flex-1 h-8 px-2"
                                  title={align.charAt(0).toUpperCase() + align.slice(1)}
                                  onClick={() => {
                                    if (isActive && currentConfig.fieldFonts?.[selectedField]?.textAlign) {
                                      clearFieldFont(selectedField, 'textAlign');
                                    } else {
                                      updateFieldFont(selectedField, 'textAlign', align);
                                    }
                                  }}
                                >
                                  <Icon className="h-3.5 w-3.5" />
                                </Button>
                              );
                            })}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {t('idCards.textAlignmentDescription') || 'Override default text alignment for this field'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Field Value Editor (for editable fields) */}
                    {selectedField && isSelectedFieldEditableText && (
                      <div className="space-y-3 pt-2 border-t">
                        <Label className="text-sm font-semibold">
                          {getEditableFieldLabel(selectedField)}
                        </Label>
                        
                        {selectedField === 'expiryDate' ? (
                          <div className="space-y-2">
                            <CalendarDatePicker
                              date={currentConfig.fieldValues?.[selectedField] ? new Date(currentConfig.fieldValues[selectedField]) : undefined}
                              onDateChange={(date) => {
                                const value = date ? date.toISOString().slice(0, 10) : null;
                                setCurrentConfig({
                                  ...currentConfig,
                                  fieldValues: {
                                    ...(currentConfig.fieldValues || {}),
                                    [selectedField]: value,
                                  },
                                });
                              }}
                              placeholder={t('idCards.selectExpiryDate') || 'Select expiry date...'}
                              className="h-8 text-xs"
                            />
                            <p className="text-xs text-muted-foreground">
                              {t('idCards.expiryDateDescription') || 'Set a fixed expiry date, or leave empty to use dynamic date (1 year from print date)'}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Input
                              type="text"
                              value={currentConfig.fieldValues?.[selectedField] || ''}
                              onChange={(e) => {
                                const value = e.target.value || null;
                                setCurrentConfig({
                                  ...currentConfig,
                                  fieldValues: {
                                    ...(currentConfig.fieldValues || {}),
                                    [selectedField]: value,
                                  },
                                });
                              }}
                              placeholder={getEditableFieldPlaceholder(selectedField)}
                              className="h-8 text-xs"
                            />
                            <p className="text-xs text-muted-foreground">
                              {getEditableFieldDescription(selectedField)}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              )}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>

        <TabsContent value="back" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Preview Canvas */}
            <div className="lg:col-span-2 lg:sticky lg:top-4 self-start">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{t('idCards.backPreview') || 'Back Preview'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    ref={containerRef}
                    className="relative w-full bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg overflow-visible"
                    style={{
                      aspectRatio: CARD_ASPECT_RATIO,
                      maxHeight: `${DEFAULT_SCREEN_HEIGHT_PX}px`,
                      padding: 0,
                    }}
                    onClick={handleCanvasBackgroundClick}
                  >
                    {currentImageError ? (
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <p>{t('idCards.backgroundNotAvailable') || 'Background image not available'}</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {!currentImageLoaded && currentImageUrl && (
                          <div className="absolute inset-0 flex items-center justify-center z-0">
                            <p className="text-muted-foreground">{t('common.loading')}</p>
                          </div>
                        )}
                        {currentImageUrl && (
                          <img
                            src={currentImageUrl}
                            alt="ID Card Background"
                            className="w-full h-full object-fill"
                            style={{ display: currentImageLoaded ? 'block' : 'none' }}
                          />
                        )}
                      </>
                    )}

                    {renderDebug && (
                      <>
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            border: '1px solid rgba(220, 38, 38, 0.6)',
                            pointerEvents: 'none',
                            zIndex: 2,
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            left: `${renderMetrics.paddingPx}px`,
                            top: `${renderMetrics.paddingPx}px`,
                            width: `${renderMetrics.contentWidth}px`,
                            height: `${renderMetrics.contentHeight}px`,
                            border: '1px dashed rgba(37, 99, 235, 0.7)',
                            pointerEvents: 'none',
                            zIndex: 2,
                          }}
                        />
                        {currentFields
                          .filter((field) => currentConfig.enabledFields?.includes(field.id))
                          .map((field) => {
                            const position = getFieldPosition(field.key);
                            return (
                              <div
                                key={`debug-${field.id}`}
                                style={{
                                  position: 'absolute',
                                  left: `${renderMetrics.pctToX(position.x)}px`,
                                  top: `${renderMetrics.pctToY(position.y)}px`,
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  backgroundColor: 'rgba(37, 99, 235, 0.9)',
                                  transform: 'translate(-50%, -50%)',
                                  pointerEvents: 'none',
                                  zIndex: 3,
                                }}
                              />
                            );
                          })}
                      </>
                    )}

                    {(alignmentGuides.x !== null || alignmentGuides.y !== null) && (
                      <>
                        {alignmentGuides.x !== null && (
                          <div
                            style={{
                              position: 'absolute',
                              left: `${renderMetrics.pctToX(alignmentGuides.x)}px`,
                              top: `${renderMetrics.paddingPx}px`,
                              width: '1px',
                              height: `${renderMetrics.contentHeight}px`,
                              backgroundColor: 'rgba(37, 99, 235, 0.9)',
                              boxShadow: '0 0 0 1px rgba(191, 219, 254, 0.8)',
                              pointerEvents: 'none',
                              zIndex: 20,
                            }}
                          />
                        )}
                        {alignmentGuides.y !== null && (
                          <div
                            style={{
                              position: 'absolute',
                              left: `${renderMetrics.paddingPx}px`,
                              top: `${renderMetrics.pctToY(alignmentGuides.y)}px`,
                              width: `${renderMetrics.contentWidth}px`,
                              height: '1px',
                              backgroundColor: 'rgba(37, 99, 235, 0.9)',
                              boxShadow: '0 0 0 1px rgba(191, 219, 254, 0.8)',
                              pointerEvents: 'none',
                              zIndex: 20,
                            }}
                          />
                        )}
                      </>
                    )}

                    {/* Draggable Fields */}
                    {currentFields.filter(field => currentConfig.enabledFields?.includes(field.id)).map((field) => {
                      const displayText = getFieldPreviewText(field, currentConfig, livePreviewStudent, language);
                      
                      return (
                        <div
                          key={field.id}
                          style={getFieldStyle(field)}
                          onMouseDown={(e) => handleMouseDown(e, field.id)}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-1">
                            <GripVertical className="h-3 w-3 opacity-50" />
                            <span>{displayText}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Field List & Settings */}
            <ScrollArea className="h-[72vh] pr-2">
              <div className="space-y-4">
              <Card>
                <Collapsible open={showFieldList} onOpenChange={setShowFieldList}>
                  <CardHeader className="pb-2">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="h-auto justify-between px-0">
                        <CardTitle className="text-sm">{t('idCards.fields') || 'Fields'}</CardTitle>
                        <ChevronDown className={`h-4 w-4 transition-transform ${showFieldList ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="space-y-2">
                      {currentFields.map((field) => (
                        <div key={field.id} className="flex items-center space-x-2">
                          <Checkbox
                            checked={currentConfig.enabledFields?.includes(field.id) || false}
                            onCheckedChange={() => toggleFieldEnabled(field.id)}
                          />
                          <Label className="text-sm cursor-pointer">{field.label}</Label>
                        </div>
                      ))}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t('idCards.alignFields') || 'Align Fields'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {t('idCards.alignFieldsDescription') || 'Align labels to the right and values to the left, or distribute rows evenly.'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={alignLabelsRight}
                      title={t('idCards.alignLabelsRight') || 'Align labels right'}
                    >
                      <AlignEndHorizontal className="h-4 w-4 shrink-0" />
                      <span className="hidden sm:inline ml-1">{t('idCards.alignLabelsRight') || 'Labels right'}</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={alignValuesLeft}
                      title={t('idCards.alignValuesLeft') || 'Align values left'}
                    >
                      <AlignStartHorizontal className="h-4 w-4 shrink-0" />
                      <span className="hidden sm:inline ml-1">{t('idCards.alignValuesLeft') || 'Values left'}</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={distributeRows}
                      title={t('idCards.distributeRows') || 'Distribute rows evenly'}
                    >
                      <Rows3 className="h-4 w-4 shrink-0" />
                      <span className="hidden sm:inline ml-1">{t('idCards.distributeRows') || 'Distribute rows'}</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t('idCards.alignSelected') || 'Align Selected'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {t('idCards.ctrlClickToSelectMultiple') || 'Ctrl+click (Cmd+click on Mac) to select multiple fields, then align them.'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={selectedFields.size < 2}
                      onClick={alignSelectedToStart}
                      title={t('idCards.alignSelectedToStart') || 'Align selected to start (left)'}
                    >
                      <AlignStartHorizontal className="h-4 w-4 shrink-0" />
                      <span className="hidden sm:inline ml-1">{t('idCards.alignSelectedToStart') || 'Align start'}</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={selectedFields.size < 2}
                      onClick={alignSelectedToEnd}
                      title={t('idCards.alignSelectedToEnd') || 'Align selected to end (right)'}
                    >
                      <AlignEndHorizontal className="h-4 w-4 shrink-0" />
                      <span className="hidden sm:inline ml-1">{t('idCards.alignSelectedToEnd') || 'Align end'}</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={selectedFields.size < 2}
                      onClick={alignSelectedToTop}
                      title={t('idCards.alignSelectedToTop') || 'Align selected to top'}
                    >
                      <AlignStartVertical className="h-4 w-4 shrink-0" />
                      <span className="hidden sm:inline ml-1">{t('idCards.alignSelectedToTop') || 'Align top'}</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={selectedFields.size < 2}
                      onClick={alignSelectedToBottom}
                      title={t('idCards.alignSelectedToBottom') || 'Align selected to bottom'}
                    >
                      <AlignEndVertical className="h-4 w-4 shrink-0" />
                      <span className="hidden sm:inline ml-1">{t('idCards.alignSelectedToBottom') || 'Align bottom'}</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={selectedFields.size < 2}
                      onClick={distributeSelectedVertically}
                      title={t('idCards.distributeSelectedVertically') || 'Distribute selected vertically'}
                    >
                      <Rows3 className="h-4 w-4 shrink-0" />
                      <span className="hidden sm:inline ml-1">{t('idCards.distributeSelectedVertically') || 'Distribute Y'}</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <Collapsible open={showGlobalSettings} onOpenChange={setShowGlobalSettings}>
                  <CardHeader className="pb-2">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="h-auto justify-between px-0">
                        <CardTitle className="text-sm">{t('idCards.globalSettings') || 'Global Settings'}</CardTitle>
                        <ChevronDown className={`h-4 w-4 transition-transform ${showGlobalSettings ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm">{t('idCards.fontSize') || 'Font Size'}</Label>
                        <Input
                          type="number"
                          value={currentConfig.fontSize || 10}
                          onChange={(e) => setCurrentConfig({ ...currentConfig, fontSize: parseInt(e.target.value) || 10 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">{t('idCards.fontFamily') || 'Font Family'}</Label>
                        <Select
                          value={currentConfig.fontFamily || 'Arial'}
                          onValueChange={(value) => setCurrentConfig({ ...currentConfig, fontFamily: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('idCards.selectFont') || 'Select font'} />
                          </SelectTrigger>
                          <SelectContent>
                            {AVAILABLE_FONTS.map((font) => (
                              <SelectItem key={font.value} value={font.value}>
                                <span style={{ fontFamily: font.value }}>{font.label}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">{t('idCards.textColor') || 'Text Color'}</Label>
                        <Input
                          type="color"
                          value={currentConfig.textColor || '#000000'}
                          onChange={(e) => setCurrentConfig({ ...currentConfig, textColor: e.target.value })}
                        />
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>

              {/* Field-Specific Settings */}
              {selectedField && (
                <Card>
                  <Collapsible open={showFieldSettings} onOpenChange={setShowFieldSettings}>
                    <CardHeader className="pb-2">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="h-auto justify-between px-0">
                          <CardTitle className="text-sm">{t('idCards.fieldSettings') || 'Field Settings'}</CardTitle>
                          <ChevronDown className={`h-4 w-4 transition-transform ${showFieldSettings ? 'rotate-180' : ''}`} />
                        </Button>
                      </CollapsibleTrigger>
                    </CardHeader>
                    <CollapsibleContent>
                      <CardContent className="space-y-4">
                    {/* Per-Field Font Settings */}
                    <div className="space-y-3 pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <Label className="font-semibold text-sm">{t('idCards.fieldFontSettings') || 'Field-Specific Font Settings'}</Label>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            clearFieldFont(selectedField, 'fontSize');
                            clearFieldFont(selectedField, 'fontFamily');
                            clearFieldFont(selectedField, 'textColor');
                          }}
                          className="text-xs"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          {t('events.reset') || 'Reset'}
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-xs">{t('idCards.fontFamily') || 'Font Family'}</Label>
                        <Select
                          value={currentConfig.fieldFonts?.[selectedField]?.fontFamily || 'global'}
                          onValueChange={(value) => {
                            if (value && value !== 'global') {
                              updateFieldFont(selectedField, 'fontFamily', value);
                            } else {
                              clearFieldFont(selectedField, 'fontFamily');
                            }
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder={t('idCards.useGlobalFont') || 'Use global font'} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="global">{t('idCards.useGlobalFont') || 'Use Global Font'}</SelectItem>
                            {AVAILABLE_FONTS.map((font) => (
                              <SelectItem key={font.value} value={font.value}>
                                {font.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">{t('idCards.fontSize') || 'Font Size (px)'}</Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            value={currentConfig.fieldFonts?.[selectedField]?.fontSize || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '') {
                                clearFieldFont(selectedField, 'fontSize');
                              } else {
                                const numValue = parseInt(value);
                                if (!isNaN(numValue) && numValue > 0) {
                                  updateFieldFont(selectedField, 'fontSize', numValue);
                                }
                              }
                            }}
                            placeholder={t('idCards.auto') || 'Auto (based on base size)'}
                            className="h-8 text-xs"
                            min="8"
                            max="72"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => clearFieldFont(selectedField, 'fontSize')}
                            className="h-8 px-2"
                            title={t('events.reset') || 'Reset to default'}
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Per-Field Text Color */}
                      <div className="space-y-2">
                        <Label className="text-xs">{t('idCards.textColor') || 'Text Color'}</Label>
                        <div className="flex gap-2 items-center">
                          <Input
                            type="color"
                            value={currentConfig.fieldFonts?.[selectedField]?.textColor || currentConfig.textColor || '#000000'}
                            onChange={(e) => {
                              const value = e.target.value;
                              updateFieldFont(selectedField, 'textColor', value);
                            }}
                            className="h-8 w-16 p-1 cursor-pointer"
                          />
                          <Input
                            type="text"
                            value={currentConfig.fieldFonts?.[selectedField]?.textColor || currentConfig.textColor || '#000000'}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value.match(/^#[0-9A-Fa-f]{6}$/)) {
                                updateFieldFont(selectedField, 'textColor', value);
                              }
                            }}
                            placeholder="#000000"
                            className="h-8 text-xs flex-1"
                            maxLength={7}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => clearFieldFont(selectedField, 'textColor')}
                            className="h-8 px-2"
                            title={t('events.resetToDefault') || 'Reset to default'}
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t('idCards.fieldColorDescription') || 'Set custom color for this field, or reset to use global color'}
                        </p>
                      </div>
                    </div>

                    {/* Image Sizing Controls */}
                    {(selectedField === 'studentPhoto' || selectedField === 'qrCode') && (
                      <div className="space-y-3 pt-2 border-t">
                        <div className="space-y-2">
                          <Label className="text-sm">{selectedField === 'qrCode' ? t('idCards.qrCodeSize') || 'QR Code Size (%)' : t('idCards.photoSize') || 'Photo Size (%)'}</Label>
                          <Input
                            type="number"
                            value={getImageFieldSizePercent(selectedField)}
                            onChange={(e) => {
                              const value = Number(e.target.value);
                              if (!Number.isNaN(value)) {
                                setImageFieldSizePercent(selectedField, value);
                              }
                            }}
                            min="1"
                            max="100"
                            className="h-8 text-xs"
                          />
                          <p className="text-xs text-muted-foreground">
                            {selectedField === 'qrCode'
                              ? t('idCards.sizeDescription') || 'One size control keeps the QR square.'
                              : t('idCards.sizeDescription') || 'One size control keeps the photo proportional.'}
                          </p>
                        </div>
                        
                        {/* QR Code Value Source Selector */}
                        {selectedField === 'qrCode' && (
                          <div className="space-y-2 pt-2 border-t">
                            <Label className="text-sm">{t('idCards.qrCodeValueSource') || 'QR Code Value Source'}</Label>
                            <Select
                              value={currentConfig.qrCodeValueSource || 'student_code'}
                              onValueChange={(value) =>
                                setCurrentConfig({
                                  ...currentConfig,
                                  qrCodeValueSource: value as 'student_id' | 'student_code' | 'admission_number' | 'card_number' | 'roll_number',
                                })
                              }
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder={t('idCards.selectQrValueSource') || 'Select QR value source'} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="student_id">{t('idCards.studentId') || 'Student ID'}</SelectItem>
                                <SelectItem value="student_code">{t('idCards.studentCode') || 'Student Code'}</SelectItem>
                                <SelectItem value="admission_number">{t('idCards.admissionNumber') || 'Admission Number'}</SelectItem>
                                <SelectItem value="card_number">{t('attendanceReports.cardNumber') || 'Card Number'}</SelectItem>
                                <SelectItem value="roll_number">{t('students.rollNumber') || 'Roll Number'}</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                              {t('idCards.qrCodeValueSourceDescription') || 'Select what data should be encoded into the QR code.'}
                            </p>
                          </div>
                        )}

                      </div>
                    )}

                    {/* Field Value Editor (for editable fields) */}
                    {selectedField && isSelectedFieldEditableText && (
                      <div className="space-y-3 pt-2 border-t">
                        <Label className="text-sm font-semibold">
                          {getEditableFieldLabel(selectedField)}
                        </Label>

                        {selectedField === 'expiryDate' ? (
                          <div className="space-y-2">
                            <CalendarDatePicker
                              date={currentConfig.fieldValues?.[selectedField] ? new Date(currentConfig.fieldValues[selectedField]) : undefined}
                              onDateChange={(date) => {
                                const value = date ? date.toISOString().slice(0, 10) : null;
                                setCurrentConfig({
                                  ...currentConfig,
                                  fieldValues: {
                                    ...(currentConfig.fieldValues || {}),
                                    [selectedField]: value,
                                  },
                                });
                              }}
                              placeholder={t('idCards.selectExpiryDate') || 'Select expiry date...'}
                              className="h-8 text-xs"
                            />
                            <p className="text-xs text-muted-foreground">
                              {t('idCards.expiryDateDescription') || 'Set a fixed expiry date, or leave empty to use dynamic date (1 year from print date)'}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Input
                              type="text"
                              value={currentConfig.fieldValues?.[selectedField] || ''}
                              onChange={(e) => {
                                const value = e.target.value || null;
                                setCurrentConfig({
                                  ...currentConfig,
                                  fieldValues: {
                                    ...(currentConfig.fieldValues || {}),
                                    [selectedField]: value,
                                  },
                                });
                              }}
                              placeholder={getEditableFieldPlaceholder(selectedField)}
                              className="h-8 text-xs"
                            />
                            <p className="text-xs text-muted-foreground">
                              {getEditableFieldDescription(selectedField)}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              )}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
