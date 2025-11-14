import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HostelAttendanceRecord } from "@/hooks/useHostel";

interface AttendanceRowProps {
  record: HostelAttendanceRecord;
  studentName?: string;
  studentId?: string;
  roomNumber?: string;
  building?: string;
}

const statusVariants = {
  present: "default",
  absent: "destructive",
  late: "secondary",
} as const;

const statusIcons = {
  present: CheckCircle,
  absent: XCircle,
  late: AlertCircle,
};

export function AttendanceRow({ record, studentName, studentId, roomNumber, building }: AttendanceRowProps) {
  const StatusIcon = statusIcons[record.status];
  
  return (
    <TableRow>
      <TableCell>
        <div>
          <div className="font-medium">{studentName || "Unknown"}</div>
          <div className="text-sm text-muted-foreground">{studentId}</div>
        </div>
      </TableCell>
      <TableCell>{roomNumber}</TableCell>
      <TableCell>{building}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <StatusIcon
            className={cn("h-4 w-4", {
              "text-green-600": record.status === "present",
              "text-red-600": record.status === "absent",
              "text-orange-600": record.status === "late",
            })}
          />
          <Badge variant={statusVariants[record.status]}>
            {record.status}
          </Badge>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">{record.remarks || "—"}</TableCell>
    </TableRow>
  );
}
