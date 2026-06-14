import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { OutingStatus } from "@/types";

const statusConfig: Record<OutingStatus, { label: string; className: string }> = {
  "pending-parent": { label: "Pending Parent", className: "bg-status-pending/15 text-status-pending border-status-pending/30" },
  "parent-approved": { label: "Parent Approved", className: "bg-status-approved/15 text-status-approved border-status-approved/30" },
  "parent-declined": { label: "Parent Declined", className: "bg-status-declined/15 text-status-declined border-status-declined/30" },
  "pending-warden": { label: "Pending Warden", className: "bg-status-pending/15 text-status-pending border-status-pending/30" },
  approved: { label: "Approved", className: "bg-status-approved/15 text-status-approved border-status-approved/30" },
  rejected: { label: "Rejected", className: "bg-status-declined/15 text-status-declined border-status-declined/30" },
  out: { label: "Out", className: "bg-status-out/15 text-status-out border-status-out/30" },
  returned: { label: "Returned", className: "bg-status-returned/15 text-status-returned border-status-returned/30" },
  expired: { label: "Expired", className: "bg-status-returned/15 text-status-returned border-status-returned/30" },
  cancelled: { label: "Cancelled", className: "bg-status-returned/15 text-status-returned border-status-returned/30" },
};

const fallback = { label: "Unknown", className: "bg-status-returned/15 text-status-returned border-status-returned/30" };

export function StatusBadge({ status }: { status: OutingStatus }) {
  const config = statusConfig[status] || fallback;
  return (
    <Badge variant="outline" className={cn("font-semibold text-xs", config.className)}>
      {config.label}
    </Badge>
  );
}

export function CollegeStatusBadge({ status }: { status: "active" | "suspended" }) {
  return (
    <Badge variant="outline" className={cn(
      "font-semibold text-xs",
      status === "active"
        ? "bg-status-approved/15 text-status-approved border-status-approved/30"
        : "bg-status-declined/15 text-status-declined border-status-declined/30"
    )}>
      {status === "active" ? "Active" : "Suspended"}
    </Badge>
  );
}
