import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { dmsApi } from "@/lib/api/client";

interface FileUploaderProps {
  ownerType: "incoming" | "outgoing";
  ownerId: string;
}

export function FileUploader({ ownerType, ownerId }: FileUploaderProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState("attachment");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("No file selected");
      const formData = new FormData();
      formData.append("owner_type", ownerType);
      formData.append("owner_id", ownerId);
      formData.append("file_type", fileType);
      formData.append("file", file);
      return dmsApi.files.upload(formData);
    },
    onSuccess: () => {
      toast({ description: "File uploaded" });
      queryClient.invalidateQueries({ queryKey: ["dms", "files", ownerType, ownerId] });
      setFile(null);
    },
    onError: (err: any) => toast({ description: err.message ?? "Failed to upload" }),
  });

  return (
    <div className="space-y-2">
      <Label>Attach file</Label>
      <div className="flex gap-2">
        <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <Input
          className="max-w-[160px]"
          placeholder="attachment"
          value={fileType}
          onChange={(e) => setFileType(e.target.value)}
        />
        <Button disabled={!file || mutation.isPending} onClick={() => mutation.mutate()}>
          Upload
        </Button>
      </div>
    </div>
  );
}
