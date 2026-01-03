import { useQuery } from "@tanstack/react-query";
import { Download, File, Image as ImageIcon, Loader2, FileText, X, Printer } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DocumentNumberBadge } from "@/components/dms/DocumentNumberBadge";
import { SecurityBadge } from "@/components/dms/SecurityBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/hooks/useLanguage";
import { dmsApi } from "@/lib/api/client";
import { showToast } from "@/lib/toast";
import { formatDate } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/loading";
import { renderLetterToDataUrl } from "@/services/dms/LetterCanvasRenderer";
import { generateLetterPdf } from "@/services/dms/LetterPdfGenerator";
import type { OutgoingDocument } from "@/types/dms";

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(',');
  const mimeMatch = header.match(/data:(.*?);base64/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

interface LetterDetailsPanelProps {
  letter: OutgoingDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Attachment Card Component
function AttachmentCard({
  file,
  onPreview,
  onDownload,
  canPreview,
  isImageFile,
  isPdfFile,
  previewLoading
}: {
  file: any;
  onPreview: (file: any) => void;
  onDownload: (id: string, name: string) => void;
  canPreview: (mimeType?: string) => boolean;
  isImageFile: (mimeType?: string) => boolean;
  isPdfFile: (mimeType?: string) => boolean;
  previewLoading: boolean;
}) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [loadingThumbnail, setLoadingThumbnail] = useState(false);

  // Load thumbnail for images
  useEffect(() => {
    if (isImageFile(file.mime_type) && !thumbnailUrl && !loadingThumbnail) {
      setLoadingThumbnail(true);
      dmsApi.files.download(file.id)
        .then((result) => {
          const blob = result instanceof Blob ? result : (result as any).blob;
          const url = window.URL.createObjectURL(blob);
          setThumbnailUrl(url);
        })
        .catch(() => {
          // Silently fail - just won't show thumbnail
        })
        .finally(() => {
          setLoadingThumbnail(false);
        });
    }
    return () => {
      if (thumbnailUrl) {
        window.URL.revokeObjectURL(thumbnailUrl);
      }
    };
  }, [file.id, file.mime_type]);

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="relative aspect-video bg-muted flex items-center justify-center group">
        {isImageFile(file.mime_type) ? (
          loadingThumbnail ? (
            <div className="animate-pulse bg-muted-foreground/20 w-full h-full" />
          ) : thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={file.original_name}
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => onPreview(file)}
            />
          ) : (
            <FileText className="h-12 w-12 text-muted-foreground" />
          )
        ) : isPdfFile(file.mime_type) ? (
          <FileText className="h-12 w-12 text-red-500" />
        ) : (
          <File className="h-12 w-12 text-muted-foreground" />
        )}
      </div>
      <CardContent className="p-3">
        <p className="text-sm font-medium mb-1 truncate" title={file.original_name}>
          {file.original_name}
        </p>
        <p className="text-xs text-muted-foreground mb-3">
          {file.size_bytes ? `${(file.size_bytes / 1024).toFixed(2)} KB • ` : ''}v{file.version}
        </p>
        <div className="flex items-center gap-2">
          {canPreview(file.mime_type) && (
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 h-8 text-xs"
              onClick={() => onPreview(file)}
              disabled={previewLoading}
            >
              Preview
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-8 text-xs"
            onClick={() => onDownload(file.id, file.original_name)}
          >
            <Download className="h-3 w-3 mr-1" />
            Download
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function LetterDetailsPanel({ letter, open, onOpenChange }: LetterDetailsPanelProps) {
  const { t, isRTL } = useLanguage();
  const [previewFile, setPreviewFile] = useState<{
    id: string;
    name: string;
    mime_type?: string;
    url?: string;
  } | null>(null);
  const [filePreviewLoading, setFilePreviewLoading] = useState(false);
  const [letterPreviewUrl, setLetterPreviewUrl] = useState<string | null>(null);
  const [letterPreviewLoading, setLetterPreviewLoading] = useState(false);
  const [letterPreviewError, setLetterPreviewError] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const letterRenderIdRef = useRef(0);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        window.URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  // Fetch full letter details when panel opens
  const { data: fullLetter, isLoading } = useQuery<OutgoingDocument>({
    queryKey: ["dms", "outgoing", letter?.id],
    queryFn: async () => {
      if (!letter?.id) throw new Error("No letter ID");
      return await dmsApi.outgoing.get(letter.id);
    },
    enabled: open && !!letter?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Use full letter data if available, otherwise use passed letter
  const displayLetter = fullLetter || letter;
  const letterTemplate = displayLetter?.template || null;
  const activeLetterhead = displayLetter?.letterhead || letterTemplate?.letterhead || null;

  const letterheadImage = useMemo(() => {
    if (!activeLetterhead) return null;
    return activeLetterhead.image_url || activeLetterhead.preview_url || activeLetterhead.file_url || null;
  }, [activeLetterhead]);

  const watermarkImage = useMemo(() => {
    if (!letterTemplate?.watermark) return null;
    return (
      letterTemplate.watermark.image_url ||
      letterTemplate.watermark.preview_url ||
      letterTemplate.watermark.file_url ||
      null
    );
  }, [letterTemplate?.watermark]);

  const letterheadPosition = useMemo(() => {
    if (activeLetterhead?.position === "header") return "header";
    return "background";
  }, [activeLetterhead?.position]);

  const letterBodyText = useMemo(() => {
    return displayLetter?.body_html || letterTemplate?.body_text || "";
  }, [displayLetter?.body_html, letterTemplate?.body_text]);

  const renderVariables = useMemo(() => {
    if (displayLetter?.body_html) return undefined;
    const normalized: Record<string, string> = {};
    Object.entries(displayLetter?.template_variables || {}).forEach(([key, value]) => {
      normalized[key] = value !== null && value !== undefined ? String(value) : "";
    });
    return {
      ...normalized,
      subject: displayLetter?.subject || "",
      issue_date: displayLetter?.issue_date || "",
      document_number: displayLetter?.full_outdoc_number || "",
      recipient_name: displayLetter?.external_recipient_name || "",
      recipient_address: displayLetter?.recipient_address || "",
    };
  }, [
    displayLetter?.body_html,
    displayLetter?.template_variables,
    displayLetter?.subject,
    displayLetter?.issue_date,
    displayLetter?.full_outdoc_number,
    displayLetter?.external_recipient_name,
    displayLetter?.recipient_address,
  ]);

  // Fetch attachments
  const { data: files = [] } = useQuery<Array<{
    id: string;
    original_name: string;
    size_bytes?: number | null;
    version: number;
    mime_type?: string;
  }>>({
    queryKey: ["dms", "files", "outgoing", displayLetter?.id],
    queryFn: async () => {
      if (!displayLetter?.id) return [];
      const result = await dmsApi.files.list({ owner_type: "outgoing", owner_id: displayLetter.id });
      return Array.isArray(result) ? result : [];
    },
    enabled: open && !!displayLetter?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const renderLetterPreview = useCallback(async () => {
    if (!letterTemplate) return;
    const renderId = ++letterRenderIdRef.current;
    setLetterPreviewLoading(true);
    setLetterPreviewError(null);
    try {
      const dataUrl = await renderLetterToDataUrl(letterTemplate, {
        variables: renderVariables,
        bodyText: letterBodyText,
        letterheadImage,
        letterheadPosition,
        watermarkImage,
        scale: 2,
        mimeType: "image/jpeg",
        quality: 0.95,
        direction: isRTL ? "rtl" : "ltr",
      });
      if (renderId === letterRenderIdRef.current) {
        setLetterPreviewUrl(dataUrl);
      }
    } catch (error: any) {
      if (renderId === letterRenderIdRef.current) {
        setLetterPreviewError(error?.message || "Failed to render preview");
        setLetterPreviewUrl(null);
      }
    } finally {
      if (renderId === letterRenderIdRef.current) {
        setLetterPreviewLoading(false);
      }
    }
  }, [
    letterTemplate,
    renderVariables,
    letterBodyText,
    letterheadImage,
    letterheadPosition,
    watermarkImage,
    isRTL,
  ]);

  useEffect(() => {
    if (!open || !letterTemplate) {
      letterRenderIdRef.current += 1;
      setLetterPreviewUrl(null);
      setLetterPreviewError(null);
      setLetterPreviewLoading(false);
      return;
    }
    renderLetterPreview();
  }, [open, letterTemplate, renderLetterPreview]);

  const isImageFile = (mimeType?: string) => {
    return mimeType?.startsWith('image/') ?? false;
  };

  const isPdfFile = (mimeType?: string) => {
    return mimeType === 'application/pdf';
  };

  const canPreview = (mimeType?: string) => {
    return isImageFile(mimeType) || isPdfFile(mimeType);
  };

  const handlePreview = async (file: { id: string; original_name: string; mime_type?: string }) => {
    try {
      setFilePreviewLoading(true);
      if (previewUrlRef.current) {
        window.URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      const result = await dmsApi.files.download(file.id);
      const blob = result instanceof Blob ? result : (result as any).blob;
      const url = window.URL.createObjectURL(blob);
      previewUrlRef.current = url;
      setPreviewFile({
        id: file.id,
        name: file.original_name,
        mime_type: file.mime_type,
        url: url,
      });
    } catch (error: any) {
      showToast.error(error.message || 'Failed to load preview');
    } finally {
      setFilePreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    if (previewUrlRef.current) {
      window.URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewFile(null);
  };

  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      const result = await dmsApi.files.download(fileId);
      const blob = result instanceof Blob ? result : (result as any).blob;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast.success('File downloaded successfully');
    } catch (error: any) {
      showToast.error(error.message || 'Failed to download file');
    }
  };

  const getRenderedImage = useCallback(async () => {
    if (!letterTemplate) {
      throw new Error("No template available for this letter.");
    }
    if (letterPreviewUrl && !letterPreviewLoading) {
      return letterPreviewUrl;
    }
    return renderLetterToDataUrl(letterTemplate, {
      variables: renderVariables,
      bodyText: letterBodyText,
      letterheadImage,
      letterheadPosition,
      watermarkImage,
      scale: 2,
      mimeType: "image/jpeg",
      quality: 0.95,
      direction: isRTL ? "rtl" : "ltr",
    });
  }, [
    letterTemplate,
    letterPreviewUrl,
    letterPreviewLoading,
    renderVariables,
    letterBodyText,
    letterheadImage,
    letterheadPosition,
    watermarkImage,
    isRTL,
  ]);

  const handleDownloadImage = async () => {
    if (!letterTemplate) {
      showToast.error("No template available for this letter.");
      return;
    }
    try {
      const dataUrl = await getRenderedImage();
      const blob = dataUrlToBlob(dataUrl);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${displayLetter?.full_outdoc_number || "letter"}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      showToast.error(error.message || "Failed to download image");
    }
  };

  const handleDownloadPdf = async () => {
    if (!letterTemplate) {
      showToast.error("No template available for this letter.");
      return;
    }
    try {
      const imageDataUrl = await getRenderedImage();
      const blob = await generateLetterPdf(letterTemplate, {
        imageDataUrl,
        variables: renderVariables,
        bodyText: letterBodyText,
        letterheadImage,
        letterheadPosition,
        watermarkImage,
        direction: isRTL ? "rtl" : "ltr",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${displayLetter?.full_outdoc_number || "letter"}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast.success("PDF downloaded successfully");
    } catch (error: any) {
      showToast.error(error.message || "Failed to download PDF");
    }
  };

  const handlePrint = async () => {
    if (!letterTemplate) {
      showToast.error("No template available for this letter.");
      return;
    }
    try {
      const imageDataUrl = await getRenderedImage();
      const blob = await generateLetterPdf(letterTemplate, {
        imageDataUrl,
        variables: renderVariables,
        bodyText: letterBodyText,
        letterheadImage,
        letterheadPosition,
        watermarkImage,
        direction: isRTL ? "rtl" : "ltr",
      });
      const url = window.URL.createObjectURL(blob);

      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.src = url;

      document.body.appendChild(iframe);

      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.print();
            setTimeout(() => {
              document.body.removeChild(iframe);
              window.URL.revokeObjectURL(url);
            }, 1000);
          } catch (error) {
            window.open(url, "_blank");
            document.body.removeChild(iframe);
            window.URL.revokeObjectURL(url);
          }
        }, 500);
      };

      setTimeout(() => {
        if (document.body.contains(iframe)) {
          try {
            iframe.contentWindow?.print();
            setTimeout(() => {
              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
              }
              window.URL.revokeObjectURL(url);
            }, 1000);
          } catch (error) {
            window.open(url, "_blank");
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
            window.URL.revokeObjectURL(url);
          }
        }
      }, 2000);
    } catch (error: any) {
      showToast.error(error.message || "Failed to print letter");
    }
  };

  // Get recipient display name
  const getRecipientName = (): string => {
    if (!displayLetter) return "";
    if (displayLetter.recipient_type === "external") {
      return displayLetter.external_recipient_name || "External Recipient";
    }
    return displayLetter.recipient_type || "Unknown";
  };

  if (!displayLetter) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        className="w-full sm:max-w-3xl overflow-y-auto"
        side={isRTL ? 'left' : 'right'}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <SheetHeader>
          <SheetTitle className="text-xl">{displayLetter.subject || t("dms.issueLetter.letterDetails.title") || "Letter Details"}</SheetTitle>
          <div className="text-sm text-muted-foreground">
            <div className="flex items-center gap-2 mt-2">
              <DocumentNumberBadge value={displayLetter.full_outdoc_number} type="outgoing" />
              <SecurityBadge level={displayLetter.security_level_key} />
            </div>
          </div>
        </SheetHeader>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          <Tabs defaultValue="details" className="mt-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">
                {t("dms.issueLetter.letterDetails.details") || "Details"}
              </TabsTrigger>
              <TabsTrigger value="preview">
                {t("dms.issueLetter.letterDetails.preview") || "Preview"}
              </TabsTrigger>
              <TabsTrigger value="attachments">
                {t("dms.issueLetter.letterDetails.attachments") || "Attachments"} ({files.length})
              </TabsTrigger>
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-4 mt-4">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label className="text-muted-foreground">{t("dms.issueLetter.letterDetails.documentNumber") || "Document Number"}</Label>
                      <p className="font-medium">{displayLetter.full_outdoc_number || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">{t("dms.issueLetter.letterDetails.issueDate") || "Issue Date"}</Label>
                      <p className="font-medium">{formatDate(displayLetter.issue_date)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">{t("dms.issueLetter.letterDetails.subject") || "Subject"}</Label>
                      <p className="font-medium">{displayLetter.subject || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">{t("dms.issueLetter.letterDetails.status") || "Status"}</Label>
                      <p className="font-medium capitalize">{displayLetter.status || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">{t("dms.issueLetter.letterDetails.recipient") || "Recipient"}</Label>
                      <div className="space-y-1">
                        <p className="font-medium">{getRecipientName()}</p>
                        <Badge variant="outline" className="text-xs">
                          {displayLetter.recipient_type || "Unknown"}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">{t("dms.issueLetter.letterDetails.securityLevel") || "Security Level"}</Label>
                      <div className="mt-1">
                        <SecurityBadge level={displayLetter.security_level_key} />
                      </div>
                    </div>
                    {displayLetter.recipient_type === "external" && displayLetter.recipient_address && (
                      <div className="md:col-span-2">
                        <Label className="text-muted-foreground">{t("dms.issueLetter.letterDetails.address") || "Address"}</Label>
                        <p className="font-medium">{displayLetter.recipient_address}</p>
                      </div>
                    )}
                    {displayLetter.template && (
                      <div className="md:col-span-2">
                        <Label className="text-muted-foreground">{t("dms.issueLetter.letterDetails.template") || "Template"}</Label>
                        <p className="font-medium">{displayLetter.template.name}</p>
                      </div>
                    )}
                  </div>

                  {displayLetter.description && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-muted-foreground mb-2 block">{t("dms.issueLetter.letterDetails.description") || "Description"}</Label>
                        <div
                          className="prose prose-sm max-w-none p-4 border rounded-lg bg-muted/50"
                          dangerouslySetInnerHTML={{ __html: displayLetter.description }}
                        />
                      </div>
                    </>
                  )}

                  {letterTemplate && (
                    <>
                      <Separator />
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={handleDownloadPdf} variant="outline" className="flex-1 min-w-[160px]">
                          <Download className="h-4 w-4 mr-2" />
                          {t("dms.issueLetter.letterDetails.downloadPdf") || "Download PDF"}
                        </Button>
                        <Button onClick={handleDownloadImage} variant="outline" className="flex-1 min-w-[160px]">
                          <ImageIcon className="h-4 w-4 mr-2" />
                          {t("dms.issueLetter.letterDetails.downloadImage") || "Download Image"}
                        </Button>
                        <Button onClick={handlePrint} variant="outline" className="flex-1 min-w-[160px]">
                          <Printer className="h-4 w-4 mr-2" />
                          {t("dms.issueLetter.letterDetails.print") || "Print"}
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Preview Tab */}
            <TabsContent value="preview" className="space-y-4 mt-4">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button onClick={handleDownloadImage} variant="outline" size="sm" disabled={!letterTemplate}>
                      <ImageIcon className="h-4 w-4 mr-2" />
                      {t("dms.issueLetter.letterDetails.downloadImage") || "Download Image"}
                    </Button>
                    <Button onClick={handlePrint} variant="outline" size="sm" disabled={!letterTemplate}>
                      <Printer className="h-4 w-4 mr-2" />
                      {t("dms.issueLetter.letterDetails.print") || "Print"}
                    </Button>
                  </div>

                  {letterPreviewLoading ? (
                    <div className="border rounded-lg bg-muted/50 p-8 text-center min-h-[300px] flex items-center justify-center">
                      <div className="space-y-2">
                        <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Generating preview...</p>
                      </div>
                    </div>
                  ) : letterPreviewError ? (
                    <div className="border rounded-lg p-8 text-center text-muted-foreground bg-red-50">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-destructive" />
                      <p className="text-sm text-destructive">{letterPreviewError}</p>
                    </div>
                  ) : letterPreviewUrl ? (
                    <div className="border rounded-lg bg-white overflow-hidden">
                      <img
                        src={letterPreviewUrl}
                        alt="Letter preview"
                        className="w-full h-auto object-contain"
                      />
                    </div>
                  ) : (
                    <div className="border rounded-lg p-8 text-center text-muted-foreground bg-muted/50">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>{t("dms.issueLetter.letterDetails.noPreview") || "No preview available"}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Attachments Tab */}
            <TabsContent value="attachments" className="space-y-4 mt-4">
              {files.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {files.map((file: any) => (
                    <AttachmentCard
                      key={file.id}
                      file={file}
                      onPreview={handlePreview}
                      onDownload={handleDownload}
                      canPreview={canPreview}
                      isImageFile={isImageFile}
                      isPdfFile={isPdfFile}
                      previewLoading={filePreviewLoading}
                    />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-12 text-muted-foreground">
                      <File className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>{t("dms.issueLetter.letterDetails.noAttachments") || "No attachments found"}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Preview Dialog */}
        <Dialog open={!!previewFile} onOpenChange={(open) => !open && handleClosePreview()}>
          <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-full overflow-hidden p-0">
            <DialogHeader className="sr-only">
              <DialogTitle>{previewFile?.name || 'File Preview'}</DialogTitle>
            </DialogHeader>
            {previewFile && (
              <>
                <div className="flex items-center justify-between p-4 border-b bg-background">
                  <DialogTitle className="text-lg font-semibold truncate flex-1 mr-4">{previewFile.name}</DialogTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClosePreview}
                    className="shrink-0"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex-1 overflow-auto p-6 bg-muted/30" style={{ height: 'calc(95vh - 73px)' }}>
                  {filePreviewLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                        <p className="text-sm text-muted-foreground">Loading preview...</p>
                      </div>
                    </div>
                  ) : previewFile.url && (
                    <div className="flex items-center justify-center h-full w-full">
                      {isImageFile(previewFile.mime_type) ? (
                        <img
                          src={previewFile.url}
                          alt={previewFile.name}
                          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                          style={{ maxHeight: 'calc(95vh - 120px)' }}
                        />
                      ) : isPdfFile(previewFile.mime_type) ? (
                        <object
                          data={previewFile.url}
                          type="application/pdf"
                          className="w-full border-0 rounded-lg shadow-2xl"
                          style={{ height: 'calc(95vh - 120px)' }}
                          title={previewFile.name}
                        >
                          <div className="flex items-center justify-center h-full text-center p-8">
                            <div>
                              <p className="text-sm text-muted-foreground mb-4">
                                PDF preview is not available. Please download the file to view it.
                              </p>
                              <Button
                                variant="outline"
                                onClick={() => handleDownload(previewFile.id, previewFile.name)}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Download PDF
                              </Button>
                            </div>
                          </div>
                        </object>
                      ) : (
                        <div className="text-center">
                          <File className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                          <p className="text-sm text-muted-foreground">Preview not available for this file type</p>
                          <Button
                            variant="outline"
                            className="mt-4"
                            onClick={() => handleDownload(previewFile.id, previewFile.name)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download File
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}
