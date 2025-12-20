import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GripVertical, Save, RotateCcw, Eye } from 'lucide-react';
import type { IdCardLayoutConfig } from '@/types/domain/idCardTemplate';
import { idCardTemplatesApi } from '@/lib/api/client';
import { useLanguage } from '@/hooks/useLanguage';
import { useStudents } from '@/hooks/useStudents';

// Available fonts for ID card templates
const AVAILABLE_FONTS = [
  { value: 'Arial', label: 'Arial' },
  { value: 'Bahij Nassim', label: 'Bahij Nassim' },
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
  { value: 'Noto Sans Arabic', label: 'Noto Sans Arabic' },
  { value: 'Tahoma', label: 'Tahoma' },
  { value: 'Arial Unicode MS', label: 'Arial Unicode MS' },
];

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

// Front side fields
const FRONT_FIELDS: FieldConfig[] = [
  { id: 'studentName', label: 'Student Name', key: 'studentNamePosition', sampleText: 'Ahmad Mohammad', defaultFontSize: 14 },
  { id: 'fatherName', label: 'Father Name', key: 'fatherNamePosition', sampleText: 'Son of Mohammad', defaultFontSize: 12 },
  { id: 'studentCode', label: 'Student Code', key: 'studentCodePosition', sampleText: 'STU-2024-001', defaultFontSize: 10 },
  { id: 'admissionNumber', label: 'Admission Number', key: 'admissionNumberPosition', sampleText: 'ADM-2024-001', defaultFontSize: 10 },
  { id: 'class', label: 'Class', key: 'classPosition', sampleText: 'Grade 10 - Section A', defaultFontSize: 10 },
  { id: 'studentPhoto', label: 'Student Photo', key: 'studentPhotoPosition', sampleText: '📷', isImage: true, defaultWidth: 30, defaultHeight: 40, defaultFontSize: 12 },
  { id: 'qrCode', label: 'QR Code', key: 'qrCodePosition', sampleText: 'QR', isImage: true, defaultWidth: 15, defaultHeight: 15, defaultFontSize: 12 },
];

// Back side fields
const BACK_FIELDS: FieldConfig[] = [
  { id: 'schoolName', label: 'School Name', key: 'schoolNamePosition', sampleText: 'Islamic School', defaultFontSize: 12 },
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
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'front' | 'back'>('front');
  
  const [configFront, setConfigFront] = useState<IdCardLayoutConfig>(() => ({
    ...layoutConfigFront,
    enabledFields: layoutConfigFront.enabledFields || ['studentName', 'studentCode', 'admissionNumber', 'class', 'studentPhoto', 'qrCode'],
    fieldFonts: layoutConfigFront.fieldFonts || {},
  }));

  const [configBack, setConfigBack] = useState<IdCardLayoutConfig>(() => ({
    ...layoutConfigBack,
    enabledFields: layoutConfigBack.enabledFields || ['schoolName', 'expiryDate', 'cardNumber'],
    fieldFonts: layoutConfigBack.fieldFonts || {},
  }));

  // Update configs when props change
  useEffect(() => {
    setConfigFront({
      ...layoutConfigFront,
      enabledFields: layoutConfigFront.enabledFields || ['studentName', 'studentCode', 'admissionNumber', 'class', 'studentPhoto', 'qrCode'],
      fieldFonts: layoutConfigFront.fieldFonts || {},
    });
  }, [layoutConfigFront]);

  useEffect(() => {
    setConfigBack({
      ...layoutConfigBack,
      enabledFields: layoutConfigBack.enabledFields || ['schoolName', 'expiryDate', 'cardNumber'],
      fieldFonts: layoutConfigBack.fieldFonts || {},
    });
  }, [layoutConfigBack]);

  const [draggingField, setDraggingField] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [backgroundImageLoadedFront, setBackgroundImageLoadedFront] = useState(false);
  const [backgroundImageLoadedBack, setBackgroundImageLoadedBack] = useState(false);
  const [backgroundImageErrorFront, setBackgroundImageErrorFront] = useState(false);
  const [backgroundImageErrorBack, setBackgroundImageErrorBack] = useState(false);
  const [imageUrlFront, setImageUrlFront] = useState<string | null>(null);
  const [imageUrlBack, setImageUrlBack] = useState<string | null>(null);
  const [imageScale, setImageScale] = useState(1);

  // Get current config based on active tab
  const currentConfig = activeTab === 'front' ? configFront : configBack;
  const setCurrentConfig = activeTab === 'front' ? setConfigFront : setConfigBack;
  const currentFields = activeTab === 'front' ? FRONT_FIELDS : BACK_FIELDS;
  const currentBackgroundUrl = activeTab === 'front' ? backgroundImageUrlFront : backgroundImageUrlBack;
  const currentImageUrl = activeTab === 'front' ? imageUrlFront : imageUrlBack;
  const currentImageLoaded = activeTab === 'front' ? backgroundImageLoadedFront : backgroundImageLoadedBack;
  const currentImageError = activeTab === 'front' ? backgroundImageErrorFront : backgroundImageErrorBack;

  // Fetch students for sample data
  const { data: students = [] } = useStudents();
  const sampleStudent = students.length > 0 ? students[0] : null;

  // Load background images
  useEffect(() => {
    if (!backgroundImageUrlFront) {
      setBackgroundImageErrorFront(true);
      return;
    }

    const loadImage = async () => {
      try {
        let endpoint = backgroundImageUrlFront;
        if (backgroundImageUrlFront.startsWith('http://') || backgroundImageUrlFront.startsWith('https://')) {
          const urlObj = new URL(backgroundImageUrlFront);
          endpoint = urlObj.pathname;
        }
        if (endpoint.startsWith('/api')) {
          endpoint = endpoint.replace('/api', '');
        }

        const { blob } = await idCardTemplatesApi.getBackgroundImage(templateId, 'front');
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
        let endpoint = backgroundImageUrlBack;
        if (backgroundImageUrlBack.startsWith('http://') || backgroundImageUrlBack.startsWith('https://')) {
          const urlObj = new URL(backgroundImageUrlBack);
          endpoint = urlObj.pathname;
        }
        if (endpoint.startsWith('/api')) {
          endpoint = endpoint.replace('/api', '');
        }

        const { blob } = await idCardTemplatesApi.getBackgroundImage(templateId, 'back');
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

  const getFieldPosition = (fieldKey: keyof IdCardLayoutConfig) => {
    const position = currentConfig[fieldKey] as { x: number; y: number } | undefined;
    if (position) return position;
    
    // Default positions for ID card (CR80: 85.6mm × 53.98mm)
    const defaultPositions: Record<string, { x: number; y: number }> = {
      studentNamePosition: { x: 50, y: 40 },
      fatherNamePosition: { x: 50, y: 50 },
      studentCodePosition: { x: 50, y: 60 },
      admissionNumberPosition: { x: 50, y: 70 },
      classPosition: { x: 50, y: 80 },
      studentPhotoPosition: { x: 20, y: 50 },
      qrCodePosition: { x: 80, y: 50 },
      schoolNamePosition: { x: 50, y: 30 },
      expiryDatePosition: { x: 50, y: 60 },
      cardNumberPosition: { x: 50, y: 80 },
    };
    
    return defaultPositions[fieldKey] || { x: 50, y: 50 };
  };

  const updateFieldPosition = (fieldKey: keyof IdCardLayoutConfig, x: number, y: number) => {
    setCurrentConfig((prev) => ({
      ...prev,
      [fieldKey]: { x, y },
    }));
  };

  const handleMouseDown = useCallback((e: React.MouseEvent, fieldId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingField(fieldId);
    setSelectedField(fieldId);

    const field = currentFields.find((f) => f.id === fieldId);
    if (!field || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const position = getFieldPosition(field.key);
    const fieldX = (position.x / 100) * rect.width;
    const fieldY = (position.y / 100) * rect.height;

    setDragOffset({
      x: e.clientX - rect.left - fieldX,
      y: e.clientY - rect.top - fieldY,
    });
  }, [currentConfig, currentFields]);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!draggingField || !containerRef.current) return;

      const field = currentFields.find((f) => f.id === draggingField);
      if (!field) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100;
      const y = ((e.clientY - rect.top - dragOffset.y) / rect.height) * 100;

      const clampedX = Math.max(0, Math.min(100, x));
      const clampedY = Math.max(0, Math.min(100, y));

      updateFieldPosition(field.key, clampedX, clampedY);
    },
    [draggingField, dragOffset, currentFields]
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

  const getFieldStyle = (field: FieldConfig) => {
    const position = getFieldPosition(field.key);
    const baseFontSize = currentConfig.fontSize || field.defaultFontSize || 12;
    const fontSize = baseFontSize * imageScale;
    const textColor = currentConfig.textColor || '#000000';
    const isSelected = selectedField === field.id;
    const isDragging = draggingField === field.id;

    if (field.isImage) {
      const imagePosition = position as { x: number; y: number; width?: number; height?: number };
      return {
        position: 'absolute' as const,
        left: `${imagePosition.x}%`,
        top: `${imagePosition.y}%`,
        transform: 'translate(-50%, -50%)',
        width: imagePosition.width ? `${imagePosition.width}%` : '15%',
        height: imagePosition.height ? `${imagePosition.height}%` : '15%',
        border: isSelected ? '2px dashed #3b82f6' : '2px dashed #666',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        cursor: 'move',
        zIndex: isSelected || isDragging ? 10 : 1,
        opacity: isDragging ? 0.7 : 1,
      };
    }

    return {
      position: 'absolute' as const,
      left: `${position.x}%`,
      top: `${position.y}%`,
      transform: 'translate(-50%, -50%)',
      fontSize: `${fontSize}px`,
      fontFamily: currentConfig.fontFamily || 'Arial',
      color: textColor,
      cursor: 'move',
      userSelect: 'none' as const,
      zIndex: isSelected || isDragging ? 10 : 1,
      opacity: isDragging ? 0.7 : 1,
      border: isSelected ? '2px dashed #3b82f6' : '2px dashed transparent',
      padding: '2px 4px',
      backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
      borderRadius: '2px',
      whiteSpace: 'nowrap' as const,
    };
  };

  const handleSave = () => {
    onSave(configFront, configBack);
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
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            {t('common.save')}
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
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{t('idCards.frontPreview') || 'Front Preview'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    ref={containerRef}
                    className="relative w-full bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden"
                    style={{ aspectRatio: '85.6/53.98', maxHeight: '400px' }}
                    onClick={() => setSelectedField(null)}
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
                            className="w-full h-full object-contain"
                            style={{ display: currentImageLoaded ? 'block' : 'none' }}
                          />
                        )}
                      </>
                    )}

                    {/* Draggable Fields */}
                    {currentFields.filter(field => currentConfig.enabledFields?.includes(field.id)).map((field) => {
                      const position = getFieldPosition(field.key);
                      const isImageField = field.isImage;
                      const sampleText = field.id === 'studentName' && sampleStudent
                        ? sampleStudent.fullName
                        : field.sampleText;

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
                            <div className="w-full h-full flex items-center justify-center bg-white border border-gray-300 rounded">
                              <span className="text-xs">{sampleText}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <GripVertical className="h-3 w-3 opacity-50" />
                              <span>{sampleText}</span>
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
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{t('idCards.fields') || 'Fields'}</CardTitle>
                </CardHeader>
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
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{t('idCards.globalSettings') || 'Global Settings'}</CardTitle>
                </CardHeader>
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
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="back" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Preview Canvas */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{t('idCards.backPreview') || 'Back Preview'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    ref={containerRef}
                    className="relative w-full bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden"
                    style={{ aspectRatio: '85.6/53.98', maxHeight: '400px' }}
                    onClick={() => setSelectedField(null)}
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
                            className="w-full h-full object-contain"
                            style={{ display: currentImageLoaded ? 'block' : 'none' }}
                          />
                        )}
                      </>
                    )}

                    {/* Draggable Fields */}
                    {currentFields.filter(field => currentConfig.enabledFields?.includes(field.id)).map((field) => {
                      const position = getFieldPosition(field.key);
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
                          <div className="flex items-center gap-1">
                            <GripVertical className="h-3 w-3 opacity-50" />
                            <span>{field.sampleText}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Field List & Settings */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{t('idCards.fields') || 'Fields'}</CardTitle>
                </CardHeader>
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
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{t('idCards.globalSettings') || 'Global Settings'}</CardTitle>
                </CardHeader>
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
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

