import { Link } from "react-router-dom";
import { Eye } from "lucide-react";
import type { Invoice } from "@/types";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatCurrency, formatDate, truncateAddress } from "@/utils/format";

interface RecentInvoicesProps {
  invoices: Invoice[];
}

export default function RecentInvoices({ invoices }: RecentInvoicesProps) {
  if (invoices.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-sm">No invoices yet. Create your first invoice to get started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 pr-4">
              Invoice
            </th>
            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 pr-4">
              Buyer
            </th>
            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 pr-4">
              Amount
            </th>
            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 pr-4">
              Maturity
            </th>
            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 pr-4">
              Status
            </th>
            <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {invoices.map((invoice) => (
            <tr
              key={invoice.id}
              className="hover:bg-gray-50/50 transition-colors"
            >
              <td className="py-3.5 pr-4">
                <span className="text-sm font-medium text-gray-900 font-mono">
                  {truncateAddress(invoice.id, 8)}
                </span>
              </td>
              <td className="py-3.5 pr-4">
                <span className="text-sm text-gray-600 font-mono">
                  {truncateAddress(invoice.buyerAddress)}
                </span>
              </td>
              <td className="py-3.5 pr-4">
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(invoice.amount, invoice.currency)}
                </span>
              </td>
              <td className="py-3.5 pr-4">
                <span className="text-sm text-gray-600">
                  {formatDate(invoice.maturityDate)}
                </span>
              </td>
              <td className="py-3.5 pr-4">
                <StatusBadge status={invoice.status} />
              </td>
              <td className="py-3.5 text-right">
                <Link
                  to={`/invoices/${invoice.id}`}
                  className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  <Eye className="h-4 w-4" />
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
