import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { dmsApi } from "@/lib/api/client";

export default function DmsSettings() {
  const { toast } = useToast();
  const { data } = useQuery({ queryKey: ["dms", "settings"], queryFn: () => dmsApi.settings.get() });
  const [form, setForm] = useState({ incoming_prefix: "", outgoing_prefix: "", reset_yearly: true, year_mode: "gregorian" });

  const mutation = useMutation({
    mutationFn: (payload: any) => dmsApi.settings.update(payload),
    onSuccess: () => toast({ description: "Settings saved" }),
    onError: (err: any) => toast({ description: err.message ?? "Save failed" }),
  });

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      <Card>
      <CardHeader>
        <CardTitle>Numbering & Security Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Incoming prefix</Label>
            <Input
              defaultValue={data?.incoming_prefix || form.incoming_prefix}
              onChange={(e) => setForm((s) => ({ ...s, incoming_prefix: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Outgoing prefix</Label>
            <Input
              defaultValue={data?.outgoing_prefix || form.outgoing_prefix}
              onChange={(e) => setForm((s) => ({ ...s, outgoing_prefix: e.target.value }))}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Year mode</Label>
          <Input
            defaultValue={data?.year_mode || form.year_mode}
            onChange={(e) => setForm((s) => ({ ...s, year_mode: e.target.value }))}
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={form.reset_yearly}
            onCheckedChange={(checked) => setForm((s) => ({ ...s, reset_yearly: checked }))}
          />
          <Label>Reset numbering yearly</Label>
        </div>
        <Button onClick={() => mutation.mutate(form)}>Save settings</Button>
      </CardContent>
    </Card>
    </div>
  );
}
