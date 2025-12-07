import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, Award, Eye } from 'lucide-react';
import {
  useCertificateTemplates,
  useGenerateCertificate,
  useCertificateData,
  getCertificateBackgroundUrl,
  CertificateTemplate,
} from '@/hooks/useCertificateTemplates';
import { format } from 'date-fns';

// Import pdfmake for Arabic support
import pdfMake from 'pdfmake-arabic/build/pdfmake';
import pdfFonts from 'pdfmake-arabic/build/vfs_fonts';

// Set up fonts for Arabic/Pashto support
pdfMake.vfs = pdfFonts.pdfMake.vfs;

interface CertificatePdfGeneratorProps {
  courseStudentId: string;
  studentName: string;
  courseName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CertificatePdfGenerator({
  courseStudentId,
  studentName,
  courseName,
  isOpen,
  onClose,
}: CertificatePdfGeneratorProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { data: templates = [] } = useCertificateTemplates(true); // Only active templates
  const { data: certificateData, isLoading: dataLoading } = useCertificateData(courseStudentId);
  const generateCertificate = useGenerateCertificate();

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  const handleGeneratePdf = async (download: boolean = true) => {
    if (!selectedTemplateId || !certificateData) return;

    setIsGenerating(true);
    try {
      // First, generate the certificate on the backend (this assigns certificate number)
      await generateCertificate.mutateAsync({
        courseStudentId,
        templateId: selectedTemplateId,
      });

      // Build PDF document definition
      const docDefinition = buildPdfDocument(certificateData, selectedTemplate!);

      if (download) {
        // Download the PDF
        pdfMake.createPdf(docDefinition).download(
          `certificate-${certificateData.student.certificate_number || courseStudentId}.pdf`
        );
      } else {
        // Preview
        pdfMake.createPdf(docDefinition).getBlob((blob) => {
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
        });
      }
    } catch (error) {
      console.error('Failed to generate PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const buildPdfDocument = (data: typeof certificateData, template: CertificateTemplate) => {
    if (!data) return { content: [] };

    const layout = template.layout_config || {};
    const isRtl = layout.rtl !== false; // Default to RTL for Pashto/Arabic

    // Certificate content
    const content: any[] = [];

    // Header
    content.push({
      text: 'Certificate of Completion',
      style: 'header',
      alignment: 'center',
      margin: [0, 80, 0, 40],
    });

    // Decorative line
    content.push({
      canvas: [
        {
          type: 'line',
          x1: 100,
          y1: 0,
          x2: 400,
          y2: 0,
          lineWidth: 2,
          lineColor: layout.textColor || '#000000',
        },
      ],
      margin: [0, 0, 0, 30],
    });

    // Main text
    content.push({
      text: 'This is to certify that',
      style: 'subtext',
      alignment: 'center',
      margin: [0, 0, 0, 20],
    });

    // Student name
    content.push({
      text: data.student.full_name,
      style: 'studentName',
      alignment: 'center',
      margin: [0, 0, 0, 10],
    });

    // Father name
    content.push({
      text: `Son of ${data.student.father_name}`,
      style: 'subtext',
      alignment: 'center',
      margin: [0, 0, 0, 30],
    });

    // Course completion text
    content.push({
      text: 'has successfully completed the course',
      style: 'subtext',
      alignment: 'center',
      margin: [0, 0, 0, 20],
    });

    // Course name
    content.push({
      text: data.course?.name || courseName,
      style: 'courseName',
      alignment: 'center',
      margin: [0, 0, 0, 30],
    });

    // Duration info
    if (data.course?.start_date && data.course?.end_date) {
      content.push({
        text: `Duration: ${format(new Date(data.course.start_date), 'MMM d, yyyy')} - ${format(new Date(data.course.end_date), 'MMM d, yyyy')}`,
        style: 'details',
        alignment: 'center',
        margin: [0, 0, 0, 10],
      });
    }

    // Instructor
    if (data.course?.instructor_name) {
      content.push({
        text: `Instructor: ${data.course.instructor_name}`,
        style: 'details',
        alignment: 'center',
        margin: [0, 0, 0, 30],
      });
    }

    // Certificate number and date
    content.push({
      columns: [
        {
          text: `Certificate No: ${data.student.certificate_number || 'N/A'}`,
          style: 'footer',
          alignment: 'left',
        },
        {
          text: `Date: ${data.student.certificate_issued_at ? format(new Date(data.student.certificate_issued_at), 'MMM d, yyyy') : format(new Date(), 'MMM d, yyyy')}`,
          style: 'footer',
          alignment: 'right',
        },
      ],
      margin: [50, 50, 50, 0],
    });

    // Signature lines
    content.push({
      columns: [
        {
          stack: [
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 1 }] },
            { text: 'Director Signature', style: 'signatureLabel', margin: [0, 5, 0, 0] },
          ],
          width: 'auto',
        },
        { text: '', width: '*' },
        {
          stack: [
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 1 }] },
            { text: 'Official Seal', style: 'signatureLabel', margin: [0, 5, 0, 0] },
          ],
          width: 'auto',
        },
      ],
      margin: [50, 60, 50, 0],
    });

    return {
      pageSize: 'A4',
      pageOrientation: 'landscape' as const,
      pageMargins: [40, 40, 40, 40],
      content,
      styles: {
        header: {
          fontSize: 36,
          bold: true,
          color: layout.textColor || '#1a365d',
        },
        subtext: {
          fontSize: 16,
          color: '#4a5568',
        },
        studentName: {
          fontSize: 28,
          bold: true,
          color: layout.textColor || '#2d3748',
        },
        courseName: {
          fontSize: 24,
          bold: true,
          color: layout.textColor || '#1a365d',
        },
        details: {
          fontSize: 14,
          color: '#718096',
        },
        footer: {
          fontSize: 12,
          color: '#4a5568',
        },
        signatureLabel: {
          fontSize: 10,
          color: '#718096',
          alignment: 'center',
        },
      },
      defaultStyle: {
        font: layout.fontFamily || 'Roboto',
      },
      // Background with template image if available
      ...(template.background_image_path && {
        background: function(currentPage: number, pageSize: any) {
          return {
            image: getCertificateBackgroundUrl(template.id),
            width: pageSize.width,
            height: pageSize.height,
            absolutePosition: { x: 0, y: 0 },
          };
        },
      }),
    };
  };

  const handleClose = () => {
    setPreviewUrl(null);
    setSelectedTemplateId('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Generate Certificate
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Student Info */}
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Student</Label>
                  <p className="font-medium">{studentName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Course</Label>
                  <p className="font-medium">{courseName}</p>
                </div>
                {certificateData?.student.certificate_number && (
                  <div>
                    <Label className="text-muted-foreground">Certificate Number</Label>
                    <p className="font-medium">{certificateData.student.certificate_number}</p>
                  </div>
                )}
                {certificateData?.student.certificate_issued_at && (
                  <div>
                    <Label className="text-muted-foreground">Issued At</Label>
                    <p className="font-medium">
                      {format(new Date(certificateData.student.certificate_issued_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Template Selection */}
          <div className="space-y-2">
            <Label>Select Template</Label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a certificate template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex items-center gap-2">
                      {template.name}
                      {template.is_default && (
                        <Badge variant="secondary" className="text-xs">Default</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {templates.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No active templates found. Please create a template first.
              </p>
            )}
          </div>

          {/* Template Preview */}
          {selectedTemplate && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{selectedTemplate.name}</h4>
                    {selectedTemplate.description && (
                      <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
                    )}
                  </div>
                  {selectedTemplate.background_image_path && (
                    <Badge variant="outline">
                      Has Background Image
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* PDF Preview */}
          {previewUrl && (
            <div className="border rounded-lg overflow-hidden">
              <iframe
                src={previewUrl}
                className="w-full h-96"
                title="Certificate Preview"
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => handleGeneratePdf(false)}
            disabled={!selectedTemplateId || isGenerating || dataLoading}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Eye className="h-4 w-4 mr-2" />
            )}
            Preview
          </Button>
          <Button
            onClick={() => handleGeneratePdf(true)}
            disabled={!selectedTemplateId || isGenerating || dataLoading}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
