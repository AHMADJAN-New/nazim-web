import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dmsApi } from "@/lib/api/client";
import type { LetterTemplate } from "@/types/dms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";

export default function TemplatesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data } = useQuery<LetterTemplate[]>({ queryKey: ["dms", "templates"], queryFn: () => dmsApi.templates.list() });
  const [form, setForm] = useState({ name: "", category: "general", body_html: "" });

  const mutation = useMutation({
    mutationFn: (payload: any) => dmsApi.templates.create(payload),
    onSuccess: () => {
      toast({ description: "Template saved" });
      setForm({ name: "", category: "general", body_html: "" });
      queryClient.invalidateQueries({ queryKey: ["dms", "templates"] });
    },
    onError: (err: any) => toast({ description: err.message ?? "Failed to save" }),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Layout</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.map((tpl) => (
                <TableRow key={tpl.id}>
                  <TableCell className="font-medium">{tpl.name}</TableCell>
                  <TableCell>{tpl.category}</TableCell>
                  <TableCell>{tpl.page_layout || "A4"}</TableCell>
                  <TableCell>{tpl.active ? "Active" : "Inactive"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Create template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Input value={form.category} onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Body</Label>
            <Textarea rows={4} value={form.body_html} onChange={(e) => setForm((s) => ({ ...s, body_html: e.target.value }))} />
          </div>
          <div className="flex items-center gap-2">
            <Switch defaultChecked onCheckedChange={(checked) => setForm((s) => ({ ...s, active: checked }))} />
            <Label>Active</Label>
          </div>
          <Button disabled={!form.name || mutation.isPending} onClick={() => mutation.mutate(form)}>
            Save template
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
