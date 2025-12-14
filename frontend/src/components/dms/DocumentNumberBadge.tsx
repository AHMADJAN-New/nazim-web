import { Badge } from "@/components/ui/badge";

interface DocumentNumberBadgeProps {
  value?: string | null;
  type?: "incoming" | "outgoing";
}

export function DocumentNumberBadge({ value, type }: DocumentNumberBadgeProps) {
  const label = type === "incoming" ? "IN" : type === "outgoing" ? "OUT" : "DOC";
  return (
    <Badge variant="outline" className="font-mono text-xs">
      <span className="mr-1 rounded-sm bg-muted px-1 text-[10px] uppercase">{label}</span>
      {value || "—"}
    </Badge>
  );
}
