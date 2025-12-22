import { useState, useEffect, useRef, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { letterTemplateSchema, type LetterTemplateFormData } from "@/lib/validations/dms";
import { dmsApi } from "@/lib/api/client";
import { FieldPlaceholderSelector } from "./FieldPlaceholderSelector";
import { TemplatePositionEditor } from "./TemplatePositionEditor";
import type { LetterTemplate, Letterhead, LetterTypeEntity, FieldPosition } from "@/types/dms";
import { Loader2, Eye, EyeOff, MapPin, RefreshCw } from "lucide-react";
import { useLetterTypes } from "@/hooks/useLetterTypes";
import { RichTextEditor, type RichTextEditorHandle } from "./RichTextEditor";
import { sanitize } from "@/lib/security-utils";

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
  const [previewMode, setPreviewMode] = useState<"designer" | "actual">("actual");
  const [actualPreviewHtml, setActualPreviewHtml] = useState<string>("");
  const [actualPreviewError, setActualPreviewError] = useState<string | null>(null);
  const [actualPreviewLoading, setActualPreviewLoading] = useState(false);
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [wmUrl, setWmUrl] = useState<string | null>(null);
  const [useBlocks, setUseBlocks] = useState(false);
  const [useRichText, setUseRichText] = useState(false);
  const [blocks, setBlocks] = useState<Array<{ id: string; text: string }>>([
    { id: "block-1", text: "" },
  ]);
  const [fontSize, setFontSize] = useState<number>(14);
  const [showPositionEditor, setShowPositionEditor] = useState(false);
  const [fieldPositions, setFieldPositions] = useState<Record<string, FieldPosition>>({});
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const [resizingBlockId, setResizingBlockId] = useState<string | null>(null);
  const [resizeHandle, setResizeHandle] = useState<'se' | 'sw' | 'ne' | 'nw' | 'e' | 'w' | 'n' | 's' | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bodyRichRef = useRef<RichTextEditorHandle | null>(null);
  const blockEditorRefs = useRef<Record<string, RichTextEditorHandle | null>>({});
  const previewContainerRef = useRef<HTMLDivElement>(null);

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
      field_positions: template?.field_positions || null,
      default_security_level_key: template?.default_security_level_key || null,
      page_layout: template?.page_layout || "A4_portrait",
      repeat_letterhead_on_pages: template?.repeat_letterhead_on_pages ?? true,
      is_mass_template: template?.is_mass_template ?? false,
      active: template?.active ?? true,
    },
  });

  // Initialize field positions from template
  useEffect(() => {
    if (template?.field_positions) {
      setFieldPositions(template.field_positions);
    }
  }, [template?.field_positions]);

  // Fetch all letterheads
  const { data: allLetterheads = [], isLoading: letterheadsLoading } = useQuery<Letterhead[]>({
    queryKey: ["dms", "letterheads"],
    queryFn: async () => await dmsApi.letterheads.list({ active: true }) as Letterhead[],
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Filter letterheads by type
  const backgroundLetterheads = (allLetterheads || []).filter(lh => lh.letterhead_type === 'background' || !lh.letterhead_type);
  const watermarkLetterheads = (allLetterheads || []).filter(lh => lh.letterhead_type === 'watermark');

  // Fetch letter types for selector
  const { data: letterTypes = [], isLoading: letterTypesLoading } = useLetterTypes(true) as {
    data: LetterTypeEntity[] | undefined;
    isLoading: boolean;
  };

  // Watch form values for live preview
  const category = watch("category");
  const selectedLetterheadId = watch("letterhead_id");
  const selectedWatermarkId = watch("watermark_id");
  const bodyText = watch("body_text");
  const repeatLetterhead = watch("repeat_letterhead_on_pages");
  const pageLayout = watch("page_layout");
  const supportsTables = watch("supports_tables");
  const tableStructure = watch("table_structure");

  const selectedLetterhead = (allLetterheads || []).find((lh) => lh.id === selectedLetterheadId);
  const selectedWatermark = (allLetterheads || []).find((lh) => lh.id === selectedWatermarkId);

  // Fetch blob URL for background letterhead to avoid auth/CSP/embed issues
  useEffect(() => {
    let revokeUrl: string | null = null;
    setBgUrl(null);
    if (selectedLetterhead?.id) {
      dmsApi.letterheads
        .download(selectedLetterhead.id)
        .then(({ blob }: { blob: Blob }) => {
          if (blob instanceof Blob && blob.size > 0) {
            const url = URL.createObjectURL(blob);
            revokeUrl = url;
            setBgUrl(url);
          }
        })
        .catch(() => {
          // silent fallback to file_url below
        });
    }
    return () => {
      if (revokeUrl) URL.revokeObjectURL(revokeUrl);
    };
  }, [selectedLetterhead?.id]);

  // Fetch blob URL for watermark
  useEffect(() => {
    let revokeUrl: string | null = null;
    setWmUrl(null);
    if (selectedWatermark?.id) {
      dmsApi.letterheads
        .download(selectedWatermark.id)
        .then(({ blob }: { blob: Blob }) => {
          if (blob instanceof Blob && blob.size > 0) {
            const url = URL.createObjectURL(blob);
            revokeUrl = url;
            setWmUrl(url);
          }
        })
        .catch(() => {
          // silent fallback
        });
    }
    return () => {
      if (revokeUrl) URL.revokeObjectURL(revokeUrl);
    };
  }, [selectedWatermark?.id]);

  const handleFormSubmit = (data: LetterTemplateFormData) => {
    // Include field_positions in submission
    const safeBodyText =
      useBlocks || useRichText ? sanitize.richText(data.body_text || "") : (data.body_text || "");
    onSubmit({
      ...data,
      body_text: safeBodyText,
      field_positions: Object.keys(fieldPositions).length > 0 ? fieldPositions : null,
    });
  };

  const refreshActualPreview = useCallback(async () => {
    try {
      setActualPreviewLoading(true);
      setActualPreviewError(null);

      const response = await dmsApi.templates.previewDraft({
        template: {
          category,
          body_text: bodyText || "",
          letterhead_id: selectedLetterheadId || null,
          watermark_id: selectedWatermarkId || null,
          page_layout: pageLayout || "A4_portrait",
          repeat_letterhead_on_pages: repeatLetterhead ?? true,
          field_positions: Object.keys(fieldPositions).length > 0 ? fieldPositions : null,
          supports_tables: supportsTables ?? false,
          table_structure: tableStructure ?? null,
        },
        recipient_type: category,
        variables: {},
      });

      setActualPreviewHtml((response as any)?.html || "");
      setActualPreviewError(null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to generate preview";
      setActualPreviewHtml("");
      setActualPreviewError(message);
    } finally {
      setActualPreviewLoading(false);
    }
  }, [
    bodyText,
    category,
    fieldPositions,
    pageLayout,
    repeatLetterhead,
    selectedLetterheadId,
    selectedWatermarkId,
    supportsTables,
    tableStructure,
  ]);

  // Keep actual preview in sync (debounced)
  useEffect(() => {
    if (!showPreview || previewMode !== "actual") return;

    const tmr = window.setTimeout(() => {
      void refreshActualPreview();
    }, 300);

    return () => window.clearTimeout(tmr);
  }, [showPreview, previewMode, refreshActualPreview]);

  // Insert field placeholder at cursor position
  const handleInsertField = (placeholder: string) => {
    if (useBlocks) {
      const targetId = selectedBlockId || blocks[0]?.id || "block-1";
      const editor = blockEditorRefs.current[targetId];
      if (editor) {
        editor.insertText(placeholder);
        return;
      }

      setBlocks((prev) => {
        if (prev.length === 0) return [{ id: "block-1", text: placeholder }];
        const idx = prev.findIndex((b) => b.id === targetId);
        if (idx < 0) {
          const [first, ...rest] = prev;
          return [{ ...first, text: `${first.text || ""}${placeholder}` }, ...rest];
        }
        const next = [...prev];
        next[idx] = { ...next[idx], text: `${next[idx].text || ""}${placeholder}` };
        return next;
      });
      return;
    }

    if (useRichText && bodyRichRef.current) {
      bodyRichRef.current.insertText(placeholder);
      return;
    }

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

  const handleBlockChange = (id: string, value: string) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, text: value } : b)));
  };

  const handleAddBlock = () => {
    setBlocks((prev) => [...prev, { id: `block-${prev.length + 1}`, text: "" }]);
  };

  const handleRemoveBlock = (id: string) => {
    setBlocks((prev) => (prev.length <= 1 ? prev : prev.filter((b) => b.id !== id)));
  };

  // Blocks used for positioning/preview (source of truth: blocks[] when enabled, else body_text)
  const textBlocks = useBlocks
    ? blocks.map((b) => b.text || "").filter((t) => t.trim())
    : (bodyText
        ? (() => {
            const parts = bodyText.split(/\n\s*\n/).filter((block) => block.trim());
            return parts.length === 0 && bodyText.trim() ? [bodyText] : parts;
          })()
        : []);

  const renderDesignerBlock = (content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return null;
    const isHtml = /<\s*\/?\s*[a-zA-Z][^>]*>/.test(trimmed);
    if (!isHtml) return <>{trimmed}</>;

    const safe = sanitize.richText(trimmed);
    return <div dangerouslySetInnerHTML={{ __html: safe }} />;
  };

  // Positioning handlers
  const handleBlockMouseDown = (e: React.MouseEvent, blockId: string, isResizeHandle = false, handle?: typeof resizeHandle) => {
    if (!showPositionEditor) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    if (isResizeHandle && handle) {
      setResizingBlockId(blockId);
      setResizeHandle(handle);
      setSelectedBlockId(blockId);
      
      if (!previewContainerRef.current) return;
      
      const rect = previewContainerRef.current.getBoundingClientRect();
      const position = fieldPositions[blockId] || { x: 50, y: 50, width: 40, height: 10 };
      const blockX = (position.x / 100) * rect.width;
      const blockY = (position.y / 100) * rect.height;
      const blockWidth = position.width ? (position.width / 100) * rect.width : 200;
      const blockHeight = position.height ? (position.height / 100) * rect.height : 100;
      
      setResizeStart({
        x: e.clientX - blockX,
        y: e.clientY - blockY,
        width: blockWidth,
        height: blockHeight,
      });
    } else {
      setDraggingBlockId(blockId);
      setSelectedBlockId(blockId);

      if (!previewContainerRef.current) return;

      const rect = previewContainerRef.current.getBoundingClientRect();
      const position = fieldPositions[blockId] || { x: 50, y: 50 };
      const fieldX = (position.x / 100) * rect.width;
      const fieldY = (position.y / 100) * rect.height;

      setDragOffset({
        x: e.clientX - rect.left - fieldX,
        y: e.clientY - rect.top - fieldY,
      });
    }
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!previewContainerRef.current) return;

      const rect = previewContainerRef.current.getBoundingClientRect();

      if (resizingBlockId && resizeHandle) {
        const position = fieldPositions[resizingBlockId] || { x: 50, y: 50, width: 40, height: 10 };
        let newWidth = position.width || 40;
        let newHeight = position.height || 10;

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const blockX = (position.x / 100) * rect.width;
        const blockY = (position.y / 100) * rect.height;

        if (resizeHandle.includes('e')) {
          newWidth = Math.max(5, Math.min(95, ((mouseX - blockX + resizeStart.width / 2) / rect.width) * 100));
        }
        if (resizeHandle.includes('w')) {
          newWidth = Math.max(5, Math.min(95, ((blockX - mouseX + resizeStart.width / 2) / rect.width) * 100));
        }
        if (resizeHandle.includes('s')) {
          newHeight = Math.max(2, Math.min(50, ((mouseY - blockY + resizeStart.height / 2) / rect.height) * 100));
        }
        if (resizeHandle.includes('n')) {
          newHeight = Math.max(2, Math.min(50, ((blockY - mouseY + resizeStart.height / 2) / rect.height) * 100));
        }

        setFieldPositions(prev => ({
          ...prev,
          [resizingBlockId]: {
            ...position,
            width: newWidth,
            height: newHeight,
          },
        }));
      } else if (draggingBlockId) {
        const x = ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100;
        const y = ((e.clientY - rect.top - dragOffset.y) / rect.height) * 100;

        const clampedX = Math.max(0, Math.min(100, x));
        const clampedY = Math.max(0, Math.min(100, y));

        const currentPosition = fieldPositions[draggingBlockId] || { x: 50, y: 50, fontSize: 14, fontFamily: 'Arial', textAlign: 'right' as const };
        setFieldPositions(prev => ({
          ...prev,
          [draggingBlockId]: {
            ...currentPosition,
            x: clampedX,
            y: clampedY,
          },
        }));
      }
    },
    [draggingBlockId, resizingBlockId, resizeHandle, dragOffset, resizeStart, fieldPositions]
  );

  const handleMouseUp = useCallback(() => {
    setDraggingBlockId(null);
    setResizingBlockId(null);
    setResizeHandle(null);
  }, []);

  useEffect(() => {
    if (draggingBlockId || resizingBlockId) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingBlockId, resizingBlockId, handleMouseMove, handleMouseUp]);

  // Initialize rich text mode based on existing content (HTML-like)
  useEffect(() => {
    const initial = template?.body_text || "";
    if (initial && /<\s*\/?\s*[a-zA-Z][^>]*>/.test(initial)) {
      setUseRichText(true);
    }
  }, [template?.id]);

  // When using blocks, keep body_text synced so preview/save uses the same data
  useEffect(() => {
    if (!useBlocks) return;
    const joined = blocks.map((b) => b.text || "").join("\n\n");
    setValue("body_text", joined, { shouldValidate: true, shouldDirty: true });
  }, [blocks, setValue, useBlocks]);

  // When toggling blocks on, initialize blocks from existing body text (split on blank lines)
  useEffect(() => {
    if (!useBlocks) return;
    const current = (bodyText || "").trim();
    if (!current) return;
    if (blocks.length > 1) return;
    if (blocks[0]?.text?.trim()) return;

    const parts = current.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    if (parts.length <= 1) {
      setBlocks([{ id: "block-1", text: current }]);
      return;
    }
    setBlocks(parts.map((text, idx) => ({ id: `block-${idx + 1}`, text })));
  }, [useBlocks, bodyText, blocks]);

  const updateBlockProperty = (blockId: string, property: keyof FieldPosition, value: any) => {
    const currentPosition = fieldPositions[blockId] || { x: 50, y: 50, fontSize: 14, fontFamily: 'Arial', textAlign: 'right', width: 40, height: 10 };
    setFieldPositions(prev => ({
      ...prev,
      [blockId]: {
        ...currentPosition,
        [property]: value,
      },
    }));
  };

  const selectedBlockPosition = selectedBlockId ? fieldPositions[selectedBlockId] : null;

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

            {/* Mode toggle + font size */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Switch checked={useBlocks} onCheckedChange={setUseBlocks} id="use_blocks" />
                <Label htmlFor="use_blocks">Use multiple text blocks</Label>
              </div>
              {!useBlocks && (
                <div className="flex items-center gap-2">
                  <Switch checked={useRichText} onCheckedChange={setUseRichText} id="use_rich_text" />
                  <Label htmlFor="use_rich_text">Rich text</Label>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground">Font size</Label>
                <input
                  type="range"
                  min={10}
                  max={22}
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value) || 14)}
                />
                <span className="text-xs text-muted-foreground w-10 text-right">{fontSize}px</span>
              </div>
            </div>

            {!useBlocks && (
              <div className="space-y-2">
                <Label htmlFor="body_text">
                  Body Text <span className="text-destructive">*</span>
                </Label>
                {useRichText ? (
                  <Controller
                    name="body_text"
                    control={control}
                    render={({ field }) => (
                      <RichTextEditor
                        ref={bodyRichRef}
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder="Type your letter content here (rich text supported). Use the field selector below to insert placeholders like {{student_name}}."
                        dir="rtl"
                      />
                    )}
                  />
                ) : null}
                {!useRichText && (
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
                )}
                <p className="text-xs text-muted-foreground">
                  Type your letter text. Use the field selector below to insert database fields.
                </p>
              </div>
            )}

            {useBlocks && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Text Blocks</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddBlock}>
                    Add Block
                  </Button>
                </div>
                {blocks.map((block, idx) => (
                  <div key={block.id} className="space-y-2 border rounded-md p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Block {idx + 1}</span>
                      {blocks.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveBlock(block.id)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    <RichTextEditor
                      ref={(h) => {
                        blockEditorRefs.current[block.id] = h;
                      }}
                      value={block.text}
                      onChange={(value) => handleBlockChange(block.id, value)}
                      placeholder="Enter text for this block..."
                      dir="rtl"
                    />
                  </div>
                ))}
              </div>
            )}

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

      {/* Live Preview Section with Positioning Editor */}
      {showPreview && (
        <div className="space-y-4 lg:sticky lg:top-4 lg:h-fit">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Live Preview & Positioning</h3>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={previewMode === "actual" ? "default" : "outline"}
                size="sm"
                onClick={() => setPreviewMode("actual")}
              >
                Actual Preview
              </Button>
              <Button
                type="button"
                variant={previewMode === "designer" ? "default" : "outline"}
                size="sm"
                onClick={() => setPreviewMode("designer")}
              >
                Designer
              </Button>
            </div>
            {previewMode === "designer" && bodyText && selectedLetterhead && (
              <Button
                type="button"
                variant={showPositionEditor ? "default" : "outline"}
                size="sm"
                onClick={() => setShowPositionEditor(!showPositionEditor)}
              >
                <MapPin className="h-4 w-4 mr-2" />
                {showPositionEditor ? "Disable Positioning" : "Enable Positioning"}
              </Button>
            )}
          </div>

          {previewMode === "actual" ? (
            <Card className="border-2">
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>Server Render (actual)</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void refreshActualPreview()}
                    disabled={actualPreviewLoading}
                  >
                    {actualPreviewLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {actualPreviewError ? (
                  <div className="p-4 text-sm text-destructive">{actualPreviewError}</div>
                ) : actualPreviewHtml ? (
                  <div className="border rounded-lg overflow-hidden bg-white">
                    <iframe
                      srcDoc={actualPreviewHtml}
                      className="w-full border-0"
                      style={{ minHeight: pageLayout === "A4_landscape" ? "600px" : "800px" }}
                      title="Template Actual Preview"
                    />
                  </div>
                ) : (
                  <div className="p-6 text-sm text-muted-foreground">Preview will appear here</div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-2">
              <CardContent className="p-0">
                <div
                  ref={previewContainerRef}
                  className={`relative w-full bg-white ${showPositionEditor ? 'cursor-crosshair' : ''}`}
                  style={{
                    aspectRatio: pageLayoutOptions.find(p => p.value === pageLayout)?.value.includes("landscape") ? "297/210" : "210/297",
                    minHeight: "500px",
                  }}
                  onClick={(e) => {
                    if (showPositionEditor && e.target === e.currentTarget) {
                      setSelectedBlockId(null);
                    }
                  }}
                >
                  {/* Letterhead Background (image/PDF) */}
                  {selectedLetterhead && (bgUrl || selectedLetterhead.file_url || selectedLetterhead.file_path) && (
                    selectedLetterhead.file_type === "pdf" ? (
                      <object
                        data={bgUrl || selectedLetterhead.file_url || selectedLetterhead.file_path}
                        type="application/pdf"
                        className="absolute inset-0 w-full h-full"
                        style={{ opacity: 0.35, pointerEvents: "none" }}
                      >
                        {/* Fallback for browsers that can't render PDF in object */}
                        <div className="absolute inset-0 flex items-center justify-center bg-muted/30 text-xs text-muted-foreground">
                          PDF letterhead preview not supported in this view
                        </div>
                      </object>
                    ) : (
                      <div
                        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                        style={{
                          backgroundImage: `url(${bgUrl || selectedLetterhead.file_url || selectedLetterhead.file_path})`,
                          opacity: 0.95,
                        }}
                      />
                    )
                  )}

                  {/* Watermark */}
                  {selectedWatermark && (wmUrl || selectedWatermark.file_url || selectedWatermark.file_path) && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <img
                        src={wmUrl || selectedWatermark.file_url || selectedWatermark.file_path}
                        alt="Watermark"
                        className="max-w-[60%] max-h-[60%] object-contain"
                        style={{ opacity: 0.08 }}
                      />
                    </div>
                  )}

                  {/* Content Text - Show positioned blocks if positions exist or positioning is enabled, otherwise show regular text */}
                  {(Object.keys(fieldPositions).length > 0 || (showPositionEditor && textBlocks.length > 0)) ? (
                    // Render positioned blocks with interactive controls when positioning is enabled
                    textBlocks.map((blockText, index) => {
                      const blockId = `block-${index + 1}`;
                      const position = fieldPositions[blockId] || (showPositionEditor ? { x: 50, y: 30 + (index * 15), fontSize: 14, fontFamily: 'Arial', textAlign: 'right' as const, width: 40, height: 10 } : null);
                      
                      if (!position) return null;
                      
                      const width = position.width ? `${position.width}%` : '40%';
                      const height = position.height ? `${position.height}%` : 'auto';
                      const maxWidth = position.maxWidth ? `${position.maxWidth}%` : '80%';
                      const isSelected = selectedBlockId === blockId;
                      const isDragging = draggingBlockId === blockId;
                      const isResizing = resizingBlockId === blockId;
                      
                      // Resize handles
                      const renderResizeHandles = () => {
                        if (!showPositionEditor || !isSelected) return null;
                        const handleSize = 8;
                        const handles: Array<{ position: typeof resizeHandle; style: React.CSSProperties }> = [
                          { position: 'nw', style: { top: '-4px', left: '-4px', cursor: 'nw-resize' } },
                          { position: 'n', style: { top: '-4px', left: '50%', transform: 'translateX(-50%)', cursor: 'n-resize' } },
                          { position: 'ne', style: { top: '-4px', right: '-4px', cursor: 'ne-resize' } },
                          { position: 'e', style: { top: '50%', right: '-4px', transform: 'translateY(-50%)', cursor: 'e-resize' } },
                          { position: 'se', style: { bottom: '-4px', right: '-4px', cursor: 'se-resize' } },
                          { position: 's', style: { bottom: '-4px', left: '50%', transform: 'translateX(-50%)', cursor: 's-resize' } },
                          { position: 'sw', style: { bottom: '-4px', left: '-4px', cursor: 'sw-resize' } },
                          { position: 'w', style: { top: '50%', left: '-4px', transform: 'translateY(-50%)', cursor: 'w-resize' } },
                        ];
                        return (
                          <>
                            {handles.map((handle) => (
                              <div
                                key={handle.position}
                                className="absolute bg-blue-600 border-2 border-white rounded-full z-50"
                                style={{
                                  width: `${handleSize}px`,
                                  height: `${handleSize}px`,
                                  ...handle.style,
                                }}
                                onMouseDown={(e) => handleBlockMouseDown(e, blockId, true, handle.position)}
                              />
                            ))}
                          </>
                        );
                      };
                      
                      return (
                        <div
                          key={blockId}
                          className={`absolute ${showPositionEditor ? 'cursor-grab active:cursor-grabbing' : ''}`}
                          style={{
                            left: `${position.x}%`,
                            top: `${position.y}%`,
                            transform: 'translate(-50%, -50%)',
                            fontSize: `${position.fontSize || 14}px`,
                            fontFamily: position.fontFamily || 'Arial',
                            textAlign: position.textAlign || 'right',
                            color: position.color || '#000000',
                            width,
                            height,
                            maxWidth,
                            minHeight: '30px',
                            wordWrap: 'break-word',
                            whiteSpace: 'pre-wrap',
                            zIndex: isDragging || isResizing ? 1000 : isSelected ? 100 : 10,
                            padding: showPositionEditor ? '8px 12px' : '0px',
                            backgroundColor: showPositionEditor
                              ? (isSelected ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.75)')
                              : 'transparent',
                            border: showPositionEditor
                              ? (isSelected ? '2px solid #3b82f6' : '1px solid rgba(0, 0, 0, 0.1)')
                              : 'none',
                            borderRadius: showPositionEditor ? '4px' : '0px',
                            boxSizing: 'border-box',
                            overflow: 'hidden',
                          }}
                          onMouseDown={(e) => showPositionEditor && handleBlockMouseDown(e, blockId)}
                          onClick={(e) => {
                            if (showPositionEditor) {
                              e.stopPropagation();
                              setSelectedBlockId(blockId);
                            }
                          }}
                        >
                          {renderResizeHandles()}
                          {showPositionEditor && (
                            <div className="flex items-center gap-1 mb-1">
                              <MapPin className={`h-3 w-3 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
                              <span className={`text-xs font-medium ${isSelected ? 'text-blue-600' : 'text-gray-600'}`}>
                                {blockId}
                              </span>
                            </div>
                          )}
                          <div style={{ fontFamily: position.fontFamily || 'Arial' }}>
                            {renderDesignerBlock(blockText)}
                          </div>
                          {isSelected && showPositionEditor && (
                            <div className="mt-1 text-xs text-blue-600">
                              X: {position.x.toFixed(1)}%, Y: {position.y.toFixed(1)}% | W: {position.width?.toFixed(1) || 40}%, H: {position.height?.toFixed(1) || 'auto'}%
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    // Regular text display
                    <div
                      className="relative z-10 p-12 text-right"
                      dir="rtl"
                      style={{
                        fontFamily: "Arial, sans-serif",
                        fontSize: `${fontSize}px`,
                        lineHeight: "1.8",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {useBlocks ? (
                        (blocks && blocks.length > 0 && blocks.some((b) => b.text?.trim())) ? (
                          <div className="space-y-6">
                            {blocks.map((block) => (
                              <div key={block.id}>{renderDesignerBlock(block.text || "")}</div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground italic text-center mt-20">
                            Add a text block and start typing...
                          </p>
                        )
                      ) : bodyText ? (
                        renderDesignerBlock(bodyText)
                      ) : (
                        <p className="text-muted-foreground italic text-center mt-20">
                          Your letter text will appear here as you type...
                        </p>
                      )}
                    </div>
                  )}

                  {/* Repeat indicator */}
                  {repeatLetterhead && selectedLetterhead && (
                    <div className="absolute bottom-2 right-2 text-xs bg-black/50 text-white px-2 py-1 rounded">
                      Letterhead repeats on all pages
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <p className="text-xs text-muted-foreground text-center">
            {previewMode === "designer" && showPositionEditor && bodyText && selectedLetterhead
              ? "Drag text blocks to position them on the letterhead. Click a block to edit its properties. Drag the blue resize handles to adjust size."
              : previewMode === "designer"
                ? "This preview shows an editor view with letterhead/watermark layers."
                : "This preview is rendered by the backend (same renderer used for printing)."
            }
          </p>

          {/* Properties Panel - Show when positioning is enabled and a block is selected */}
          {showPositionEditor && selectedBlockId && selectedBlockPosition && (
            <Card>
              <CardContent className="p-4">
                <h4 className="text-sm font-semibold mb-3">Edit: {selectedBlockId}</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Font Size</Label>
                    <Input
                      type="number"
                      min="8"
                      max="72"
                      value={selectedBlockPosition.fontSize || 14}
                      onChange={(e) => updateBlockProperty(selectedBlockId, 'fontSize', parseInt(e.target.value) || 14)}
                    />
                  </div>
                  <div>
                    <Label>Font Family</Label>
                    <Select
                      value={selectedBlockPosition.fontFamily || 'Arial'}
                      onValueChange={(value) => updateBlockProperty(selectedBlockId, 'fontFamily', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bahij Nassim">Bahij Nassim (Arabic/Pashto)</SelectItem>
                        <SelectItem value="Arial">Arial</SelectItem>
                        <SelectItem value="Helvetica">Helvetica</SelectItem>
                        <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                        <SelectItem value="Courier New">Courier New</SelectItem>
                        <SelectItem value="Georgia">Georgia</SelectItem>
                        <SelectItem value="Verdana">Verdana</SelectItem>
                        <SelectItem value="Noto Sans Arabic">Noto Sans Arabic</SelectItem>
                        <SelectItem value="Tahoma">Tahoma</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Text Align</Label>
                    <Select
                      value={selectedBlockPosition.textAlign || 'right'}
                      onValueChange={(value) => updateBlockProperty(selectedBlockId, 'textAlign', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Left</SelectItem>
                        <SelectItem value="center">Center</SelectItem>
                        <SelectItem value="right">Right</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Color</Label>
                    <Input
                      type="color"
                      value={selectedBlockPosition.color || '#000000'}
                      onChange={(e) => updateBlockProperty(selectedBlockId, 'color', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Width (%)</Label>
                    <Input
                      type="number"
                      min="5"
                      max="95"
                      step="0.1"
                      value={selectedBlockPosition.width || 40}
                      onChange={(e) => updateBlockProperty(selectedBlockId, 'width', parseFloat(e.target.value) || 40)}
                    />
                  </div>
                  <div>
                    <Label>Height (%)</Label>
                    <Input
                      type="number"
                      min="2"
                      max="50"
                      step="0.1"
                      value={selectedBlockPosition.height || 10}
                      onChange={(e) => updateBlockProperty(selectedBlockId, 'height', parseFloat(e.target.value) || 10)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
