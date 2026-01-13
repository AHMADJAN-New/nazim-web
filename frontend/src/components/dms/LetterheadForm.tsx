import { zodResolver } from "@hookform/resolvers/zod";
import { Upload, X, Image as ImageIcon, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useLetterTypes } from "@/hooks/useLetterTypes";
import { useLanguage } from "@/hooks/useLanguage";
import { letterheadSchema, type LetterheadFormData } from "@/lib/validations/dms";
import type { Letterhead } from "@/types/dms";

interface LetterheadFormProps {
  letterhead?: Letterhead | null;
  onSubmit: (data: LetterheadFormData & { file?: File }) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function LetterheadForm({
  letterhead,
  onSubmit,
  onCancel,
  isLoading = false,
}: LetterheadFormProps) {
  const { t } = useLanguage();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<"pdf" | "image" | "html">("image");

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<LetterheadFormData & { file?: File }>({
    resolver: zodResolver(letterheadSchema),
    defaultValues: {
      name: letterhead?.name || "",
      file_type: letterhead?.file_type || "image",
      letterhead_type: letterhead?.letterhead_type || "background",
      letter_type: letterhead?.letter_type || null,
      active: letterhead?.active ?? true,
    },
  });

  const watchedFile = watch("file");
  const watchedFileType = watch("file_type");

  // Fetch letter types for selector
  const { data: letterTypes = [], isLoading: letterTypesLoading } = useLetterTypes(true);

  // Update file type when file changes
  useEffect(() => {
    if (watchedFile instanceof File) {
      const mimeType = watchedFile.type;
      if (mimeType === "application/pdf") {
        setFileType("pdf");
        setValue("file_type", "pdf");
      } else if (mimeType.startsWith("image/")) {
        setFileType("image");
        setValue("file_type", "image");
      } else {
        setFileType("image");
        setValue("file_type", "image");
      }

      // Create preview for images
      if (mimeType.startsWith("image/")) {
        const url = URL.createObjectURL(watchedFile);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
      } else {
        setPreviewUrl(null);
      }
    } else if (letterhead?.image_url) {
      setPreviewUrl(letterhead.image_url);
    } else if (letterhead?.preview_url) {
      setPreviewUrl(letterhead.preview_url);
    } else if (letterhead?.file_url && letterhead.file_type === "image") {
      // Use file_url for preview
      setPreviewUrl(letterhead.file_url);
    } else if (letterhead?.file_path && letterhead.file_type === "image") {
      // Fallback: construct URL from file_path if file_url not available
      const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : 'http://localhost:8000/api');
      setPreviewUrl(`${apiUrl}/dms/letterheads/${letterhead.id}/serve`);
    }
  }, [watchedFile, letterhead, setValue]);

  // Update file type display
  useEffect(() => {
    if (watchedFileType) {
      setFileType(watchedFileType);
    }
  }, [watchedFileType]);

  const handleFormSubmit = (data: LetterheadFormData & { file?: File }) => {
    onSubmit(data);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setValue("file", file, { shouldValidate: true });
    }
  };

  const removeFile = () => {
    setValue("file", undefined, { shouldValidate: true });
    setPreviewUrl(letterhead?.image_url || letterhead?.preview_url || null);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">
          {t("dms.letterheadForm.nameLabel") || "Name"} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          {...register("name")}
          placeholder={t("dms.letterheadForm.namePlaceholder") || "Main Portrait Letterhead"}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="file">
          {t("dms.letterheadForm.fileLabel") || "File"} {!letterhead && <span className="text-destructive">*</span>}
        </Label>
        {!watchedFile && !letterhead?.file_path ? (
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
            <Input
              id="file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={handleFileChange}
              className="hidden"
            />
            <Label
              htmlFor="file"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {t("dms.letterheadForm.uploadHint") || "Click to upload or drag and drop"}
              </span>
              <span className="text-xs text-muted-foreground">
                {t("dms.letterheadForm.fileTypesHint") || "PDF, JPG, PNG, WEBP (Max 10MB)"}
              </span>
            </Label>
          </div>
        ) : (
          <div className="space-y-2">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {fileType === "pdf" ? (
                      <FileText className="h-8 w-8 text-red-500" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-blue-500" />
                    )}
                    <div>
                      <p className="font-medium">
                        {watchedFile?.name || letterhead?.name || "File"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {fileType.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeFile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
            {previewUrl && (
              <div className="border rounded-lg overflow-hidden">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-auto max-h-64 object-contain"
                />
              </div>
            )}
            {!letterhead && (
              <Input
                id="file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={handleFileChange}
                className="mt-2"
              />
            )}
          </div>
        )}
        {errors.file && (
          <p className="text-sm text-destructive">{errors.file.message}</p>
        )}
      </div>

      <div className="space-y-4">
        <div className="space-y-3">
          <Label>{t("dms.letterheadForm.letterheadTypeLabel") || "Letterhead Type"} <span className="text-destructive">*</span></Label>
          <Controller
            name="letterhead_type"
            control={control}
            render={({ field }) => (
              <RadioGroup
                value={field.value || "background"}
                onValueChange={field.onChange}
                className="flex flex-col space-y-2"
              >
                <div className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-muted/50">
                  <RadioGroupItem value="background" id="background" />
                  <div className="flex-1">
                    <Label htmlFor="background" className="font-medium cursor-pointer">
                      {t("dms.letterheadForm.backgroundLabel") || "Background"}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {t("dms.letterheadForm.backgroundDescription") || "Full-page background that appears on all pages"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-muted/50">
                  <RadioGroupItem value="watermark" id="watermark" />
                  <div className="flex-1">
                    <Label htmlFor="watermark" className="font-medium cursor-pointer">
                      {t("dms.letterheadForm.watermarkLabel") || "Watermark"}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {t("dms.letterheadForm.watermarkDescription") || "Centered overlay with low opacity behind text"}
                    </p>
                  </div>
                </div>
              </RadioGroup>
            )}
          />
          {errors.letterhead_type && (
            <p className="text-sm text-destructive">{errors.letterhead_type.message}</p>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="file_type">{t("dms.letterheadForm.fileTypeLabel") || "File Type"}</Label>
            <Controller
              name="file_type"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value || "image"}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger id="file_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="html">HTML</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="letter_type">{t("dms.letterheadForm.letterTypeOptionalLabel") || "Letter Type (Optional)"}</Label>
            <Controller
              name="letter_type"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value || "__none__"}
                  onValueChange={(value) =>
                    field.onChange(value === "__none__" ? null : value)
                  }
                  disabled={letterTypesLoading}
                >
                  <SelectTrigger id="letter_type">
                    <SelectValue placeholder={letterTypesLoading ? (t("common.loading") || "Loading...") : (t("dms.letterheadForm.selectLetterType") || "Select letter type")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {letterTypes.map((lt) => (
                      <SelectItem key={lt.id} value={lt.key}>
                        {lt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Controller
          name="active"
          control={control}
          render={({ field }) => (
            <Switch
              id="active"
              checked={field.value ?? true}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <Label htmlFor="active">{t("dms.letterheadForm.activeLabel") || "Active"}</Label>
      </div>

      <div className="flex items-center justify-end gap-2 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("common.cancel") || "Cancel"}
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (t("common.saving") || "Saving...") : letterhead ? (t("dms.letterheadForm.update") || "Update") : (t("dms.letterheadForm.create") || "Create")}
        </Button>
      </div>
    </form>
  );
}
