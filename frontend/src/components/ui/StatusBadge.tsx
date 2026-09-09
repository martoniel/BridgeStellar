import { cn } from "@/utils/format";
import { InvoiceStatus } from "@/types";

const statusConfig: Record<
  InvoiceStatus,
  { label: string; className: string }
> = {
  [InvoiceStatus.Draft]: {
    label: "Draft",
    className: "bg-gray-100 text-gray-700",
  },
  [InvoiceStatus.Pending]: {
    label: "Pending",
    className: "bg-warning-100 text-warning-700",
  },
  [InvoiceStatus.Funded]: {
    label: "Funded",
    className: "bg-success-100 text-success-700",
  },
  [InvoiceStatus.PartiallyFunded]: {
    label: "Partially Funded",
    className: "bg-primary-100 text-primary-700",
  },
  [InvoiceStatus.Matured]: {
    label: "Matured",
    className: "bg-blue-100 text-blue-700",
  },
  [InvoiceStatus.Settled]: {
    label: "Settled",
    className: "bg-success-100 text-success-700",
  },
  [InvoiceStatus.Defaulted]: {
    label: "Defaulted",
    className: "bg-error-100 text-error-700",
  },
  [InvoiceStatus.Cancelled]: {
    label: "Cancelled",
    className: "bg-gray-100 text-gray-500",
  },
};

interface StatusBadgeProps {
  status: InvoiceStatus;
  size?: "sm" | "md";
}

export default function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig[InvoiceStatus.Draft];

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full",
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm",
        config.className
      )}
    >
      <span
        className={cn(
          "rounded-full mr-1.5",
          size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2",
          status === InvoiceStatus.Settled
            ? "bg-success-500"
            : status === InvoiceStatus.Defaulted
              ? "bg-error-500"
              : status === InvoiceStatus.Funded
                ? "bg-success-500"
                : status === InvoiceStatus.Pending
                  ? "bg-warning-500"
                  : "bg-gray-400"
        )}
      />
      {config.label}
    </span>
  );
}
