import { Link } from "react-router-dom";
import { Clock, Users, ArrowRight } from "lucide-react";
import type { Invoice } from "@/types";
import StatusBadge from "@/components/ui/StatusBadge";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  formatCurrency,
  truncateAddress,
  daysUntil,
  formatPercentage,
} from "@/utils/format";

interface InvoiceCardProps {
  invoice: Invoice;
  onFund?: (invoice: Invoice) => void;
}

export default function InvoiceCard({ invoice, onFund }: InvoiceCardProps) {
  const days = daysUntil(invoice.maturityDate);
  const isFundable =
    invoice.status === "pending" ||
    invoice.status === "partially_funded";

  return (
    <Card className="hover:shadow-md transition-shadow group">
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Invoice</p>
            <p className="text-sm font-semibold text-gray-900 font-mono">
              {truncateAddress(invoice.id, 10)}
            </p>
          </div>
          <StatusBadge status={invoice.status} />
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-baseline">
            <span className="text-2xl font-bold text-gray-900">
              {formatCurrency(invoice.amount, invoice.currency)}
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {truncateAddress(invoice.buyerAddress)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {days > 0 ? `${days}d left` : days === 0 ? "Due today" : "Overdue"}
            </span>
          </div>

          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>Funded</span>
              <span>{formatPercentage(invoice.fundedPercentage)}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(invoice.fundedPercentage, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 py-3 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
        <Link
          to={`/invoices/${invoice.id}`}
          className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
        >
          View Details
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>

        {isFundable && onFund && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => onFund(invoice)}
          >
            Fund
          </Button>
        )}
      </div>
    </Card>
  );
}
