import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { dmsApi } from "@/lib/api/client";
import type { LetterTemplate } from "@/types/dms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { TemplateEditor } from "@/components/dms/TemplateEditor";
import { MassTableBuilder } from "@/components/dms/MassTableBuilder";
import { SecurityBadge } from "@/components/dms/SecurityBadge";
import { DocumentNumberBadge } from "@/components/dms/DocumentNumberBadge";

export default function IssueLetter() {
  const { toast } = useToast();
  const { data: templates } = useQuery<LetterTemplate[]>({
    queryKey: ["dms", "templates"],
    queryFn: () => dmsApi.templates.list({ active: true }),
  });

  const [payload, setPayload] = useState({
    template_id: "",
    subject: "",
    body_html: "",
    issue_date: new Date().toISOString().slice(0, 10),
    recipient_type: "external",
    security_level_key: "public",
  });

  const [tablePreview] = useState({
    headers: ["Student", "Class", "Section"],
    rows: [
      ["Aisha Khan", "10", "A"],
      ["Bilal Ahmed", "10", "B"],
      ["Cyrus Malik", "9", "A"],
      ["Dina Rahman", "9", "B"],
    ],
  });

  const mutation = useMutation({
    mutationFn: (data: any) => dmsApi.outgoing.create({ ...data, status: "issued" }),
    onSuccess: () => toast({ description: "Letter issued" }),
    onError: (err: any) => toast({ description: err.message ?? "Failed to issue" }),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Issue from template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Template</Label>
            <Select
              value={payload.template_id}
              onValueChange={(value) => {
                const selected = templates?.find((t) => t.id === value);
                setPayload((s) => ({ ...s, template_id: value, subject: selected?.name || s.subject, security_level_key: selected?.default_security_level_key || s.security_level_key }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose template" />
              </SelectTrigger>
              <SelectContent>
                {templates?.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input value={payload.subject} onChange={(e) => setPayload((s) => ({ ...s, subject: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Recipient type</Label>
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
              <div>
                <Label>Issue date</Label>
              </div>
              <SecurityBadge level={payload.security_level_key} />
            </div>
            <Input
              type="date"
              value={payload.issue_date}
              onChange={(e) => setPayload((s) => ({ ...s, issue_date: e.target.value }))}
            />
          </div>
          <TemplateEditor value={payload.body_html} onChange={(value) => setPayload((s) => ({ ...s, body_html: value }))} />
          <Button
            disabled={!payload.template_id || !payload.subject || mutation.isPending}
            onClick={() => mutation.mutate(payload)}
          >
            Issue letter
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Live preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <h3 className="text-lg font-semibold">{payload.subject || "Letter subject"}</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DocumentNumberBadge value={"AUTO"} type="outgoing" />
            <SecurityBadge level={payload.security_level_key} />
          </div>
          <div className="rounded-md border bg-muted/50 p-3 text-sm whitespace-pre-wrap">
            {payload.body_html || "Body preview will appear here"}
          </div>
          {tablePreview.rows.length > 0 && (
            <MassTableBuilder headers={tablePreview.headers} rows={tablePreview.rows} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
