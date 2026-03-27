import { Badge } from "@/components/ui/badge";

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "success" | "warning" | "danger" | "info" }
> = {
  parsing: { label: "Parsing", variant: "info" },
  confirmed: { label: "Confirmed", variant: "info" },
  matching: { label: "Finding a match", variant: "warning" },
  matched: { label: "Matched", variant: "success" },
  in_progress: { label: "In progress", variant: "success" },
  resolved: { label: "Resolved", variant: "success" },
  unmatched: { label: "No match yet", variant: "warning" },
  closed: { label: "Closed", variant: "default" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? { label: status, variant: "default" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
