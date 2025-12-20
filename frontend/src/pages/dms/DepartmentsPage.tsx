import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDate, formatDateTime } from '@/lib/utils';
import { dmsApi } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Building } from "lucide-react";

interface Department {
  id: string;
  name: string;
  organization_id: string;
  school_id?: string | null;
  created_at?: string;
}

export default function DepartmentsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<Department[]>({
    queryKey: ["dms", "departments"],
    queryFn: () => dmsApi.departments.list()
  });
  const [form, setForm] = useState({ name: "" });

  const mutation = useMutation({
    mutationFn: (payload: { name: string }) => dmsApi.departments.create(payload),
    onSuccess: () => {
      toast({ description: "Department created successfully" });
      setForm({ name: "" });
      queryClient.invalidateQueries({ queryKey: ["dms", "departments"] });
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        description: err.message ?? "Failed to create department"
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({
        variant: "destructive",
        description: "Department name is required"
      });
      return;
    }
    mutation.mutate(form);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      <div className="flex items-center gap-3">
        <Building className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Departments & Routing</h1>
          <p className="text-muted-foreground">Manage departments and document routing</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Departments</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Loading departments...</p>
            ) : !data || data.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No departments yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((dept) => (
                    <TableRow key={dept.id}>
                      <TableCell className="font-medium">{dept.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {dept.created_at ? formatDate(dept.created_at) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create Department</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Department Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Admin, Finance, Exams, Library"
                  value={form.name}
                  onChange={(e) => setForm({ name: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Examples: Admin, Finance, Exams, Hostel, Library, IT, HR
                </p>
              </div>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Creating..." : "Create Department"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Routing Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Routing rules configuration will be available in future updates. For MVP, documents can be manually assigned to departments.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
