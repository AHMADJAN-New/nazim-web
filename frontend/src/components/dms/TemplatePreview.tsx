import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dmsApi } from "@/lib/api/client";
import type { LetterTemplate, TemplateVariable } from "@/types/dms";
import { Loader2, Eye } from "lucide-react";

interface TemplatePreviewProps {
  template: LetterTemplate;
  onClose?: () => void;
}

export function TemplatePreview({ template, onClose }: TemplatePreviewProps) {
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  // Initialize variables with defaults
  useEffect(() => {
    if (template.variables && Array.isArray(template.variables)) {
      const initialVars: Record<string, string> = {};
      template.variables.forEach((varDef: TemplateVariable) => {
        initialVars[varDef.name] = varDef.default || "";
      });
      setVariables(initialVars);
    }
  }, [template]);

  const previewMutation = useMutation({
    mutationFn: async (vars: Record<string, string>) => {
      return await dmsApi.templates.preview(template.id, vars);
    },
    onSuccess: (data: any) => {
      setPreviewHtml(data.html || "");
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

      {/* Preview Display */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preview</CardTitle>
        </CardHeader>
        <CardContent>
          {previewHtml ? (
            <div className="border rounded-lg p-4 bg-white">
              <iframe
                srcDoc={previewHtml}
                className="w-full min-h-[600px] border-0"
                title="Template Preview"
              />
            </div>
          ) : (
            <div className="border rounded-lg p-8 text-center text-muted-foreground">
              {templateVariables.length > 0 ? (
                <p>Fill in the variables above and click "Generate Preview" to see the template.</p>
              ) : (
                <p>No variables defined. Click "Generate Preview" to see the template.</p>
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

