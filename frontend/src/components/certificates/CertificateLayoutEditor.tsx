import { GripVertical, Save, RotateCcw, Eye } from 'lucide-react';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CertificateLayoutConfig } from '@/hooks/useCertificateTemplates';
import { useCourseStudents } from '@/hooks/useCourseStudents';
import { useLanguage } from '@/hooks/useLanguage';
import { useShortTermCourses } from '@/hooks/useShortTermCourses';
import { certificateTemplatesApi } from '@/lib/api/client';
import type { CourseStudent } from '@/types/domain/courseStudent';

interface FieldConfig {
  id: string;
  label: string;
  key: keyof CertificateLayoutConfig;
  sampleText: string;
  defaultFontSize?: number;
  isImage?: boolean; // For photo/avatar fields
  defaultWidth?: number; // For image fields
  defaultHeight?: number; // For image fields
}

// FIELDS will be created dynamically based on student data and course name
const getFields = (studentName: string, fatherName: string, courseName: string): FieldConfig[] => [
  { id: 'header', label: 'Header', key: 'headerPosition', sampleText: 'Certificate of Completion', defaultFontSize: 36 },
  { id: 'studentName', label: 'Student Name', key: 'studentNamePosition', sampleText: studentName, defaultFontSize: 28 },
  { id: 'fatherName', label: 'Father Name', key: 'fatherNamePosition', sampleText: fatherName, defaultFontSize: 16 },
  { id: 'grandfatherName', label: 'Grandfather Name', key: 'grandfatherNamePosition', sampleText: 'Son of Grandfather', defaultFontSize: 14 },
  { id: 'motherName', label: 'Mother Name', key: 'motherNamePosition', sampleText: 'Son of Mary', defaultFontSize: 14 },
  { id: 'courseName', label: 'Course Name', key: 'courseNamePosition', sampleText: courseName, defaultFontSize: 24 },
  { id: 'certificateNumber', label: 'Certificate Number', key: 'certificateNumberPosition', sampleText: 'CERT-2024-0001', defaultFontSize: 12 },
  { id: 'date', label: 'Date', key: 'datePosition', sampleText: 'Jan 15, 2024', defaultFontSize: 12 },
  { id: 'province', label: 'Province', key: 'provincePosition', sampleText: 'Kabul', defaultFontSize: 12 },
  { id: 'district', label: 'District', key: 'districtPosition', sampleText: 'District 1', defaultFontSize: 12 },
  { id: 'village', label: 'Village', key: 'villagePosition', sampleText: 'Village Name', defaultFontSize: 12 },
  { id: 'nationality', label: 'Nationality', key: 'nationalityPosition', sampleText: 'Afghan', defaultFontSize: 12 },
  { id: 'guardianName', label: 'Guardian Name', key: 'guardianNamePosition', sampleText: 'Guardian Name', defaultFontSize: 14 },
  { id: 'studentPhoto', label: 'Student Photo', key: 'studentPhotoPosition', sampleText: '📷', isImage: true, defaultWidth: 100, defaultHeight: 100, defaultFontSize: 12 },
  { id: 'qrCode', label: 'QR Code', key: 'qrCodePosition', sampleText: '🔳', isImage: true, defaultWidth: 120, defaultHeight: 120, defaultFontSize: 12 },
  { id: 'directorSignature', label: 'Director Signature', key: 'directorSignaturePosition', sampleText: 'Director Signature', defaultFontSize: 10 },
  { id: 'officialSeal', label: 'Official Seal', key: 'officialSealPosition', sampleText: 'Official Seal', defaultFontSize: 10 },
];

interface CertificateLayoutEditorProps {
  templateId: string;
  backgroundImageUrl: string | null;
  layoutConfig: CertificateLayoutConfig;
  courseId?: string | null;
  onSave: (config: CertificateLayoutConfig) => void;
  onCancel: () => void;
}

export function CertificateLayoutEditor({
  templateId,
  backgroundImageUrl,
  layoutConfig,
  courseId,
  onSave,
  onCancel,
}: CertificateLayoutEditorProps) {
  // Initialize config from layoutConfig prop and preserve it when prop changes
  const [config, setConfig] = useState<CertificateLayoutConfig>(() => ({
    ...layoutConfig,
    enabledFields: layoutConfig.enabledFields || ['header', 'studentName', 'fatherName', 'courseName', 'certificateNumber', 'date', 'directorSignature', 'officialSeal'],
    fieldFonts: layoutConfig.fieldFonts || {},
  }));

  // Update config when layoutConfig prop changes (preserves saved layout)
  useEffect(() => {
    const updatedConfig = {
      ...layoutConfig,
      enabledFields: layoutConfig.enabledFields || ['header', 'studentName', 'fatherName', 'courseName', 'certificateNumber', 'date', 'directorSignature', 'officialSeal'],
      fieldFonts: layoutConfig.fieldFonts || {},
    };

    // Ensure default width/height for image fields if missing
    if (updatedConfig.studentPhotoPosition) {
      const photoPos = updatedConfig.studentPhotoPosition as any;
      if (!photoPos.width || !photoPos.height) {
        updatedConfig.studentPhotoPosition = {
          ...photoPos,
          width: photoPos.width ?? 6, // Passport size width
          height: photoPos.height ?? 10, // Passport size height
        };
      }
    }

    if (updatedConfig.qrCodePosition) {
      const qrPos = updatedConfig.qrCodePosition as any;
      if (!qrPos.width || !qrPos.height) {
        updatedConfig.qrCodePosition = {
          ...qrPos,
          width: qrPos.width ?? 12,
          height: qrPos.height ?? 12,
        };
      }
    }

    setConfig(updatedConfig);
  }, [layoutConfig]);
  const [draggingField, setDraggingField] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [backgroundImageLoaded, setBackgroundImageLoaded] = useState(false);
  const [backgroundImageError, setBackgroundImageError] = useState(false);
  const [imageScale, setImageScale] = useState(1);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [studentPhotoUrl, setStudentPhotoUrl] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  
  // Fetch course name if courseId is provided
  const { data: courses = [] } = useShortTermCourses();
  const course = courseId ? courses.find((c) => c.id === courseId) : null;
  const courseName = course?.name || 'Course Name'; // Use actual course name or generic placeholder
  
  // Fetch students for the course to get real names
  const { data: courseStudents = [] } = useCourseStudents(courseId || undefined, false) as { data: CourseStudent[] | undefined };
  const { language } = useLanguage();

  // Get preview student (first student, or null if no students)
  const previewStudent: CourseStudent | null = useMemo(() => {
    if (courseStudents.length === 0) return null;
    return courseStudents[0] || null;
  }, [courseStudents]);
  
  // Load Bahij Nassim fonts for editor preview (same as PDF/image generator)
  useEffect(() => {
    const loadFonts = async () => {
      try {
        // Load Bahij Nassim Bold font (same as used in PDF/image generator)
        const boldWoffModule = await import('@/fonts/Bahij Nassim-Bold.woff?url');
        const boldWoffUrl = boldWoffModule.default;
        const fontFace = new FontFace('Bahij Nassim', `url(${boldWoffUrl})`);
        await fontFace.load();
        document.fonts.add(fontFace);
        setFontsLoaded(true);
        if (import.meta.env.DEV) {
          console.log('[CertificateLayoutEditor] Bahij Nassim Bold loaded');
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('[CertificateLayoutEditor] Failed to load Bahij Nassim, using fallback');
        }
        setFontsLoaded(false);
      }
    };
    
    loadFonts();
  }, []);

  // Load student photo for preview
  useEffect(() => {
    const loadStudentPhoto = async () => {
      if (!previewStudent?.picturePath || !previewStudent?.id) {
        setStudentPhotoUrl(null);
        return;
      }

      try {
        const { apiClient } = await import('@/lib/api/client');
        const token = apiClient.getToken();
        const url = `/api/course-students/${previewStudent.id}/picture?t=${Date.now()}`;

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
          const blobUrl = URL.createObjectURL(blob);
          setStudentPhotoUrl(blobUrl);
        } else {
          setStudentPhotoUrl(null);
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('[CertificateLayoutEditor] Failed to load student photo:', error);
        }
        setStudentPhotoUrl(null);
      }
    };

    loadStudentPhoto();
  }, [previewStudent?.id ?? null, previewStudent?.picturePath ?? null]);

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
      if (!previewStudent) {
        setQrCodeUrl(null);
        return;
      }

      try {
        // Determine QR code value based on config
        const layout = config;
        const source = layout.qrCodeValueSource || 'certificate_number';

        const qrValue = source === 'admission_no'
          ? (previewStudent.admissionNo || '')
          : source === 'student_id'
            ? previewStudent.id
            : source === 'course_student_id'
              ? previewStudent.id
              : previewStudent.id; // For certificate_number, use student ID as fallback (certificate number is assigned when certificate is issued)

        if (!qrValue) {
          setQrCodeUrl(null);
          return;
        }

        // Generate QR code using external service (same as in CertificatePdfGenerator)
        const size = 200;
        const response = await fetch(
          `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(qrValue)}`,
          { mode: 'cors' }
        );

        if (response.ok) {
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          setQrCodeUrl(blobUrl);
        } else {
          setQrCodeUrl(null);
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('[CertificateLayoutEditor] Failed to generate QR code:', error);
        }
        setQrCodeUrl(null);
      }
    };

    if (config.enabledFields?.includes('qrCode')) {
      generateQRCode();
    } else {
      setQrCodeUrl(null);
    }
  }, [previewStudent?.id ?? null, config.enabledFields, config.qrCodeValueSource]);

  // Cleanup QR code blob URL
  useEffect(() => {
    return () => {
      if (qrCodeUrl && qrCodeUrl.startsWith('blob:')) {
        URL.revokeObjectURL(qrCodeUrl);
      }
    };
  }, [qrCodeUrl]);
  
  // Get first student's name and father name, or use language-aware sample names
  const { studentName, fatherName } = useMemo(() => {
    if (courseStudents.length > 0 && courseStudents[0]) {
      const firstStudent = courseStudents[0];
      return {
        studentName: firstStudent.fullName || '',
        fatherName: firstStudent.fatherName || '',
      };
    }
    
    // Language-aware sample names
    if (language === 'ps' || language === 'fa' || language === 'ar') {
      // Pashto/Arabic/Farsi names
      return {
        studentName: 'احمد محمد',
        fatherName: 'بن محمد',
      };
    } else {
      // English names
      return {
        studentName: 'John Doe',
        fatherName: 'Son of John Smith',
      };
    }
  }, [courseStudents, language]);

  // Get fields with dynamic student names and course name
  const FIELDS = useMemo(() => getFields(studentName, fatherName, courseName), [studentName, fatherName, courseName]);

  // Load background image
  useEffect(() => {
    if (!backgroundImageUrl) {
      setBackgroundImageError(true);
      return;
    }

    const loadImage = async () => {
      try {
        // Extract endpoint from URL
        let endpoint = backgroundImageUrl;
        if (backgroundImageUrl.startsWith('http://') || backgroundImageUrl.startsWith('https://')) {
          const urlObj = new URL(backgroundImageUrl);
          endpoint = urlObj.pathname;
        }
        if (endpoint.startsWith('/api')) {
          endpoint = endpoint.replace('/api', '');
        }

        const { blob } = await certificateTemplatesApi.getBackgroundImage(endpoint);
        const url = URL.createObjectURL(blob);
        setImageUrl(url);
        
        // Create a temporary image to get dimensions
        const img = new Image();
        img.onload = () => {
          setBackgroundImageLoaded(true);
          // Calculate scale to fit container (max width 800px)
          // This scale is used to match the preview container size
          const maxWidth = 800;
          const scale = img.width > maxWidth ? maxWidth / img.width : 1;
          setImageScale(scale);
          
          // Also calculate scale factor for font sizes
          // PDF uses 842pt width, Image uses 1123px width (at 96 DPI)
          // Editor container scales to fit, so we need to match the relative font sizes
          // The font sizes in PDF/image are absolute (in points/pixels), but in editor they're scaled
          // We'll use the imageScale to adjust font sizes to match the visual appearance
        };
        img.onerror = () => {
          setBackgroundImageError(true);
        };
        img.src = url;
      } catch (error) {
        console.error('Failed to load background image:', error);
        setBackgroundImageError(true);
      }
    };

    loadImage();

    // Cleanup: revoke object URL on unmount
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [backgroundImageUrl]);


  const getFieldPosition = (fieldKey: keyof CertificateLayoutConfig) => {
    const position = config[fieldKey] as { x: number; y: number; width?: number; height?: number } | undefined;
    if (position) {
      // Ensure width/height are set for image fields
      if (fieldKey === 'studentPhotoPosition' && (!position.width || !position.height)) {
        return { ...position, width: position.width ?? 6, height: position.height ?? 10 }; // Passport size: 6% width x 10% height
      }
      if (fieldKey === 'qrCodePosition' && (!position.width || !position.height)) {
        return { ...position, width: position.width ?? 12, height: position.height ?? 12 };
      }
      return position;
    }
    
    // Default positions for each field (as percentages)
    const defaultPositions: Record<string, { x: number; y: number; width?: number; height?: number }> = {
      headerPosition: { x: 50, y: 15 }, // Top center
      studentNamePosition: { x: 50, y: 35 }, // Upper center
      fatherNamePosition: { x: 50, y: 42 }, // Below student name
      grandfatherNamePosition: { x: 50, y: 48 }, // Below father name
      motherNamePosition: { x: 50, y: 54 }, // Below grandfather name
      courseNamePosition: { x: 50, y: 65 }, // Middle center
      certificateNumberPosition: { x: 10, y: 90 }, // Bottom left
      datePosition: { x: 90, y: 90 }, // Bottom right
      provincePosition: { x: 30, y: 75 }, // Lower left
      districtPosition: { x: 50, y: 75 }, // Lower center
      villagePosition: { x: 70, y: 75 }, // Lower right
      nationalityPosition: { x: 50, y: 80 }, // Bottom center
      guardianNamePosition: { x: 50, y: 70 }, // Lower middle
      studentPhotoPosition: { x: 15, y: 40, width: 6, height: 10 }, // Left side, middle - default 6% width x 10% height (passport size portrait)
      qrCodePosition: { x: 85, y: 40, width: 12, height: 12 }, // Right side, middle - default 12% x 12%
      directorSignaturePosition: { x: 20, y: 85 }, // Bottom left area
      officialSealPosition: { x: 80, y: 85 }, // Bottom right area
    };
    
    return defaultPositions[fieldKey] || { x: 50, y: 50 };
  };

  const updateFieldPosition = (fieldKey: keyof CertificateLayoutConfig, x: number, y: number) => {
    setConfig((prev) => {
      const currentPosition = (prev[fieldKey] as any) || {};
      // Preserve width and height when updating position
      return {
        ...prev,
        [fieldKey]: { 
          ...currentPosition,
          x, 
          y,
          // Set default width/height if not already set
          width: currentPosition.width ?? (fieldKey === 'qrCodePosition' ? 12 : fieldKey === 'studentPhotoPosition' ? 6 : undefined),
          height: currentPosition.height ?? (fieldKey === 'qrCodePosition' ? 12 : fieldKey === 'studentPhotoPosition' ? 10 : undefined),
        },
      };
    });
  };

  const handleMouseDown = useCallback((e: React.MouseEvent, fieldId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingField(fieldId);
    setSelectedField(fieldId);

    const field = FIELDS.find((f) => f.id === fieldId);
    if (!field || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const position = getFieldPosition(field.key);
    // Account for 20px padding
    const padding = 20;
    const fieldX = (position.x / 100) * (rect.width - 2 * padding) + padding;
    const fieldY = (position.y / 100) * (rect.height - 2 * padding) + padding;

    setDragOffset({
      x: e.clientX - rect.left - fieldX,
      y: e.clientY - rect.top - fieldY,
    });
  }, [config]);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!containerRef.current) return;

      if (isResizing && selectedField) {
        if (import.meta.env.DEV) {
          console.log('[CertificateLayoutEditor] Resizing:', selectedField);
        }

        const rect = containerRef.current.getBoundingClientRect();
        // Account for 20px padding
        const padding = 20;
        const currentX = ((e.clientX - rect.left - padding) / (rect.width - 2 * padding)) * 100;
        const currentY = ((e.clientY - rect.top - padding) / (rect.height - 2 * padding)) * 100;

        const deltaX = currentX - resizeStart.x;
        const deltaY = currentY - resizeStart.y;

        const newWidth = Math.max(1, resizeStart.width + deltaX);
        const newHeight = Math.max(1, resizeStart.height + deltaY);

        if (import.meta.env.DEV) {
          console.log('[CertificateLayoutEditor] Resize values:', {
            currentX, currentY, deltaX, deltaY, newWidth, newHeight
          });
        }

        // Update width and height in config
        if (selectedField === 'studentPhoto') {
          setConfig(prev => ({
            ...prev,
            studentPhotoPosition: {
              ...(prev.studentPhotoPosition as any),
              width: newWidth,
              height: newHeight,
            },
          }));
        } else if (selectedField === 'qrCode') {
          setConfig(prev => ({
            ...prev,
            qrCodePosition: {
              ...(prev.qrCodePosition as any),
              width: newWidth,
              height: newHeight,
            },
          }));
        }
      } else if (draggingField) {
        const field = FIELDS.find((f) => f.id === draggingField);
        if (!field) return;

        const rect = containerRef.current.getBoundingClientRect();
        // Account for 20px padding
        const padding = 20;
        const x = ((e.clientX - rect.left - dragOffset.x - padding) / (rect.width - 2 * padding)) * 100;
        const y = ((e.clientY - rect.top - dragOffset.y - padding) / (rect.height - 2 * padding)) * 100;

        // Clamp to container bounds
        const clampedX = Math.max(0, Math.min(100, x));
        const clampedY = Math.max(0, Math.min(100, y));

        updateFieldPosition(field.key, clampedX, clampedY);
      }
    },
    [draggingField, dragOffset, isResizing, selectedField, resizeStart, FIELDS, updateFieldPosition]
  );

  const handleResizeStart = useCallback((e: React.MouseEvent, fieldId: string, direction?: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (import.meta.env.DEV) {
      console.log('[CertificateLayoutEditor] Resize start:', { fieldId, direction, clientX: e.clientX, clientY: e.clientY });
    }

    setSelectedField(fieldId);
    setIsResizing(true);

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      if (import.meta.env.DEV) {
        console.warn('[CertificateLayoutEditor] No container rect found');
      }
      return;
    }

    // Account for 20px padding
    const padding = 20;
    const startX = ((e.clientX - rect.left - padding) / (rect.width - 2 * padding)) * 100;
    const startY = ((e.clientY - rect.top - padding) / (rect.height - 2 * padding)) * 100;

    // Get current width/height
    let currentWidth = 6; // default (passport size width)
    let currentHeight = 10; // default (passport size height)

    if (fieldId === 'studentPhoto') {
      const pos = config.studentPhotoPosition as any;
      currentWidth = pos?.width ?? 6;
      currentHeight = pos?.height ?? 10;
    } else if (fieldId === 'qrCode') {
      const pos = config.qrCodePosition as any;
      currentWidth = pos?.width ?? 12;
      currentHeight = pos?.height ?? 12;
    }

    if (import.meta.env.DEV) {
      console.log('[CertificateLayoutEditor] Initial resize values:', {
        startX, startY, currentWidth, currentHeight
      });
    }

    setResizeStart({
      x: startX,
      y: startY,
      width: currentWidth,
      height: currentHeight,
    });
  }, [config]);

  const handleMouseUp = useCallback(() => {
    setDraggingField(null);
    setIsResizing(false);
  }, []);

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
    if (backgroundImageLoaded) {
      // Small delay to ensure layout has settled
      setTimeout(updateDimensions, 100);
    }
    
    return () => window.removeEventListener('resize', updateDimensions);
  }, [backgroundImageLoaded]);

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

  const resetFieldPosition = (fieldKey: keyof CertificateLayoutConfig) => {
    setConfig((prev) => {
      const newConfig = { ...prev };
      delete newConfig[fieldKey];
      return newConfig;
    });
  };

  const handleSave = () => {
    // Ensure default widths/heights are set for image fields before saving
    const configToSave = { ...config };
    
    // Ensure studentPhotoPosition has default width/height if not set
    if (configToSave.studentPhotoPosition) {
      const photoPos = configToSave.studentPhotoPosition as any;
      if (!photoPos.width || !photoPos.height) {
        configToSave.studentPhotoPosition = {
          ...photoPos,
          width: photoPos.width ?? 6, // Passport size width (6%)
          height: photoPos.height ?? 10, // Passport size height (10%)
        };
      }
    }
    
    // Ensure qrCodePosition has default width/height if not set
    if (configToSave.qrCodePosition) {
      const qrPos = configToSave.qrCodePosition as any;
      if (!qrPos.width || !qrPos.height) {
        configToSave.qrCodePosition = {
          ...qrPos,
          width: qrPos.width ?? 12,
          height: qrPos.height ?? 12,
        };
      }
    }
    
    onSave(configToSave);
  };

  const getFieldStyle = (field: FieldConfig) => {
    const position = getFieldPosition(field.key);
    const baseFontSize = config.fontSize || field.defaultFontSize || 24;
    const isRtl = config.rtl !== false;
    
    // Get per-field font settings if available
    const fieldFont = config.fieldFonts?.[field.id];
    
    // Use per-field font family or fall back to global/default
    let fontFamily = 'Arial';
    if (fieldFont?.fontFamily) {
      fontFamily = fieldFont.fontFamily;
    } else if (isRtl && fontsLoaded) {
      fontFamily = '"Bahij Nassim", "Noto Sans Arabic", "Arial Unicode MS", "Tahoma", "Arial", sans-serif';
    } else if (config.fontFamily) {
      fontFamily = config.fontFamily;
    }
    
    // Calculate font size: use per-field custom size, or apply multipliers
    let fontSize = baseFontSize;
    if (fieldFont?.fontSize !== undefined) {
      // Use custom font size for this field (absolute value, no multiplier)
      fontSize = fieldFont.fontSize;
    } else {
      // Apply default multipliers
      if (field.id === 'header') {
        fontSize = baseFontSize * 1.5;
      } else if (field.id === 'studentName') {
        fontSize = baseFontSize * 1.17;
      } else if (field.id === 'fatherName' || field.id === 'grandfatherName' || field.id === 'motherName') {
        fontSize = baseFontSize;
      } else if (field.id === 'courseName') {
        fontSize = baseFontSize * 1.0;
      } else if (field.id === 'certificateNumber' || field.id === 'date') {
        fontSize = baseFontSize * 0.5;
      } else {
        fontSize = baseFontSize * 0.8;
      }
    }
    
    // Scale font size based on image scale (to match preview container size)
    const scaledFontSize = fontSize * imageScale;
    
    const textColor = config.textColor || '#000000';
    const isSelected = selectedField === field.id;
    const isDragging = draggingField === field.id;

    return {
      position: 'absolute' as const,
      left: `${position.x}%`,
      top: `${position.y}%`,
      transform: 'translate(-50%, -50%)',
      fontSize: `${scaledFontSize}px`,
      fontFamily,
      fontWeight: 'bold' as const, // Use bold for all fields (same as PDF/image generator)
      color: textColor,
      cursor: 'move',
      userSelect: 'none' as const,
      zIndex: isSelected || isDragging ? 10 : 1,
      opacity: isDragging ? 0.7 : 1,
      border: isSelected ? '2px dashed #3b82f6' : '2px dashed transparent',
      padding: '4px 8px',
      backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
      borderRadius: '4px',
      whiteSpace: 'nowrap' as const,
      pointerEvents: 'auto' as const,
    };
  };
  
  // Available fonts for selection
  const availableFonts = [
    { value: 'Arial', label: 'Arial' },
    { value: 'Roboto', label: 'Roboto' },
    { value: 'Bahij Nassim', label: 'Bahij Nassim (Arabic/Pashto)' },
    { value: 'Times New Roman', label: 'Times New Roman' },
    { value: 'Courier New', label: 'Courier New' },
    { value: 'Georgia', label: 'Georgia' },
    { value: 'Verdana', label: 'Verdana' },
  ];
  
  // Update per-field font settings
  const updateFieldFont = (fieldId: string, property: 'fontSize' | 'fontFamily', value: number | string) => {
    setConfig((prev) => {
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
  
  // Clear per-field font setting
  const clearFieldFont = (fieldId: string, property: 'fontSize' | 'fontFamily') => {
    setConfig((prev) => {
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
        fieldFonts: Object.keys(newFieldFonts).length > 0 ? newFieldFonts : undefined,
      };
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Layout Editor</h3>
          <p className="text-sm text-muted-foreground">
            Drag fields to position them on the certificate. Click to select a field.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Layout
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Preview Canvas */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Certificate Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                ref={containerRef}
                className="relative w-full bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg overflow-visible"
                style={{ aspectRatio: '297/210', maxHeight: '600px', padding: '20px' }}
                onClick={() => setSelectedField(null)}
              >
                {backgroundImageError ? (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <p>Background image not available</p>
                      <p className="text-sm">Upload a background image to see the preview</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {!backgroundImageLoaded && (
                      <div className="absolute inset-0 flex items-center justify-center z-0">
                        <p className="text-muted-foreground">Loading background image...</p>
                      </div>
                    )}
                    {imageUrl && (
                      <img
                        src={imageUrl}
                        alt="Certificate Background"
                        style={{ 
                          display: backgroundImageLoaded ? 'block' : 'none',
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          objectPosition: 'center',
                        }}
                      />
                    )}
                  </>
                )}

                {/* Draggable Fields - Only show enabled fields */}
                {FIELDS.filter(field => config.enabledFields?.includes(field.id)).map((field) => {
                  const position = getFieldPosition(field.key);
                  const isImageField = field.isImage;
                  
                  // Get image size configuration
                  const posConfig = field.id === 'studentPhoto' 
                    ? (config.studentPhotoPosition as any)
                    : (config.qrCodePosition as any);
                  
                  // Use percentage values from config, or default passport size for photos (6% x 10%), QR (12% x 12%)
                  const imageWidthPercent = posConfig?.width ?? (field.id === 'qrCode' ? 12 : 6);
                  const imageHeightPercent = posConfig?.height ?? (field.id === 'qrCode' ? 12 : 10);
                  
                  // Calculate actual pixel size based on container dimensions
                  // Account for 20px padding on each side
                  const padding = 20;
                  const availableWidth = containerDimensions.width > 0 ? containerDimensions.width - (2 * padding) : 0;
                  const availableHeight = containerDimensions.height > 0 ? containerDimensions.height - (2 * padding) : 0;
                  
                  // Calculate pixel sizes, with fallback minimum sizes if container not ready
                  const imageWidthPx = availableWidth > 0 
                    ? (imageWidthPercent / 100) * availableWidth 
                    : (imageWidthPercent / 100) * 600; // Fallback: assume 600px container width
                  const imageHeightPx = availableHeight > 0 
                    ? (imageHeightPercent / 100) * availableHeight 
                    : (imageHeightPercent / 100) * 400; // Fallback: assume 400px container height
                  
                  return (
                    <div
                      key={field.id}
                      style={getFieldStyle(field)}
                      onMouseDown={(e) => handleMouseDown(e, field.id)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedField(field.id);
                      }}
                    >
                      {isImageField ? (
                        <div 
                          className="relative border-2 border-dashed border-blue-400 bg-blue-50 rounded p-2" 
                          style={{ 
                            width: imageWidthPx > 0 
                              ? (field.id === 'qrCode' ? `${Math.min(imageWidthPx, imageHeightPx)}px` : `${imageWidthPx}px`)
                              : 'auto',
                            height: imageHeightPx > 0 
                              ? (field.id === 'qrCode' ? `${Math.min(imageWidthPx, imageHeightPx)}px` : `${imageHeightPx}px`)
                              : 'auto',
                            minHeight: '40px', 
                            minWidth: '40px', 
                            pointerEvents: 'auto',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {/* Resize handles - only show when selected */}
                          {selectedField === field.id && (
                            <>
                              {/* Corner resize handles */}
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
                              {/* Edge resize handles */}
                              <div
                                className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-4 bg-blue-500 rounded cursor-n-resize border-2 border-white shadow-lg hover:bg-blue-600"
                                onMouseDown={(e) => handleResizeStart(e, field.id, 'n')}
                                style={{ zIndex: 30 }}
                                title="Resize from top"
                              />
                              <div
                                className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-4 bg-blue-500 rounded cursor-s-resize border-2 border-white shadow-lg hover:bg-blue-600"
                                onMouseDown={(e) => handleResizeStart(e, field.id, 's')}
                                style={{ zIndex: 30 }}
                                title="Resize from bottom"
                              />
                              <div
                                className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-4 h-3 bg-blue-500 rounded cursor-w-resize border-2 border-white shadow-lg hover:bg-blue-600"
                                onMouseDown={(e) => handleResizeStart(e, field.id, 'w')}
                                style={{ zIndex: 30 }}
                                title="Resize from left"
                              />
                              <div
                                className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-4 h-3 bg-blue-500 rounded cursor-e-resize border-2 border-white shadow-lg hover:bg-blue-600"
                                onMouseDown={(e) => handleResizeStart(e, field.id, 'e')}
                                style={{ zIndex: 30 }}
                                title="Resize from right"
                              />
                            </>
                          )}

                          <div className="flex items-center justify-center gap-1">
                            <GripVertical className="h-4 w-4 opacity-50" />
                            {field.id === 'studentPhoto' && studentPhotoUrl ? (
                            <img
                              src={studentPhotoUrl}
                              alt="Student Photo"
                              style={{
                                width: `${imageWidthPx}px`,
                                height: `${imageHeightPx}px`,
                                objectFit: 'cover', // Cover maintains aspect ratio, crops if needed
                                borderRadius: '4px',
                                pointerEvents: 'none', // Allow resize handles to receive mouse events
                              }}
                            />
                            ) : field.id === 'qrCode' && qrCodeUrl ? (
                            <img
                              src={qrCodeUrl}
                              alt="QR Code"
                              style={{
                                width: `${Math.min(imageWidthPx, imageHeightPx)}px`, // Use smaller dimension for square
                                height: `${Math.min(imageWidthPx, imageHeightPx)}px`, // Use smaller dimension for square
                                objectFit: 'contain', // Contain maintains aspect ratio without distortion
                                pointerEvents: 'none', // Allow resize handles to receive mouse events
                              }}
                            />
                          ) : (
                            <>
                              <span className="text-2xl" style={{ pointerEvents: 'none' }}>{field.sampleText}</span>
                              <span className="text-xs" style={{ pointerEvents: 'none' }}>{field.id === 'qrCode' ? 'QR' : 'Photo'}</span>
                            </>
                          )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <GripVertical className="h-4 w-4 opacity-50" />
                          <span>
                            {field.id === 'header' && config.headerText
                              ? config.headerText
                              : field.id === 'courseName'
                              ? (() => {
                                  const actualCourseName = courseName;
                                  const courseNameLabel = config.courseNameText || '';
                                  return courseNameLabel 
                                    ? `${courseNameLabel} ${actualCourseName}`
                                    : actualCourseName;
                                })()
                              : field.id === 'date' && config.dateText
                              ? `${config.dateText} ${field.sampleText}`
                              : field.id === 'directorSignature'
                              ? (() => {
                                  const sigText = config.directorSignatureText !== undefined 
                                    ? config.directorSignatureText 
                                    : 'Director Signature';
                                  return sigText || '___________';
                                })()
                              : field.id === 'officialSeal'
                              ? (() => {
                                  const sealText = config.officialSealText !== undefined 
                                    ? config.officialSealText 
                                    : 'Official Seal';
                                  return sealText || '___________';
                                })()
                              : field.id === 'certificateNumber'
                              ? (() => {
                                  const certPrefix = config.certificateNumberPrefix !== undefined 
                                    ? config.certificateNumberPrefix 
                                    : 'Certificate No:';
                                  return certPrefix 
                                    ? `${certPrefix} ${field.sampleText}`
                                    : field.sampleText;
                                })()
                              : field.sampleText}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Field Controls */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Field Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Global Settings */}
              <div className="space-y-2">
                <Label>Font Size</Label>
                <Input
                  type="number"
                  value={config.fontSize || 24}
                  onChange={(e) => setConfig({ ...config, fontSize: parseInt(e.target.value) || 24 })}
                  min="8"
                  max="72"
                />
              </div>
              <div className="space-y-2">
                <Label>Font Family</Label>
                <Input
                  value={config.fontFamily || 'Arial'}
                  onChange={(e) => setConfig({ ...config, fontFamily: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Text Color</Label>
                <Input
                  type="color"
                  value={config.textColor || '#000000'}
                  onChange={(e) => setConfig({ ...config, textColor: e.target.value })}
                />
              </div>

              {/* Editable Text Fields for Header, Course Name, and Date */}
              {selectedField === 'header' && (
                <div className="space-y-2 pt-2 border-t">
                  <Label>Header Text</Label>
                  <Input
                    value={config.headerText || 'Certificate of Completion'}
                    onChange={(e) => setConfig({ ...config, headerText: e.target.value })}
                    placeholder="Certificate of Completion"
                  />
                  <p className="text-xs text-muted-foreground">
                    Custom text for the certificate header
                  </p>
                </div>
              )}

              {selectedField === 'courseName' && (
                <div className="space-y-2 pt-2 border-t">
                  <Label>Course Name Label (Optional)</Label>
                  <Input
                    value={config.courseNameText || ''}
                    onChange={(e) => setConfig({ ...config, courseNameText: e.target.value })}
                    placeholder="Leave empty to use course name only"
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional prefix/label for course name (e.g., "Course:"). Leave empty to show only the course name.
                  </p>
                </div>
              )}

              {selectedField === 'date' && (
                <div className="space-y-2 pt-2 border-t">
                  <Label>Date Label</Label>
                  <Input
                    value={config.dateText || 'Date:'}
                    onChange={(e) => setConfig({ ...config, dateText: e.target.value })}
                    placeholder="Date:"
                  />
                  <p className="text-xs text-muted-foreground">
                    Label/prefix for the date field (e.g., "Date:", "Issued on:", etc.)
                  </p>
                </div>
              )}

              {selectedField === 'directorSignature' && (
                <div className="space-y-2 pt-2 border-t">
                  <Label>Director Signature Text</Label>
                  <Input
                    value={config.directorSignatureText !== undefined ? config.directorSignatureText : 'Director Signature'}
                    onChange={(e) => setConfig({ ...config, directorSignatureText: e.target.value })}
                    placeholder="Director Signature"
                  />
                  <p className="text-xs text-muted-foreground">
                    Text to display below signature line. Leave empty to hide text (show only line).
                  </p>
                </div>
              )}

              {selectedField === 'officialSeal' && (
                <div className="space-y-2 pt-2 border-t">
                  <Label>Official Seal Text</Label>
                  <Input
                    value={config.officialSealText !== undefined ? config.officialSealText : 'Official Seal'}
                    onChange={(e) => setConfig({ ...config, officialSealText: e.target.value })}
                    placeholder="Official Seal"
                  />
                  <p className="text-xs text-muted-foreground">
                    Text to display below seal line. Leave empty to hide text (show only line).
                  </p>
                </div>
              )}

              {selectedField === 'certificateNumber' && (
                <div className="space-y-2 pt-2 border-t">
                  <Label>Certificate Number Prefix</Label>
                  <Input
                    value={config.certificateNumberPrefix !== undefined ? config.certificateNumberPrefix : 'Certificate No:'}
                    onChange={(e) => setConfig({ ...config, certificateNumberPrefix: e.target.value })}
                    placeholder="Certificate No:"
                  />
                  <p className="text-xs text-muted-foreground">
                    Prefix for certificate number (e.g., "Certificate No:", "Cert:", "#"). Leave empty to show only the number.
                  </p>
                </div>
              )}

              {(selectedField === 'studentPhoto' || selectedField === 'qrCode') && (
                <div className="space-y-3 pt-2 border-t">
                  <div className="space-y-2">
                    <Label>{selectedField === 'qrCode' ? 'QR Code Size (% of page)' : 'Photo Size (% of page)'}</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Width (%)</Label>
                        <Input
                          type="number"
                          value={
                            (selectedField === 'qrCode'
                              ? (config.qrCodePosition as any)?.width ?? 12
                              : (config.studentPhotoPosition as any)?.width ?? 6)
                          }
                          onChange={(e) => {
                            const raw = e.target.value;
                            const val = raw === '' ? undefined : Math.max(1, Math.min(100, Number(raw)));
                            if (selectedField === 'qrCode') {
                              const current = config.qrCodePosition || { x: 85, y: 40, width: 12, height: 12 };
                              setConfig({ ...config, qrCodePosition: { ...current, width: val } });
                            } else {
                              const current = config.studentPhotoPosition || { x: 15, y: 40, width: 6, height: 10 };
                              setConfig({ ...config, studentPhotoPosition: { ...current, width: val } });
                            }
                          }}
                          placeholder={selectedField === 'qrCode' ? "12 (default)" : "6 (default - passport size)"}
                          min="1"
                          max="100"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Height (%)</Label>
                        <Input
                          type="number"
                          value={
                            (selectedField === 'qrCode'
                              ? (config.qrCodePosition as any)?.height ?? 12
                              : (config.studentPhotoPosition as any)?.height ?? 10)
                          }
                          onChange={(e) => {
                            const raw = e.target.value;
                            const val = raw === '' ? undefined : Math.max(1, Math.min(100, Number(raw)));
                            if (selectedField === 'qrCode') {
                              const current = config.qrCodePosition || { x: 85, y: 40, width: 12, height: 12 };
                              setConfig({ ...config, qrCodePosition: { ...current, height: val } });
                            } else {
                              const current = config.studentPhotoPosition || { x: 15, y: 40, width: 6, height: 10 };
                              setConfig({ ...config, studentPhotoPosition: { ...current, height: val } });
                            }
                          }}
                          placeholder={selectedField === 'qrCode' ? "12 (default)" : "10 (default - passport size)"}
                          min="1"
                          max="100"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Leave empty to use default pixel size. Values are percentages of the page.
                    </p>
                  </div>

                  {selectedField === 'qrCode' && (
                    <div className="space-y-2">
                      <Label>QR Code Value Source</Label>
                      <Select
                        value={config.qrCodeValueSource || 'certificate_number'}
                        onValueChange={(value) =>
                          setConfig({
                            ...config,
                            qrCodeValueSource: value as any,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select QR value source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="certificate_number">Certificate Number</SelectItem>
                          <SelectItem value="admission_no">Admission Number</SelectItem>
                          <SelectItem value="course_student_id">Course Student ID</SelectItem>
                          <SelectItem value="student_id">Student ID</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Select what data should be encoded into the QR code.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Per-Field Font Settings */}
              {selectedField && (
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <Label className="font-semibold">Field-Specific Font Settings</Label>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        clearFieldFont(selectedField, 'fontSize');
                        clearFieldFont(selectedField, 'fontFamily');
                      }}
                      className="text-xs"
                    >
                      Reset to Default
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Font Family</Label>
                    <Select
                      value={config.fieldFonts?.[selectedField]?.fontFamily || 'global'}
                      onValueChange={(value) => {
                        if (value && value !== 'global') {
                          updateFieldFont(selectedField, 'fontFamily', value);
                        } else {
                          clearFieldFont(selectedField, 'fontFamily');
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Use global font" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="global">Use Global Font</SelectItem>
                        {availableFonts.map((font) => (
                          <SelectItem key={font.value} value={font.value}>
                            {font.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Select "Use Global Font" to use the global font setting
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Font Size (px)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={config.fieldFonts?.[selectedField]?.fontSize || ''}
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
                        placeholder="Auto (based on multiplier)"
                        className="h-8 text-xs"
                        min="8"
                        max="144"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => clearFieldFont(selectedField, 'fontSize')}
                        className="h-8 px-2"
                        title="Reset to default"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Leave empty to use calculated size (global fontSize × multiplier)
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Field List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Fields</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-96 overflow-y-auto">
              {FIELDS.map((field) => {
                const position = getFieldPosition(field.key);
                const isSelected = selectedField === field.id;
                const isEnabled = config.enabledFields?.includes(field.id) ?? false;
                return (
                  <div
                    key={field.id}
                    className={`p-2 rounded border cursor-pointer transition-colors ${
                      isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    } ${!isEnabled ? 'opacity-50' : ''}`}
                    onClick={() => setSelectedField(field.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={(e) => {
                            e.stopPropagation();
                            const newEnabledFields = config.enabledFields || [];
                            if (e.target.checked) {
                              setConfig({
                                ...config,
                                enabledFields: [...newEnabledFields, field.id],
                              });
                            } else {
                              setConfig({
                                ...config,
                                enabledFields: newEnabledFields.filter(id => id !== field.id),
                              });
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{field.label}</p>
                          {isEnabled && (
                            <p className="text-xs text-muted-foreground">
                              Position: {position.x.toFixed(1)}%, {position.y.toFixed(1)}%
                            </p>
                          )}
                        </div>
                      </div>
                      {isEnabled && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            resetFieldPosition(field.key);
                          }}
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

