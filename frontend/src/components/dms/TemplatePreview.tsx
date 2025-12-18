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

  // Initialize variables with defaults then immediately request a preview (backend uses mock data if needed)
  useEffect(() => {
    setPreviewHtml("");
    const initialVars: Record<string, string> = {};
    if (template.variables && Array.isArray(template.variables)) {
      template.variables.forEach((varDef: TemplateVariable) => {
        initialVars[varDef.name] = varDef.default || "";
      });
    }
    setVariables(initialVars);
    setIsLoading(true);
    previewMutation.mutate(initialVars);
  }, [template.id]);

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
                sandbox="allow-scripts allow-same-origin"
                allow=""
                onError={(e) => {
                  // Silently handle iframe errors - they shouldn't affect parent window
                  if (import.meta.env.DEV) {
                    console.warn('[TemplatePreview] Iframe error (non-critical):', e);
                  }
                }}
                onLoad={() => {
                  // Iframe loaded successfully
                  if (import.meta.env.DEV) {
                    console.log('[TemplatePreview] Iframe loaded successfully');
                    // Debug: Check if letterhead is in the HTML and fix visibility
                    const iframe = document.querySelector('iframe[title="Template Preview"]') as HTMLIFrameElement;
                    if (iframe?.contentDocument) {
                      const letterhead = iframe.contentDocument.querySelector('.letterhead-background, .letterhead-header') as HTMLElement;
                      if (letterhead) {
                        const styles = window.getComputedStyle(letterhead);
                        console.log('[TemplatePreview] Letterhead found');
                        console.log('[TemplatePreview] Letterhead position:', styles.position);
                        console.log('[TemplatePreview] Letterhead z-index:', styles.zIndex);
                        console.log('[TemplatePreview] Letterhead opacity:', styles.opacity);
                        console.log('[TemplatePreview] Letterhead visibility:', styles.visibility);
                        console.log('[TemplatePreview] Letterhead display:', styles.display);
                        console.log('[TemplatePreview] Letterhead width:', styles.width);
                        console.log('[TemplatePreview] Letterhead height:', styles.height);
                        
                        // Force visibility if hidden
                        if (styles.display === 'none' || styles.visibility === 'hidden' || parseFloat(styles.opacity) === 0) {
                          letterhead.style.display = 'block';
                          letterhead.style.visibility = 'visible';
                          letterhead.style.opacity = '1';
                          console.log('[TemplatePreview] Fixed letterhead visibility');
                        }
                        
                        // Check for image inside
                        const img = letterhead.querySelector('img');
                        if (img) {
                          const imgStyles = window.getComputedStyle(img);
                          console.log('[TemplatePreview] Letterhead image found:', img.src.substring(0, 50) + '...');
                          console.log('[TemplatePreview] Image width:', imgStyles.width);
                          console.log('[TemplatePreview] Image height:', imgStyles.height);
                          console.log('[TemplatePreview] Image display:', imgStyles.display);
                          console.log('[TemplatePreview] Image opacity:', imgStyles.opacity);
                          console.log('[TemplatePreview] Image visibility:', imgStyles.visibility);
                          
                          // Check if image loaded
                          img.onload = () => console.log('[TemplatePreview] Image loaded successfully');
                          img.onerror = () => console.error('[TemplatePreview] Image failed to load');
                          if (img.complete) {
                            console.log('[TemplatePreview] Image already loaded');
                          }
                        } else {
                          console.log('[TemplatePreview] No image found in letterhead - might be PDF placeholder');
                          // Check if it's the PDF placeholder div
                          const placeholderDiv = letterhead.querySelector('div');
                          if (placeholderDiv) {
                            const placeholderStyles = window.getComputedStyle(placeholderDiv);
                            console.log('[TemplatePreview] PDF placeholder div found');
                            console.log('[TemplatePreview] Placeholder display:', placeholderStyles.display);
                            console.log('[TemplatePreview] Placeholder background:', placeholderStyles.background);
                            console.log('[TemplatePreview] Placeholder opacity:', placeholderStyles.opacity);
                            console.log('[TemplatePreview] Placeholder text:', placeholderDiv.textContent?.substring(0, 50));
                            
                            // Check outer container (letterhead) background
                            console.log('[TemplatePreview] Letterhead background:', styles.background);
                            console.log('[TemplatePreview] Letterhead backgroundImage:', styles.backgroundImage);
                            console.log('[TemplatePreview] Letterhead computed background:', styles.backgroundColor);
                            
                            // Always force letterhead container to be visible with gradient (override any CSS)
                            letterhead.style.setProperty('background', 'linear-gradient(135deg, #e8e8e8 0%, #d0d0d0 100%)', 'important');
                            letterhead.style.setProperty('border', '3px dashed #999', 'important');
                            letterhead.style.setProperty('display', 'flex', 'important');
                            letterhead.style.setProperty('opacity', '1', 'important');
                            letterhead.style.setProperty('visibility', 'visible', 'important');
                            console.log('[TemplatePreview] Applied gradient background to letterhead container');
                            
                            // Also check iframe body/html background
                            const iframeBody = iframe.contentDocument?.body;
                            const iframeHtml = iframe.contentDocument?.documentElement;
                            if (iframeBody) {
                              const bodyStyles = window.getComputedStyle(iframeBody);
                              console.log('[TemplatePreview] Iframe body background:', bodyStyles.backgroundColor);
                              if (bodyStyles.backgroundColor !== 'rgba(0, 0, 0, 0)' && bodyStyles.backgroundColor !== 'transparent') {
                                iframeBody.style.backgroundColor = 'transparent';
                                console.log('[TemplatePreview] Made iframe body transparent');
                              }
                            }
                            if (iframeHtml) {
                              const htmlStyles = window.getComputedStyle(iframeHtml);
                              console.log('[TemplatePreview] Iframe html background:', htmlStyles.backgroundColor);
                              if (htmlStyles.backgroundColor !== 'rgba(0, 0, 0, 0)' && htmlStyles.backgroundColor !== 'transparent') {
                                iframeHtml.style.backgroundColor = 'transparent';
                                console.log('[TemplatePreview] Made iframe html transparent');
                              }
                            }
                            
                            // Force visibility
                            if (placeholderStyles.display === 'none' || parseFloat(placeholderStyles.opacity) === 0) {
                              (placeholderDiv as HTMLElement).style.display = 'flex';
                              (placeholderDiv as HTMLElement).style.opacity = '1';
                              console.log('[TemplatePreview] Fixed placeholder visibility');
                            }
                          }
                        }
                        
                        // Check content wrapper - it might be covering the letterhead
                        const contentWrapper = iframe.contentDocument?.querySelector('.content-wrapper');
                        if (contentWrapper) {
                          const wrapperStyles = window.getComputedStyle(contentWrapper);
                          console.log('[TemplatePreview] Content wrapper z-index:', wrapperStyles.zIndex);
                          console.log('[TemplatePreview] Content wrapper background:', wrapperStyles.backgroundColor);
                          console.log('[TemplatePreview] Content wrapper position:', wrapperStyles.position);
                          
                          // If content has solid background, make it semi-transparent so letterhead shows through
                          if (wrapperStyles.backgroundColor !== 'rgba(0, 0, 0, 0)' && 
                              wrapperStyles.backgroundColor !== 'transparent' &&
                              !wrapperStyles.backgroundColor.includes('rgba')) {
                            console.log('[TemplatePreview] Content wrapper has solid background - making transparent');
                            (contentWrapper as HTMLElement).style.backgroundColor = 'transparent';
                          }
                        }
                      } else {
                        console.warn('[TemplatePreview] Letterhead element not found in iframe');
                      }
                    }
                  }
                }}
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

