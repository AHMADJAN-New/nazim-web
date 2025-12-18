import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dmsApi } from "@/lib/api/client";
import type { LetterTemplate, TemplateVariable, PositionedBlock } from "@/types/dms";
import { Loader2, Eye, FileText, Move } from "lucide-react";

interface TemplatePreviewProps {
  template: LetterTemplate;
  onClose?: () => void;
}

export function TemplatePreview({ template, onClose }: TemplatePreviewProps) {
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [fieldPositions, setFieldPositions] = useState<PositionedBlock[]>([]);

  // Initialize variables with defaults
  useEffect(() => {
    if (template.variables && Array.isArray(template.variables)) {
      const initialVars: Record<string, string> = {};
      template.variables.forEach((varDef: TemplateVariable) => {
        initialVars[varDef.name] = varDef.default || "";
      });
      setVariables(initialVars);
    }

    // Set initial field positions
    if (template.field_positions && Array.isArray(template.field_positions)) {
      setFieldPositions(template.field_positions);
    }
  }, [template]);

  const previewMutation = useMutation({
    mutationFn: async (vars: Record<string, string>) => {
      return await dmsApi.templates.preview(template.id, vars);
    },
    onSuccess: (data: any) => {
      setPreviewHtml(data.html || "");
      if (data.field_positions) {
        setFieldPositions(data.field_positions);
      }
      setIsLoading(false);
    },
    onError: () => {
      setIsLoading(false);
    },
  });

  const handlePreview = () => {
    setIsLoading(true);
    previewMutation.mutate(variables);
  };

  const handleVariableChange = (varName: string, value: string) => {
    setVariables((prev) => ({ ...prev, [varName]: value }));
  };

  const templateVariables = (template.variables as TemplateVariable[]) || [];
  const hasPositionedBlocks = fieldPositions.length > 0;

  return (
    <div className="space-y-4">
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
                  Generate Preview
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
          {previewHtml ? (
            <div className="border rounded-lg bg-white overflow-hidden">
              <iframe
                srcDoc={previewHtml}
                className="w-full border-0"
                style={{
                  minHeight: "800px",
                  height: template.page_layout === "A4_landscape" ? "600px" : "800px"
                }}
                title="Template Preview"
                sandbox="allow-same-origin"
              />
            </div>
          ) : (
            <div className="border rounded-lg p-8 text-center text-muted-foreground bg-gray-50">
              {templateVariables.length > 0 ? (
                <div className="space-y-2">
                  <Eye className="h-12 w-12 mx-auto text-gray-300" />
                  <p>Fill in the variables above and click "Generate Preview" to see the template.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Eye className="h-12 w-12 mx-auto text-gray-300" />
                  <p>Click "Generate Preview" to see the template.</p>
                  <Button onClick={handlePreview} disabled={isLoading} variant="outline" size="sm">
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        Generate Preview
                      </>
                    )}
                  </Button>
                </div>
              )}
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
