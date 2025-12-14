import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dmsApi } from "@/lib/api/client";
import type { IncomingDocument } from "@/types/dms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { DocumentNumberBadge } from "@/components/dms/DocumentNumberBadge";
import { SecurityBadge } from "@/components/dms/SecurityBadge";

const statusOptions = [
  { label: "Pending", value: "pending" },
  { label: "Under review", value: "under_review" },
  { label: "Completed", value: "completed" },
];

export default function IncomingDocuments() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ subject: "", sender_org: "", status: "", security_level_key: "" });

  const { data } = useQuery<IncomingDocument[]>({
    queryKey: ["dms", "incoming", filters],
    queryFn: () => dmsApi.incoming.list({ ...filters, paginate: false }),
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) => dmsApi.incoming.create(payload),
    onSuccess: () => {
      toast({ description: "Incoming document saved" });
      queryClient.invalidateQueries({ queryKey: ["dms", "incoming"] });
    },
    onError: (err: any) => toast({ description: err.message ?? "Failed to save" }),
  });

  const [newDoc, setNewDoc] = useState({ subject: "", sender_org: "", received_date: "" });
  const readyToSave = useMemo(() => !!newDoc.subject && !!newDoc.received_date, [newDoc]);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Incoming Documents</CardTitle>
          <div className="grid gap-3 md:grid-cols-3">
            <Input
              placeholder="Subject contains"
              value={filters.subject}
              onChange={(e) => setFilters((s) => ({ ...s, subject: e.target.value }))}
            />
            <Input
              placeholder="Sender org"
              value={filters.sender_org}
              onChange={(e) => setFilters((s) => ({ ...s, sender_org: e.target.value }))}
            />
            <Select
              value={filters.status}
              onValueChange={(value) => setFilters((s) => ({ ...s, status: value }))}
            >
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
            <Select
              value={filters.security_level_key}
              onValueChange={(value) => setFilters((s) => ({ ...s, security_level_key: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Security" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any</SelectItem>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="internal">Internal</SelectItem>
                <SelectItem value="confidential">Confidential</SelectItem>
                <SelectItem value="secret">Secret</SelectItem>
                <SelectItem value="top_secret">Top Secret</SelectItem>
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
                <TableHead>Sender</TableHead>
                <TableHead>Security</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">
                    <DocumentNumberBadge value={doc.full_indoc_number} type="incoming" />
                  </TableCell>
                  <TableCell>{doc.subject || "No subject"}</TableCell>
                  <TableCell>{doc.sender_org || ""}</TableCell>
                  <TableCell>
                    <SecurityBadge level={doc.security_level_key} />
                  </TableCell>
                  <TableCell>{doc.status}</TableCell>
                  <TableCell className="text-right">{doc.received_date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick capture</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input
              value={newDoc.subject}
              onChange={(e) => setNewDoc((s) => ({ ...s, subject: e.target.value }))}
              placeholder="Exam letter"
            />
          </div>
          <div className="space-y-2">
            <Label>Sender organization</Label>
            <Input
              value={newDoc.sender_org}
              onChange={(e) => setNewDoc((s) => ({ ...s, sender_org: e.target.value }))}
              placeholder="MoE"
            />
          </div>
          <div className="space-y-2">
            <Label>Received date</Label>
            <Input
              type="date"
              value={newDoc.received_date}
              onChange={(e) => setNewDoc((s) => ({ ...s, received_date: e.target.value }))}
            />
          </div>
          <Button
            className="w-full"
            disabled={!readyToSave || createMutation.isPending}
            onClick={() => createMutation.mutate(newDoc)}
          >
            Save incoming
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
