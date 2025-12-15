import { useState, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { letterTemplateSchema, type LetterTemplateFormData } from "@/lib/validations/dms";
import { dmsApi } from "@/lib/api/client";
import { FieldPlaceholderSelector } from "./FieldPlaceholderSelector";
import type { LetterTemplate } from "@/types/dms";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useLetterTypes } from "@/hooks/useLetterTypes";

interface TemplateFormProps {
  template?: LetterTemplate | null;
  onSubmit: (data: LetterTemplateFormData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

const categoryOptions = [
  { value: "student", label: "Student" },
  { value: "staff", label: "Staff" },
  { value: "applicant", label: "Applicant" },
  { value: "general", label: "General" },
  { value: "announcement", label: "Announcement" },
];

const pageLayoutOptions = [
  { value: "A4_portrait", label: "A4 Portrait" },
  { value: "A4_landscape", label: "A4 Landscape" },
];

export function TemplateForm({
  template,
  onSubmit,
  onCancel,
  isLoading = false,
}: TemplateFormProps) {
  const [showPreview, setShowPreview] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LetterTemplateFormData>({
    resolver: zodResolver(letterTemplateSchema),
    defaultValues: {
      name: template?.name || "",
      category: template?.category || "general",
      letterhead_id: template?.letterhead_id || null,
      watermark_id: template?.watermark_id || null,
      letter_type: template?.letter_type || null,
      body_text: template?.body_text || "",
      supports_tables: template?.supports_tables ?? false,
      table_structure: template?.table_structure || null,
      default_security_level_key: template?.default_security_level_key || null,
      page_layout: template?.page_layout || "A4_portrait",
      repeat_letterhead_on_pages: template?.repeat_letterhead_on_pages ?? true,
      is_mass_template: template?.is_mass_template ?? false,
      active: template?.active ?? true,
    },
  });

  // Fetch all letterheads
  const { data: allLetterheads = [], isLoading: letterheadsLoading } = useQuery({
    queryKey: ["dms", "letterheads"],
    queryFn: () => dmsApi.letterheads.list({ active: true }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Filter letterheads by type
  const backgroundLetterheads = allLetterheads.filter(lh => lh.letterhead_type === 'background' || !lh.letterhead_type);
  const watermarkLetterheads = allLetterheads.filter(lh => lh.letterhead_type === 'watermark');

  // Fetch letter types for selector
  const { data: letterTypes = [], isLoading: letterTypesLoading } = useLetterTypes(true);

  // Watch form values for live preview
  const category = watch("category");
  const selectedLetterheadId = watch("letterhead_id");
  const selectedWatermarkId = watch("watermark_id");
  const bodyText = watch("body_text");
  const repeatLetterhead = watch("repeat_letterhead_on_pages");

  const selectedLetterhead = allLetterheads.find((lh) => lh.id === selectedLetterheadId);
  const selectedWatermark = allLetterheads.find((lh) => lh.id === selectedWatermarkId);

  const handleFormSubmit = (data: LetterTemplateFormData) => {
    onSubmit(data);
  };

  // Insert field placeholder at cursor position
  const handleInsertField = (placeholder: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = bodyText || "";

    const newValue = currentValue.substring(0, start) + placeholder + currentValue.substring(end);

    setValue("body_text", newValue, { shouldValidate: true });

    // Set cursor position after inserted text
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
    }, 0);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Form Section */}
      <div className="space-y-6">
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>

            <div className="space-y-2">
              <Label htmlFor="name">
                Template Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="e.g., Student Enrollment Confirmation"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">
                  Category <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="category"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.category && (
                  <p className="text-sm text-destructive">{errors.category.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="page_layout">Page Layout</Label>
                <Controller
                  name="page_layout"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || "A4_portrait"} onValueChange={field.onChange}>
                      <SelectTrigger id="page_layout">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {pageLayoutOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="letter_type">Letter Type (Optional)</Label>
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
                      <SelectValue placeholder={letterTypesLoading ? "Loading..." : "Select letter type"} />
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

          <Separator />

          {/* Letterhead & Watermark */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Letterhead & Watermark</h3>

            <div className="space-y-2">
              <Label htmlFor="letterhead_id">Background Letterhead</Label>
              <Controller
                name="letterhead_id"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || "__none__"}
                    onValueChange={(value) => field.onChange(value === "__none__" ? null : value)}
                    disabled={letterheadsLoading}
                  >
                    <SelectTrigger id="letterhead_id">
                      <SelectValue placeholder={letterheadsLoading ? "Loading..." : "Select background"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {backgroundLetterheads.map((letterhead) => (
                        <SelectItem key={letterhead.id} value={letterhead.id}>
                          {letterhead.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-xs text-muted-foreground">
                Background image/PDF that appears on all pages
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="watermark_id">Watermark (Optional)</Label>
              <Controller
                name="watermark_id"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || "__none__"}
                    onValueChange={(value) => field.onChange(value === "__none__" ? null : value)}
                    disabled={letterheadsLoading}
                  >
                    <SelectTrigger id="watermark_id">
                      <SelectValue placeholder={letterheadsLoading ? "Loading..." : "Select watermark"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {watermarkLetterheads.map((watermark) => (
                        <SelectItem key={watermark.id} value={watermark.id}>
                          {watermark.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-xs text-muted-foreground">
                Centered overlay with low opacity behind text
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Controller
                name="repeat_letterhead_on_pages"
                control={control}
                render={({ field }) => (
                  <Switch
                    id="repeat_letterhead_on_pages"
                    checked={field.value ?? true}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label htmlFor="repeat_letterhead_on_pages">Repeat letterhead on all pages</Label>
            </div>
          </div>

          <Separator />

          {/* Body Text */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Letter Body</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Hide Preview
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Show Preview
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="body_text">
                Body Text <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="body_text"
                {...register("body_text")}
                ref={(e) => {
                  register("body_text").ref(e);
                  (textareaRef as any).current = e;
                }}
                rows={12}
                dir="rtl"
                className="font-mono text-right"
                placeholder="اداره تصدیق کوي چې {{student_name}} د {{father_name}} زوی..."
              />
              <p className="text-xs text-muted-foreground">
                Type your letter text. Use the field selector below to insert database fields.
              </p>
            </div>

            {/* Field Placeholder Selector */}
            <Card>
              <CardContent className="p-4">
                <FieldPlaceholderSelector
                  recipientType={category}
                  onInsert={handleInsertField}
                />
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Options */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Options</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Controller
                  name="supports_tables"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      id="supports_tables"
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="supports_tables">Include table structure</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Controller
                  name="is_mass_template"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      id="is_mass_template"
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="is_mass_template">Mass template (for announcements)</Label>
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
                <Label htmlFor="active">Active</Label>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : template ? (
                "Update Template"
              ) : (
                "Create Template"
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Live Preview Section */}
      {showPreview && (
        <div className="space-y-4 lg:sticky lg:top-4 lg:h-fit">
          <h3 className="text-lg font-semibold">Live Preview</h3>
          <Card className="border-2">
            <CardContent className="p-0">
              <div
                className="relative w-full bg-white"
                style={{
                  aspectRatio: pageLayoutOptions.find(p => p.value === watch("page_layout"))?.value.includes("landscape") ? "297/210" : "210/297",
                  minHeight: "500px",
                }}
              >
                {/* Letterhead Background */}
                {selectedLetterhead && selectedLetterhead.file_path && (
                  <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{
                      backgroundImage: `url(${selectedLetterhead.file_path})`,
                      opacity: 0.95,
                    }}
                  />
                )}

                {/* Watermark */}
                {selectedWatermark && selectedWatermark.file_path && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <img
                      src={selectedWatermark.file_path}
                      alt="Watermark"
                      className="max-w-[60%] max-h-[60%] object-contain"
                      style={{ opacity: 0.08 }}
                    />
                  </div>
                )}

                {/* Content Text */}
                <div
                  className="relative z-10 p-12 text-right"
                  dir="rtl"
                  style={{
                    fontFamily: "Arial, sans-serif",
                    fontSize: "14px",
                    lineHeight: "1.8",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {bodyText || (
                    <p className="text-muted-foreground italic text-center mt-20">
                      Your letter text will appear here as you type...
                    </p>
                  )}
                </div>

                {/* Repeat indicator */}
                {repeatLetterhead && selectedLetterhead && (
                  <div className="absolute bottom-2 right-2 text-xs bg-black/50 text-white px-2 py-1 rounded">
                    Letterhead repeats on all pages
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground text-center">
            This preview shows how your letter will look with the selected letterhead and watermark
          </p>
        </div>
      )}
    </div>
  );
}
