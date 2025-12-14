import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dmsApi } from "@/lib/api/client";
import type { OutgoingDocument } from "@/types/dms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { DocumentNumberBadge } from "@/components/dms/DocumentNumberBadge";
import { SecurityBadge } from "@/components/dms/SecurityBadge";
import { PdfPreviewDrawer } from "@/components/dms/PdfPreviewDrawer";

const statusOptions = [
  { label: "Draft", value: "draft" },
  { label: "Issued", value: "issued" },
  { label: "Printed", value: "printed" },
];

export default function OutgoingDocuments() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ subject: "", recipient_type: "", status: "" });

  const { data } = useQuery<OutgoingDocument[]>({
    queryKey: ["dms", "outgoing", filters],
    queryFn: () => dmsApi.outgoing.list({ ...filters, paginate: false }),
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) => dmsApi.outgoing.create(payload),
    onSuccess: () => {
      toast({ description: "Outgoing saved" });
      queryClient.invalidateQueries({ queryKey: ["dms", "outgoing"] });
    },
    onError: (err: any) => toast({ description: err.message ?? "Failed to save" }),
  });

  const pdfMutation = useMutation({
    mutationFn: (id: string) => dmsApi.outgoing.generatePdf(id),
    onSuccess: () => {
      toast({ description: "PDF generated" });
      queryClient.invalidateQueries({ queryKey: ["dms", "outgoing"] });
    },
    onError: (err: any) => toast({ description: err.message ?? "Failed to generate PDF" }),
  });

  const [newDoc, setNewDoc] = useState({ subject: "", recipient_type: "external", issue_date: "", body_html: "" });
  const readyToSave = useMemo(() => !!newDoc.subject && !!newDoc.issue_date, [newDoc]);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Outgoing Documents</CardTitle>
          <div className="grid gap-3 md:grid-cols-3">
            <Input
              placeholder="Subject contains"
              value={filters.subject}
              onChange={(e) => setFilters((s) => ({ ...s, subject: e.target.value }))}
            />
            <Select value={filters.recipient_type} onValueChange={(value) => setFilters((s) => ({ ...s, recipient_type: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Recipient type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any</SelectItem>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="applicant">Applicant</SelectItem>
                <SelectItem value="external">External</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.status} onValueChange={(value) => setFilters((s) => ({ ...s, status: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any status</SelectItem>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Security</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Issued</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">
                    <DocumentNumberBadge value={doc.full_outdoc_number} type="outgoing" />
                  </TableCell>
                  <TableCell>{doc.subject || "No subject"}</TableCell>
                  <TableCell>{doc.recipient_type}</TableCell>
                  <TableCell>
                    <SecurityBadge level={doc.security_level_key} />
                  </TableCell>
                  <TableCell>{doc.status}</TableCell>
                  <TableCell className="text-right">{doc.issue_date}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pdfMutation.isPending}
                      onClick={() => pdfMutation.mutate(doc.id)}
                    >
                      Generate PDF
                    </Button>
                    <PdfPreviewDrawer
                      triggerLabel="Preview"
                      url={doc.pdf_path ? `/storage/${doc.pdf_path}` : undefined}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick issue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input
              value={newDoc.subject}
              onChange={(e) => setNewDoc((s) => ({ ...s, subject: e.target.value }))}
              placeholder="Fee reminder"
            />
          </div>
          <div className="space-y-2">
            <Label>Recipient type</Label>
            <Select
              value={newDoc.recipient_type}
              onValueChange={(value) => setNewDoc((s) => ({ ...s, recipient_type: value }))}
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
            <Label>Issue date</Label>
            <Input
              type="date"
              value={newDoc.issue_date}
              onChange={(e) => setNewDoc((s) => ({ ...s, issue_date: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Body</Label>
            <Textarea
              rows={3}
              value={newDoc.body_html}
              onChange={(e) => setNewDoc((s) => ({ ...s, body_html: e.target.value }))}
              placeholder="Short body or notes"
            />
          </div>
          <Button
            className="w-full"
            disabled={!readyToSave || createMutation.isPending}
            onClick={() => createMutation.mutate(newDoc)}
          >
            Save outgoing
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
