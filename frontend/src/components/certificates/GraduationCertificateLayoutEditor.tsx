import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GripVertical, Save, RotateCcw } from 'lucide-react';
import type { CertificateLayoutConfig } from '@/hooks/useCertificateTemplates';
import { certificateTemplatesApi } from '@/lib/api/client';
import { useGraduationBatches, useGraduationBatch } from '@/hooks/useGraduation';
import { useSchools } from '@/hooks/useSchools';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrentAcademicYear } from '@/hooks/useAcademicYears';

interface FieldConfig {
  id: string;
  label: string;
  key: keyof CertificateLayoutConfig;
  sampleText: string;
  defaultFontSize?: number;
  isImage?: boolean;
  defaultWidth?: number;
  defaultHeight?: number;
}

// Graduation-specific fields
const getGraduationFields = (
  studentName: string,
  fatherName: string,
  className: string,
  schoolName: string,
  academicYear: string
): FieldConfig[] => [
  { id: 'header', label: 'Header', key: 'headerPosition', sampleText: 'Graduation Certificate', defaultFontSize: 36 },
  { id: 'studentName', label: 'Student Name', key: 'studentNamePosition', sampleText: studentName, defaultFontSize: 28 },
  { id: 'fatherName', label: 'Father Name', key: 'fatherNamePosition', sampleText: fatherName, defaultFontSize: 16 },
  { id: 'grandfatherName', label: 'Grandfather Name', key: 'grandfatherNamePosition', sampleText: 'Son of Grandfather', defaultFontSize: 14 },
  { id: 'motherName', label: 'Mother Name', key: 'motherNamePosition', sampleText: 'Son of Mary', defaultFontSize: 14 },
  { id: 'className', label: 'Class Name', key: 'classNamePosition', sampleText: className, defaultFontSize: 24 },
  { id: 'schoolName', label: 'School Name', key: 'schoolNamePosition', sampleText: schoolName, defaultFontSize: 20 },
  { id: 'academicYear', label: 'Academic Year', key: 'academicYearPosition', sampleText: academicYear, defaultFontSize: 18 },
  { id: 'graduationDate', label: 'Graduation Date', key: 'graduationDatePosition', sampleText: 'Jan 15, 2024', defaultFontSize: 14 },
  { id: 'certificateNumber', label: 'Certificate Number', key: 'certificateNumberPosition', sampleText: 'CERT-2024-0001', defaultFontSize: 12 },
  { id: 'position', label: 'Position/Rank', key: 'positionPosition', sampleText: '1st', defaultFontSize: 14 },
  { id: 'province', label: 'Province', key: 'provincePosition', sampleText: 'Kabul', defaultFontSize: 12 },
  { id: 'district', label: 'District', key: 'districtPosition', sampleText: 'District 1', defaultFontSize: 12 },
  { id: 'village', label: 'Village', key: 'villagePosition', sampleText: 'Village Name', defaultFontSize: 12 },
  { id: 'nationality', label: 'Nationality', key: 'nationalityPosition', sampleText: 'Afghan', defaultFontSize: 12 },
  { id: 'guardianName', label: 'Guardian Name', key: 'guardianNamePosition', sampleText: 'Guardian Name', defaultFontSize: 14 },
  { id: 'studentPhoto', label: 'Student Photo', key: 'studentPhotoPosition', sampleText: '📷', isImage: true, defaultWidth: 100, defaultHeight: 100, defaultFontSize: 12 },
  { id: 'qrCode', label: 'QR Code', key: 'qrCodePosition', sampleText: 'QR', isImage: true, defaultWidth: 120, defaultHeight: 120, defaultFontSize: 12 },
];

interface GraduationCertificateLayoutEditorProps {
  templateId: string;
  backgroundImageUrl: string | null;
  layoutConfig: CertificateLayoutConfig;
  schoolId?: string | null;
  onSave: (config: CertificateLayoutConfig) => void;
  onCancel: () => void;
}

export function GraduationCertificateLayoutEditor({
  templateId,
  backgroundImageUrl,
  layoutConfig,
  schoolId,
  onSave,
  onCancel,
}: GraduationCertificateLayoutEditorProps) {
  const [config, setConfig] = useState<CertificateLayoutConfig>(() => ({
    ...layoutConfig,
    enabledFields: layoutConfig.enabledFields || ['header', 'studentName', 'fatherName', 'className', 'schoolName', 'academicYear', 'certificateNumber', 'graduationDate'],
    fieldFonts: layoutConfig.fieldFonts || {},
  }));

  useEffect(() => {
    setConfig({
      ...layoutConfig,
      enabledFields: layoutConfig.enabledFields || ['header', 'studentName', 'fatherName', 'className', 'schoolName', 'academicYear', 'certificateNumber', 'graduationDate'],
      fieldFonts: layoutConfig.fieldFonts || {},
    });
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

  const { language } = useLanguage();
  const { data: schools = [] } = useSchools();
  const { data: currentAcademicYear } = useCurrentAcademicYear();
  const { data: batches = [] } = useGraduationBatches({ school_id: schoolId || undefined });
  
  // Get sample data from first batch or use defaults
  const sampleBatch = batches.length > 0 ? batches[0] : null;
  const school = schoolId ? schools.find((s) => s.id === schoolId) : null;

  // Load fonts
  useEffect(() => {
    const loadFonts = async () => {
      try {
        const boldWoffModule = await import('@/fonts/Bahij Nassim-Bold.woff?url');
        const boldWoffUrl = boldWoffModule.default;
        const fontFace = new FontFace('Bahij Nassim', `url(${boldWoffUrl})`);
        await fontFace.load();
        document.fonts.add(fontFace);
        setFontsLoaded(true);
        if (import.meta.env.DEV) {
          console.log('[GraduationCertificateLayoutEditor] Bahij Nassim Bold loaded');
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('[GraduationCertificateLayoutEditor] Failed to load Bahij Nassim, using fallback');
        }
        setFontsLoaded(false);
      }
    };
    loadFonts();
  }, []);

  // Get sample data
  const { studentName, fatherName, className, schoolName, academicYear } = useMemo(() => {
    // Try to get from batch if available
    if (sampleBatch && sampleBatch.students && sampleBatch.students.length > 0) {
      const firstStudent = sampleBatch.students[0];
      return {
        studentName: firstStudent.student?.full_name || 'احمد محمد',
        fatherName: firstStudent.student?.father_name || 'بن محمد',
        className: sampleBatch.class?.name || 'Class 12',
        schoolName: sampleBatch.school?.school_name || school?.schoolName || 'Sample School',
        academicYear: sampleBatch.academic_year?.name || currentAcademicYear?.name || '2024-2025',
      };
    }

    // Language-aware defaults
    if (language === 'ps' || language === 'fa' || language === 'ar') {
      return {
        studentName: 'احمد محمد',
        fatherName: 'بن محمد',
        className: 'الصف الثاني عشر',
        schoolName: school?.schoolName || 'مدرسة نموذجية',
        academicYear: currentAcademicYear?.name || '2024-2025',
      };
    } else {
      return {
        studentName: 'John Doe',
        fatherName: 'Son of John Smith',
        className: 'Class 12',
        schoolName: school?.schoolName || 'Sample School',
        academicYear: currentAcademicYear?.name || '2024-2025',
      };
    }
  }, [sampleBatch, school, currentAcademicYear, language]);

  const FIELDS = useMemo(() => getGraduationFields(studentName, fatherName, className, schoolName, academicYear), [studentName, fatherName, className, schoolName, academicYear]);

  // Load background image
  useEffect(() => {
    if (!backgroundImageUrl) {
      setBackgroundImageError(true);
      return;
    }

    const loadImage = async () => {
      try {
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

        const img = new Image();
        img.onload = () => {
          setBackgroundImageLoaded(true);
          const maxWidth = 800;
          const scale = img.width > maxWidth ? maxWidth / img.width : 1;
          setImageScale(scale);
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

    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [backgroundImageUrl]);

  const getFieldPosition = (fieldKey: keyof CertificateLayoutConfig) => {
    const position = config[fieldKey] as { x: number; y: number } | undefined;
    if (position) return position;

    const defaultPositions: Record<string, { x: number; y: number }> = {
      headerPosition: { x: 50, y: 15 },
      studentNamePosition: { x: 50, y: 35 },
      fatherNamePosition: { x: 50, y: 42 },
      grandfatherNamePosition: { x: 50, y: 48 },
      motherNamePosition: { x: 50, y: 54 },
      classNamePosition: { x: 50, y: 60 },
      schoolNamePosition: { x: 50, y: 68 },
      academicYearPosition: { x: 50, y: 75 },
      graduationDatePosition: { x: 50, y: 82 },
      certificateNumberPosition: { x: 10, y: 90 },
      positionPosition: { x: 90, y: 90 },
      provincePosition: { x: 30, y: 75 },
      districtPosition: { x: 50, y: 75 },
      villagePosition: { x: 70, y: 75 },
      nationalityPosition: { x: 50, y: 80 },
      guardianNamePosition: { x: 50, y: 70 },
      studentPhotoPosition: { x: 15, y: 40 },
      qrCodePosition: { x: 85, y: 85 },
    };

    return defaultPositions[fieldKey] || { x: 50, y: 50 };
  };

  const updateFieldPosition = (fieldKey: keyof CertificateLayoutConfig, x: number, y: number) => {
    setConfig((prev) => ({
      ...prev,
      [fieldKey]: { x, y },
    }));
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
    const fieldX = (position.x / 100) * rect.width;
    const fieldY = (position.y / 100) * rect.height;

    setDragOffset({
      x: e.clientX - rect.left - fieldX,
      y: e.clientY - rect.top - fieldY,
    });
  }, [FIELDS]);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!draggingField || !containerRef.current) return;

      const field = FIELDS.find((f) => f.id === draggingField);
      if (!field) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100;
      const y = ((e.clientY - rect.top - dragOffset.y) / rect.height) * 100;

      const clampedX = Math.max(0, Math.min(100, x));
      const clampedY = Math.max(0, Math.min(100, y));

      updateFieldPosition(field.key, clampedX, clampedY);
    },
    [draggingField, dragOffset, FIELDS]
  );

  const handleMouseUp = useCallback(() => {
    setDraggingField(null);
  }, []);

  useEffect(() => {
    if (draggingField) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingField, handleMouseMove, handleMouseUp]);

  const resetFieldPosition = (fieldKey: keyof CertificateLayoutConfig) => {
    setConfig((prev) => {
      const newConfig = { ...prev };
      delete newConfig[fieldKey];
      return newConfig;
    });
  };

  const handleSave = () => {
    onSave(config);
  };

  const getFieldStyle = (field: FieldConfig) => {
    const position = getFieldPosition(field.key);
    const baseFontSize = config.fontSize || field.defaultFontSize || 24;
    const isRtl = config.rtl !== false;

    const fieldFont = config.fieldFonts?.[field.id];
    let fontFamily = 'Arial';
    if (fieldFont?.fontFamily) {
      fontFamily = fieldFont.fontFamily;
    } else if (isRtl && fontsLoaded) {
      fontFamily = '"Bahij Nassim", "Noto Sans Arabic", "Arial Unicode MS", "Tahoma", "Arial", sans-serif';
    } else if (config.fontFamily) {
      fontFamily = config.fontFamily;
    }

    let fontSize = baseFontSize;
    if (fieldFont?.fontSize !== undefined) {
      fontSize = fieldFont.fontSize;
    } else {
      if (field.id === 'header') {
        fontSize = baseFontSize * 1.5;
      } else if (field.id === 'studentName') {
        fontSize = baseFontSize * 1.17;
      } else if (field.id === 'fatherName' || field.id === 'grandfatherName' || field.id === 'motherName') {
        fontSize = baseFontSize;
      } else if (field.id === 'className' || field.id === 'schoolName') {
        fontSize = baseFontSize * 1.0;
      } else if (field.id === 'certificateNumber' || field.id === 'graduationDate') {
        fontSize = baseFontSize * 0.5;
      } else {
        fontSize = baseFontSize * 0.8;
      }
    }

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
      fontWeight: 'bold' as const,
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

  const availableFonts = [
    { value: 'Arial', label: 'Arial' },
    { value: 'Roboto', label: 'Roboto' },
    { value: 'Bahij Nassim', label: 'Bahij Nassim (Regular)' },
    { value: 'Bahij Nassim-Bold', label: 'Bahij Nassim Bold' },
    { value: 'Bahij Nassim-Regular', label: 'Bahij Nassim Regular' },
    { value: 'Bahij Titr-Bold', label: 'Bahij Titr Bold' },
    { value: 'Times New Roman', label: 'Times New Roman' },
    { value: 'Courier New', label: 'Courier New' },
    { value: 'Georgia', label: 'Georgia' },
    { value: 'Verdana', label: 'Verdana' },
    { value: 'Helvetica', label: 'Helvetica' },
    { value: 'Tahoma', label: 'Tahoma' },
    { value: 'Noto Sans Arabic', label: 'Noto Sans Arabic' },
  ];

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
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Certificate Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                ref={containerRef}
                className="relative w-full bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden"
                style={{ aspectRatio: '297/210', maxHeight: '600px' }}
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
                        className="w-full h-full object-contain"
                        style={{
                          display: backgroundImageLoaded ? 'block' : 'none',
                        }}
                      />
                    )}
                  </>
                )}

                {FIELDS.filter(field => config.enabledFields?.includes(field.id)).map((field) => {
                  const position = getFieldPosition(field.key);
                  const isImageField = field.isImage;

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
                        <div className="flex items-center justify-center gap-1 border-2 border-dashed border-blue-400 bg-blue-50 rounded p-2">
                          <GripVertical className="h-4 w-4 opacity-50" />
                          <span className="text-2xl">{field.sampleText}</span>
                          <span className="text-xs">{field.id === 'qrCode' ? 'QR Code' : 'Photo'}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <GripVertical className="h-4 w-4 opacity-50" />
                          <span>
                            {field.id === 'header' && config.headerText
                              ? config.headerText
                              : field.id === 'className' && config.classNameText
                              ? `${config.classNameText} ${field.sampleText}`
                              : field.id === 'graduationDate' && config.dateText
                              ? `${config.dateText} ${field.sampleText}`
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

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Field Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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

              {selectedField === 'header' && (
                <div className="space-y-2 pt-2 border-t">
                  <Label>Header Text</Label>
                  <Input
                    value={config.headerText || 'Graduation Certificate'}
                    onChange={(e) => setConfig({ ...config, headerText: e.target.value })}
                    placeholder="Graduation Certificate"
                  />
                </div>
              )}

              {selectedField === 'className' && (
                <div className="space-y-2 pt-2 border-t">
                  <Label>Class Name Label (Optional)</Label>
                  <Input
                    value={config.classNameText || ''}
                    onChange={(e) => setConfig({ ...config, classNameText: e.target.value })}
                    placeholder="Leave empty to use class name only"
                  />
                </div>
              )}

              {selectedField === 'graduationDate' && (
                <div className="space-y-2 pt-2 border-t">
                  <Label>Date Label</Label>
                  <Input
                    value={config.dateText || 'Date:'}
                    onChange={(e) => setConfig({ ...config, dateText: e.target.value })}
                    placeholder="Date:"
                  />
                </div>
              )}

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
                    <div className="relative">
                      <Input
                        list={`font-family-options-${selectedField}`}
                        value={config.fieldFonts?.[selectedField]?.fontFamily || 'global'}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value && value !== 'global') {
                            updateFieldFont(selectedField, 'fontFamily', value);
                          } else {
                            clearFieldFont(selectedField, 'fontFamily');
                          }
                        }}
                        placeholder="Type or select a font family"
                        className="h-8 text-xs pr-10"
                      />
                      <datalist id={`font-family-options-${selectedField}`}>
                        <option value="global">Use Global Font</option>
                        {availableFonts.map((font) => (
                          <option key={font.value} value={font.value}>
                            {font.label}
                          </option>
                        ))}
                      </datalist>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Type any font name or select from suggestions (includes Bahij fonts)
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
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

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

