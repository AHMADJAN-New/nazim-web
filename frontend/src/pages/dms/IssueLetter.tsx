import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { dmsApi } from "@/lib/api/client";
import type { LetterTemplate, Letterhead, TemplateVariable } from "@/types/dms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/hooks/useLanguage";
import { showToast } from "@/lib/toast";
import { TemplateEditor } from "@/components/dms/TemplateEditor";
import { RichTextEditor } from "@/components/dms/RichTextEditor";
import { SecurityBadge } from "@/components/dms/SecurityBadge";
import { DocumentNumberBadge } from "@/components/dms/DocumentNumberBadge";
import { MassTableBuilder } from "@/components/dms/MassTableBuilder";
import { Loader2 } from "lucide-react";

export default function IssueLetter() {
  const { t } = useLanguage();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [template, setTemplate] = useState<LetterTemplate | null>(null);
  const [letterhead, setLetterhead] = useState<Letterhead | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [payload, setPayload] = useState({
    template_id: "",
    subject: "",
    body_html: "",
    issue_date: new Date().toISOString().slice(0, 10),
    recipient_type: "external",
    security_level_key: "public",
  });

  // Fetch templates
  const { data: templates } = useQuery<LetterTemplate[]>({
    queryKey: ["dms", "templates"],
    queryFn: () => dmsApi.templates.list({ active: true }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Fetch selected template details
  const { data: templateDetails } = useQuery<LetterTemplate>({
    queryKey: ["dms", "templates", selectedTemplateId],
    queryFn: () => dmsApi.templates.get(selectedTemplateId),
    enabled: !!selectedTemplateId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Update template and letterhead when template is selected
  useEffect(() => {
    if (templateDetails) {
      setTemplate(templateDetails);
      setPayload((prev) => ({
        ...prev,
        template_id: templateDetails.id,
        subject: templateDetails.name || prev.subject,
        security_level_key: templateDetails.default_security_level_key || prev.security_level_key,
        body_html: templateDetails.body_html || prev.body_html,
      }));

      // Auto-select letterhead if template has one
      if (templateDetails.letterhead_id) {
        // Fetch letterhead details
        dmsApi.letterheads
          .get(templateDetails.letterhead_id)
          .then((lh) => {
            setLetterhead(lh);
          })
          .catch(() => {
            // Letterhead not found or error
          });
      } else {
        setLetterhead(null);
      }

      // Initialize variables with defaults
      if (templateDetails.variables && Array.isArray(templateDetails.variables)) {
        const initialVars: Record<string, string> = {};
        templateDetails.variables.forEach((varDef: TemplateVariable) => {
          initialVars[varDef.name] = varDef.default || "";
        });
        setVariables(initialVars);
      }
    }
  }, [templateDetails]);

  // Replace variables in body_html
  const processedBodyHtml = useMemo(() => {
    let html = payload.body_html || "";
    if (template?.variables && Array.isArray(template.variables)) {
      template.variables.forEach((varDef: TemplateVariable) => {
        const varName = varDef.name;
        const varValue = variables[varName] || varDef.default || `{{${varName}}}`;
        html = html.replace(new RegExp(`{{${varName}}}`, "g"), varValue);
        html = html.replace(new RegExp(`{{ ${varName} }}`, "g"), varValue);
      });
    }
    return html;
  }, [payload.body_html, variables, template]);

  const mutation = useMutation({
    mutationFn: (data: any) => dmsApi.outgoing.create({ ...data, status: "issued" }),
    onSuccess: () => {
      showToast.success(t('toast.letterIssued') || 'Letter issued successfully');
      // Reset form
      setSelectedTemplateId("");
      setTemplate(null);
      setLetterhead(null);
      setVariables({});
      setPayload({
        template_id: "",
        subject: "",
        body_html: "",
        issue_date: new Date().toISOString().slice(0, 10),
        recipient_type: "external",
        security_level_key: "public",
      });
    },
    onError: (err: any) => {
      showToast.error(err.message || t('toast.letterIssueFailed') || 'Failed to issue letter');
    },
  });

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
  };

  const handleVariableChange = (varName: string, value: string) => {
    setVariables((prev) => ({ ...prev, [varName]: value }));
  };

  const handleIssue = () => {
    mutation.mutate({
      ...payload,
      template_id: template?.id,
      letterhead_id: letterhead?.id,
      template_variables: variables,
      body_html: processedBodyHtml,
    });
  };

  const templateVariables = (template?.variables as TemplateVariable[]) || [];
  const canEditBody = template?.allow_edit_body ?? false;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>Issue from Template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Template <span className="text-destructive">*</span></Label>
              <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose template" />
                </SelectTrigger>
                <SelectContent>
                  {templates?.map((tpl) => (
                    <SelectItem key={tpl.id} value={tpl.id}>
                      {tpl.name}
                      {tpl.letter_type && ` (${tpl.letter_type})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {template && (
              <>
                <div className="space-y-2">
                  <Label>Letterhead</Label>
                  {letterhead ? (
                    <div className="p-3 border rounded-lg bg-muted/50">
                      <p className="text-sm font-medium">{letterhead.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {letterhead.file_type?.toUpperCase()} • {letterhead.position || "header"}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No letterhead assigned to this template</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Subject <span className="text-destructive">*</span></Label>
                  <Input
                    value={payload.subject}
                    onChange={(e) => setPayload((s) => ({ ...s, subject: e.target.value }))}
                    placeholder="Letter subject"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Recipient Type</Label>
                  <Select
                    value={payload.recipient_type}
                    onValueChange={(value) => setPayload((s) => ({ ...s, recipient_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="applicant">Applicant</SelectItem>
                      <SelectItem value="external">External</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Issue Date <span className="text-destructive">*</span></Label>
                    <SecurityBadge level={payload.security_level_key} />
                  </div>
                  <Input
                    type="date"
                    value={payload.issue_date}
                    onChange={(e) => setPayload((s) => ({ ...s, issue_date: e.target.value }))}
                  />
                </div>

                {/* Template Variables */}
                {templateVariables.length > 0 && (
                  <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                    <Label>Template Variables</Label>
                    {templateVariables.map((varDef) => (
                      <div key={varDef.name} className="space-y-1">
                        <Label htmlFor={`var-${varDef.name}`} className="text-sm">
                          {varDef.label || varDef.name}
                          {varDef.required && <span className="text-destructive ml-1">*</span>}
                        </Label>
                        <Input
                          id={`var-${varDef.name}`}
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
                  </div>
                )}

                {/* Body HTML Editor */}
                <div className="space-y-2">
                  <Label>Body HTML {canEditBody && "(Editable)"}</Label>
                  {canEditBody ? (
                    <RichTextEditor
                      value={payload.body_html}
                      onChange={(html) => setPayload((s) => ({ ...s, body_html: html }))}
                      placeholder="Enter letter body. Variables will be replaced automatically."
                    />
                  ) : (
                    <div className="p-3 border rounded-lg bg-muted/50 min-h-[200px]">
                      <p className="text-sm text-muted-foreground">
                        Body is locked. Edit the template to modify the body.
                      </p>
                      <div className="mt-2 text-sm whitespace-pre-wrap">
                        {payload.body_html || "No body content"}
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  disabled={!payload.subject || !payload.issue_date || mutation.isPending}
                  onClick={handleIssue}
                  className="w-full"
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Issuing...
                    </>
                  ) : (
                    "Issue Letter"
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Preview Card */}
        <Card>
          <CardHeader>
            <CardTitle>Live Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">{payload.subject || "Letter subject"}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <DocumentNumberBadge value={"AUTO"} type="outgoing" />
                <SecurityBadge level={payload.security_level_key} />
              </div>
            </div>

            {letterhead && letterhead.preview_url && letterhead.file_type === "image" && (
              <div className="border rounded-lg overflow-hidden">
                <img
                  src={letterhead.preview_url}
                  alt={letterhead.name}
                  className="w-full h-auto"
                />
              </div>
            )}

            <div className="rounded-md border bg-muted/50 p-4 text-sm whitespace-pre-wrap min-h-[300px]">
              {processedBodyHtml || "Body preview will appear here"}
            </div>

            {/* Table Preview Placeholder */}
            {template?.is_mass_template && (
              <div className="mt-4">
                <Label className="text-sm text-muted-foreground mb-2 block">
                  Mass Template - Table Preview
                </Label>
                <MassTableBuilder
                  headers={["Student", "Class", "Section"]}
                  rows={[
                    ["Aisha Khan", "10", "A"],
                    ["Bilal Ahmed", "10", "B"],
                  ]}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
