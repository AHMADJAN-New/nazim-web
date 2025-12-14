import { Badge } from "@/components/ui/badge";

const colors: Record<string, string> = {
  public: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100",
  internal: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-100",
  confidential: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-50",
  secret: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-50",
  top_secret: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-50",
};

const labels: Record<string, string> = {
  public: "Public",
  internal: "Internal",
  confidential: "Confidential",
  secret: "Secret",
  top_secret: "Top Secret",
};

interface SecurityBadgeProps {
  level?: string | null;
}

export function SecurityBadge({ level }: SecurityBadgeProps) {
  const normalized = (level || "public").toLowerCase();
  const className = colors[normalized] ?? colors.public;
  const label = labels[normalized] ?? labels.public;

  return <Badge className={className}>{label}</Badge>;
}
