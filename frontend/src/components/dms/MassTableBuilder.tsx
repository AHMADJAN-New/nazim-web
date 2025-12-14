import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface MassTableBuilderProps {
  headers: string[];
  rows: Array<Array<string | number>>;
}

export function MassTableBuilder({ headers, rows }: MassTableBuilderProps) {
  const previewRows = useMemo(() => rows.slice(0, 10), [rows]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mass announcement preview</CardTitle>
        <p className="text-sm text-muted-foreground">Showing first {previewRows.length} of {rows.length} rows.</p>
      </CardHeader>
      <CardContent className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map((header) => (
                <TableHead key={header}>{header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {previewRows.map((row, idx) => (
              <TableRow key={idx}>
                {row.map((cell, cellIdx) => (
                  <TableCell key={cellIdx}>{cell}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
