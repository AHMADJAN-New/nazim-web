import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dmsApi } from "@/lib/api/client";
import type { Letterhead } from "@/types/dms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

export default function LetterheadsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data } = useQuery<Letterhead[]>({ queryKey: ["dms", "letterheads"], queryFn: () => dmsApi.letterheads.list() });
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const mutation = useMutation({
    mutationFn: (formData: FormData) => dmsApi.letterheads.create(formData),
    onSuccess: () => {
      toast({ description: "Letterhead uploaded" });
      setName("");
      setFile(null);
      queryClient.invalidateQueries({ queryKey: ["dms", "letterheads"] });
    },
    onError: (err: any) => toast({ description: err.message ?? "Upload failed" }),
  });

  const handleUpload = () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("name", name || file.name);
    formData.append("file", file);
    mutation.mutate(formData);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Letterheads</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Default layout</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">{record.name}</TableCell>
                  <TableCell>{record.default_for_layout || "-"}</TableCell>
                  <TableCell>{record.active ? "Active" : "Inactive"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload letterhead</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Main portrait" />
          </div>
          <div className="space-y-2">
            <Label>File</Label>
            <Input type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
          <Button disabled={!file || mutation.isPending} onClick={handleUpload} className="w-full">
            Upload
          </Button>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
