import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { letterTemplateSchema, type LetterTemplateFormData } from "@/lib/validations/dms";
import { dmsApi } from "@/lib/api/client";
import { VariableEditor } from "./VariableEditor";
import { RichTextEditor } from "./RichTextEditor";
import { LetterTemplatePositioningEditor, type PositionedBlock } from "./LetterTemplatePositioningEditor";
import type { LetterTemplate, TemplateVariable, Letterhead } from "@/types/dms";
import { Loader2, Eye, Move, FileText } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<"content" | "positioning">("content");
  const [letterheadBase64, setLetterheadBase64] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<LetterTemplateFormData>({
    resolver: zodResolver(letterTemplateSchema),
    defaultValues: {
      name: template?.name || "",
      category: template?.category || "general",
      letterhead_id: template?.letterhead_id || null,
      letter_type: template?.letter_type || null,
      body_html: template?.body_html || "",
      template_file_path: template?.template_file_path || null,
      template_file_type: template?.template_file_type || "html",
      variables: (template?.variables as TemplateVariable[]) || [],
      header_structure: template?.header_structure || null,
      field_positions: (template?.field_positions as PositionedBlock[]) || [],
      allow_edit_body: template?.allow_edit_body ?? false,
      default_security_level_key: template?.default_security_level_key || null,
      page_layout: template?.page_layout || "A4_portrait",
      is_mass_template: template?.is_mass_template ?? false,
      active: template?.active ?? true,
    },
  });

  // Fetch letterheads for selector
  const { data: letterheads = [], isLoading: letterheadsLoading } = useQuery({
    queryKey: ["dms", "letterheads"],
    queryFn: () => dmsApi.letterheads.list({ active: true }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Fetch letter types for selector
  const { data: letterTypes = [], isLoading: letterTypesLoading } = useLetterTypes(true);

  const variables = watch("variables") || [];
  const fieldPositions = watch("field_positions") || [];
  const selectedLetterheadId = watch("letterhead_id");
  const pageLayout = watch("page_layout") || "A4_portrait";
  const selectedLetterhead = letterheads.find((lh: Letterhead) => lh.id === selectedLetterheadId);

  // Fetch letterhead base64 for positioning editor
  const { mutate: fetchLetterheadBase64 } = useMutation({
    mutationFn: async (letterheadId: string) => {
      const response = await dmsApi.letterheads.preview(letterheadId);
      return response;
    },
    onSuccess: (data: any) => {
      // The preview endpoint now returns base64 data
      if (data.letterhead_base64) {
        setLetterheadBase64(data.letterhead_base64);
      } else if (data.file_url) {
        // Fallback to file URL if base64 not available
        setLetterheadBase64(data.file_url);
      }
    },
  });

  // Fetch letterhead when selected
  useEffect(() => {
    if (selectedLetterheadId) {
      fetchLetterheadBase64(selectedLetterheadId);
    } else {
      setLetterheadBase64(null);
    }
  }, [selectedLetterheadId, fetchLetterheadBase64]);

  const handleFormSubmit = (data: LetterTemplateFormData) => {
    onSubmit(data);
  };

  const handleVariablesChange = (newVariables: TemplateVariable[]) => {
    setValue("variables", newVariables, { shouldValidate: true });
  };

  const handleFieldPositionsChange = (newPositions: PositionedBlock[]) => {
    setValue("field_positions", newPositions, { shouldValidate: true });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Basic Information</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="Template name"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

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
            <Label htmlFor="letter_type">Letter Type</Label>
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
                    {letterTypes.map((lt: any) => (
                      <SelectItem key={lt.id} value={lt.key}>
                        {lt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
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
      </div>

      {/* Letterhead Selection */}
      <div className="space-y-2">
        <Label htmlFor="letterhead_id">Letterhead</Label>
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
                <SelectValue placeholder={letterheadsLoading ? "Loading..." : "Select letterhead"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {letterheads.map((letterhead: Letterhead) => (
                  <SelectItem key={letterhead.id} value={letterhead.id}>
                    {letterhead.name}
                    {letterhead.letter_type && ` (${letterhead.letter_type})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {selectedLetterhead && (
          <Card className="mt-2">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Selected:</span>
                <span>{selectedLetterhead.name}</span>
                {selectedLetterhead.file_type && (
                  <span className="text-muted-foreground">
                    ({selectedLetterhead.file_type.toUpperCase()})
                  </span>
                )}
                {selectedLetterhead.position && (
                  <span className="text-muted-foreground">
                    - Position: {selectedLetterhead.position}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Security Level */}
      <div className="space-y-2">
        <Label htmlFor="default_security_level_key">Default Security Level</Label>
        <Input
          id="default_security_level_key"
          {...register("default_security_level_key")}
          placeholder="e.g., public, confidential"
        />
      </div>

      {/* Template Variables */}
      <div className="space-y-4">
        <VariableEditor
          variables={variables as TemplateVariable[]}
          onChange={handleVariablesChange}
        />
      </div>

      {/* Content and Positioning Tabs */}
      <div className="space-y-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "content" | "positioning")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="content" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Body Content
            </TabsTrigger>
            <TabsTrigger value="positioning" className="flex items-center gap-2">
              <Move className="h-4 w-4" />
              Positioning Editor
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-4 mt-4">
            {/* Body HTML Editor */}
            <div className="space-y-2">
              <Label>Body HTML</Label>
              <Controller
                name="body_html"
                control={control}
                render={({ field }) => (
                  <RichTextEditor
                    value={field.value || ""}
                    onChange={field.onChange}
                    placeholder="Enter template body. Use {{variable_name}} for variables."
                  />
                )}
              />
              <p className="text-xs text-muted-foreground">
                Use {"{{variable_name}}"} to insert variables defined above.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="positioning" className="mt-4">
            <div className="border rounded-lg p-4 bg-muted/30">
              <LetterTemplatePositioningEditor
                letterheadBase64={letterheadBase64}
                letterheadFileType={selectedLetterhead?.file_type}
                letterheadPosition={selectedLetterhead?.position}
                pageLayout={pageLayout as "A4_portrait" | "A4_landscape"}
                fieldPositions={fieldPositions as PositionedBlock[]}
                variables={variables as TemplateVariable[]}
                onChange={handleFieldPositionsChange}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Drag and resize text blocks on the letterhead. Positioned blocks appear exactly where placed in the final PDF.
            </p>
          </TabsContent>
        </Tabs>
      </div>

      {/* Options */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Options</h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Controller
              name="allow_edit_body"
              control={control}
              render={({ field }) => (
                <Switch
                  id="allow_edit_body"
                  checked={field.value ?? false}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Label htmlFor="allow_edit_body">Allow editing body when issuing letter</Label>
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
  );
}
