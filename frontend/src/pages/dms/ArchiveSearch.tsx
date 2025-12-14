import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { dmsApi } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function ArchiveSearch() {
  const [query, setQuery] = useState("");
  const { data } = useQuery({
    queryKey: ["dms", "archive", query],
    queryFn: () => dmsApi.archive(query),
    enabled: query.length > 2,
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Archive & Search</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Search by number, subject, sender" value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold">Incoming</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Subject</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.incoming?.map((row: any) => (
                    <TableRow key={`in-${row.id}`}>
                      <TableCell className="font-medium">{row.reference}</TableCell>
                      <TableCell>{row.subject}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold">Outgoing</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Subject</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.outgoing?.map((row: any) => (
                    <TableRow key={`out-${row.id}`}>
                      <TableCell className="font-medium">{row.reference}</TableCell>
                      <TableCell>{row.subject}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
