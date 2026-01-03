import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, X, Image as ImageIcon, File, Loader2 } from "lucide-react";
import { useState, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { dmsApi } from "@/lib/api/client";
import { compressImage, formatFileSize, isImageFile, getImagePreview, type CompressionOptions } from "@/lib/imageCompression";
import { showToast } from "@/lib/toast";

interface ImageFileUploaderProps {
  ownerType: "incoming" | "outgoing";
  ownerId: string;
  fileType?: string;
  maxFiles?: number;
  compressionOptions?: CompressionOptions;
}

interface UploadedFile {
  id: string;
  original_name: string;
  mime_type: string;
  size_bytes?: number | null;
  file_type: string;
  version: number;
  created_at: string;
}

export function ImageFileUploader({
  ownerType,
  ownerId,
  fileType = "scan",
  maxFiles = 10,
  compressionOptions
}: ImageFileUploaderProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState<Record<string, number>>({});

  // Fetch existing files
  const { data: existingFiles = [] } = useQuery<UploadedFile[]>({
    queryKey: ["dms", "files", ownerType, ownerId],
    queryFn: () => dmsApi.files.list({ owner_type: ownerType, owner_id: ownerId }),
    enabled: !!ownerId,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      // Compress image if it's an image file
      let fileToUpload = file;

      if (isImageFile(file)) {
        setIsCompressing(true);
        setCompressionProgress(prev => ({ ...prev, [file.name]: 0 }));

        try {
          fileToUpload = await compressImage(file, compressionOptions);
          const originalSize = file.size;
          const compressedSize = fileToUpload.size;
          const reduction = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);

          if (import.meta.env.DEV) {
            console.log(`[ImageFileUploader] Compressed ${file.name}: ${formatFileSize(originalSize)} → ${formatFileSize(compressedSize)} (${reduction}% reduction)`);
          }
        } catch (error) {
          console.error('[ImageFileUploader] Compression failed:', error);
          // Continue with original file if compression fails
        } finally {
          setIsCompressing(false);
          setCompressionProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[file.name];
            return newProgress;
          });
        }
      }

      const formData = new FormData();
      formData.append("owner_type", ownerType);
      formData.append("owner_id", ownerId);
      formData.append("file_type", fileType);
      formData.append("file", fileToUpload);

      return dmsApi.files.upload(formData);
    },
    onSuccess: () => {
      showToast.success(t('toast.fileUploaded') || 'File uploaded successfully');
      queryClient.invalidateQueries({ queryKey: ["dms", "files", ownerType, ownerId] });
    },
    onError: (err: any) => {
      showToast.error(err.message || t('toast.fileUploadFailed') || 'Failed to upload file');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      // Note: Backend delete endpoint may need to be added
      // For now, we'll just remove from cache
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dms", "files", ownerType, ownerId] });
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (files.length === 0) return;

    // Validate file count
    const totalFiles = existingFiles.length + selectedFiles.length + files.length;
    if (totalFiles > maxFiles) {
      showToast.error(`Maximum ${maxFiles} files allowed. Please remove some files first.`);
      return;
    }

    // Validate and process files
    const validFiles: File[] = [];
    for (const file of files) {
      // Validate file size (max 10MB before compression)
      const MAX_SIZE = 10 * 1024 * 1024; // 10MB
      if (file.size > MAX_SIZE) {
        showToast.error(`${file.name} exceeds 10MB. Please select a smaller file.`);
        continue;
      }

      validFiles.push(file);

      // Generate preview for images
      if (isImageFile(file)) {
        try {
          const preview = await getImagePreview(file);
          setPreviews(prev => ({ ...prev, [file.name]: preview }));
        } catch (error) {
          console.error('Failed to generate preview:', error);
        }
      }
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);

    // Clear input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async (file: File) => {
    await uploadMutation.mutateAsync(file);
    // Remove from selected files after upload
    setSelectedFiles(prev => prev.filter(f => f !== file));
    setPreviews(prev => {
      const newPreviews = { ...prev };
      delete newPreviews[file.name];
      return newPreviews;
    });
  };

  const handleUploadAll = async () => {
    for (const file of selectedFiles) {
      await handleUpload(file);
    }
  };

  const removeSelectedFile = (file: File) => {
    setSelectedFiles(prev => prev.filter(f => f !== file));
    setPreviews(prev => {
      const newPreviews = { ...prev };
      delete newPreviews[file.name];
      return newPreviews;
    });
  };

  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      const { blob } = await dmsApi.files.download(fileId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showToast.success(t('toast.fileDownloaded') || 'File downloaded successfully');
    } catch (error) {
      showToast.error(t('toast.fileDownloadFailed') || 'Failed to download file');
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Upload Scanned Images / Files</Label>
        <div className="flex gap-2">
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx"
            multiple
            onChange={handleFileSelect}
            className="flex-1"
          />
          {selectedFiles.length > 0 && (
            <Button
              onClick={handleUploadAll}
              disabled={uploadMutation.isPending || isCompressing}
            >
              {isCompressing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Compressing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload All ({selectedFiles.length})
                </>
              )}
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Images will be automatically compressed. Max {maxFiles} files. Max 10MB per file.
        </p>
      </div>

      {/* Selected files preview */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Selected Files ({selectedFiles.length})</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {selectedFiles.map((file) => (
              <div
                key={file.name}
                className="relative border rounded-lg p-2 bg-muted/50"
              >
                {previews[file.name] ? (
                  <div className="space-y-1">
                    <img
                      src={previews[file.name]}
                      alt={file.name}
                      className="w-full h-24 object-cover rounded"
                    />
                    <p className="text-xs truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                      {isImageFile(file) && (
                        <span className="ml-1 text-blue-600">(will compress)</span>
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="w-full h-24 bg-muted flex items-center justify-center rounded">
                      <File className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-xs truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                )}
                <div className="flex gap-1 mt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs"
                    onClick={() => handleUpload(file)}
                    disabled={uploadMutation.isPending || isCompressing}
                  >
                    {uploadMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Upload className="h-3 w-3" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeSelectedFile(file)}
                    disabled={uploadMutation.isPending}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing files */}
      {existingFiles.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Uploaded Files ({existingFiles.length})</Label>
          <div className="space-y-1">
            {existingFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {file.mime_type?.startsWith('image/') ? (
                    <ImageIcon className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  ) : (
                    <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{file.original_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {file.size_bytes ? `${formatFileSize(file.size_bytes)} • ` : ''}v{file.version}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDownload(file.id, file.original_name)}
                >
                  Download
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

