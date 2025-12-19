import { useState, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { dmsApi } from "@/lib/api/client";
import type { LetterTemplate, TemplateVariable, PositionedBlock } from "@/types/dms";
import { Loader2, Eye, FileText, Move, AlertCircle } from "lucide-react";
import { showToast } from "@/lib/toast";
import { useLanguage } from "@/hooks/useLanguage";

interface TemplatePreviewProps {
  template: LetterTemplate;
  onClose?: () => void;
}

export function TemplatePreview({ template, onClose }: TemplatePreviewProps) {
  const { t } = useLanguage();
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [fieldPositions, setFieldPositions] = useState<PositionedBlock[]>([]);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewMutation = useMutation({
    mutationFn: async (vars: Record<string, string>) => {
      if (import.meta.env.DEV) {
        console.log('[TemplatePreview] Requesting preview for template:', template.id, 'with variables:', vars);
      }
      return await dmsApi.templates.preview(template.id, vars);
    },
    onSuccess: (data: any) => {
      if (import.meta.env.DEV) {
        console.log('[TemplatePreview] Preview response received:', {
          hasHtml: !!data.html,
          htmlLength: data.html?.length || 0,
          hasFieldPositions: !!data.field_positions,
        });
      }
      
      setError(null);
      setPreviewHtml(data.html || "");
      
      if (data.field_positions) {
        setFieldPositions(data.field_positions);
      }
      
      setIsLoading(false);
      
      if (!data.html) {
        const errorMsg = "Preview HTML is empty. Please check the template configuration.";
        setError(errorMsg);
        showToast.error(errorMsg);
      }
    },
    onError: (error: any) => {
      const errorMessage = error?.message || error?.response?.data?.error || "Failed to generate preview";
      
      if (import.meta.env.DEV) {
        console.error('[TemplatePreview] Preview error:', error);
        console.error('[TemplatePreview] Error details:', {
          message: error?.message,
          status: error?.response?.status,
          data: error?.response?.data,
        });
      }
      
      setError(errorMessage);
      setIsLoading(false);
      showToast.error(errorMessage);
    },
  });

  // Initialize variables with defaults and auto-generate preview
  useEffect(() => {
    if (hasInitialized) return;

    const initialVars: Record<string, string> = {};
    if (template.variables && Array.isArray(template.variables)) {
      template.variables.forEach((varDef: TemplateVariable) => {
        initialVars[varDef.name] = varDef.default || `[${varDef.label || varDef.name}]`;
      });
    }
    setVariables(initialVars);

    // Set initial field positions
    if (template.field_positions && Array.isArray(template.field_positions)) {
      setFieldPositions(template.field_positions);
    }

    // Auto-generate preview on mount
    setIsLoading(true);
    setError(null);
    setHasInitialized(true);
    previewMutation.mutate(initialVars);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template.id, hasInitialized]);

  const handlePreview = useCallback(() => {
    setIsLoading(true);
    setError(null);
    previewMutation.mutate(variables);
  }, [variables, previewMutation]);

  const handleVariableChange = (varName: string, value: string) => {
    setVariables((prev) => ({ ...prev, [varName]: value }));
  };

  const templateVariables = (template.variables as TemplateVariable[]) || [];
  const hasPositionedBlocks = fieldPositions.length > 0;

  return (
    <div className="space-y-4">
      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Variable Inputs */}
      {templateVariables.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview Variables</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {templateVariables.map((varDef) => (
              <div key={varDef.name} className="space-y-2">
                <Label htmlFor={`preview-${varDef.name}`}>
                  {varDef.label || varDef.name}
                  {varDef.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                <Input
                  id={`preview-${varDef.name}`}
                  value={variables[varDef.name] || ""}
                  onChange={(e) => handleVariableChange(varDef.name, e.target.value)}
                  placeholder={varDef.default || `Enter ${varDef.label || varDef.name}`}
                  type={varDef.type === "date" ? "date" : varDef.type === "number" ? "number" : "text"}
                />
                {varDef.description && (
                  <p className="text-xs text-muted-foreground">{varDef.description}</p>
                )}
              </div>
            ))}
            <Button onClick={handlePreview} disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Preview...
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Refresh Preview
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Template Info */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Template Info
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Name:</span>
            <span className="font-medium">{template.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Category:</span>
            <span className="font-medium capitalize">{template.category}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Page Layout:</span>
            <span className="font-medium">{template.page_layout || "A4 Portrait"}</span>
          </div>
          {template.letterhead && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Letterhead:</span>
              <span className="font-medium">{template.letterhead.name}</span>
            </div>
          )}
          {hasPositionedBlocks && (
            <div className="flex items-center gap-2 mt-2 p-2 bg-blue-50 rounded text-blue-700">
              <Move className="h-4 w-4" />
              <span className="text-xs">
                {fieldPositions.length} positioned block{fieldPositions.length !== 1 ? 's' : ''} defined
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Display */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preview</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="border rounded-lg p-8 text-center text-muted-foreground bg-gray-50">
              <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
              <p className="mt-4">Generating preview...</p>
            </div>
          ) : error ? (
            <div className="border rounded-lg p-8 text-center text-muted-foreground bg-red-50">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
              <p className="mt-4 text-destructive font-medium">{error}</p>
              <Button onClick={handlePreview} variant="outline" size="sm" className="mt-4">
                <Eye className="h-4 w-4 mr-2" />
                Retry Preview
              </Button>
            </div>
          ) : previewHtml ? (
            <div className="border rounded-lg bg-white overflow-hidden">
              <iframe
                srcDoc={previewHtml}
                className="w-full border-0"
                style={{
                  minHeight: "800px",
                  height: template.page_layout === "A4_landscape" ? "600px" : "800px"
                }}
                title="Template Preview"
                allow=""
                onError={(e) => {
                  if (import.meta.env.DEV) {
                    console.warn('[TemplatePreview] Iframe error (non-critical):', e);
                  }
                }}
                onLoad={() => {
                  if (import.meta.env.DEV) {
                    console.log('[TemplatePreview] Iframe loaded successfully');
                  }
                }}
              />
            </div>
          ) : (
            <div className="border rounded-lg p-8 text-center text-muted-foreground bg-gray-50">
              <Eye className="h-12 w-12 mx-auto text-gray-300" />
              <p className="mt-4">No preview available. Click "Refresh Preview" to generate.</p>
              <Button onClick={handlePreview} disabled={isLoading} variant="outline" size="sm" className="mt-2">
                <Eye className="h-4 w-4 mr-2" />
                Generate Preview
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {onClose && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      )}
    </div>
  );
}
