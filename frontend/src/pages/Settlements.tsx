import { useSettlements } from "@/hooks/useSettlements";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { formatDate, formatCurrency, truncateAddress } from "@/utils/format";
import { ArrowLeftRight, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/utils/format";

const statusIcons = {
  completed: <CheckCircle className="h-4 w-4 text-success-500" />,
  pending: <Clock className="h-4 w-4 text-warning-500" />,
  failed: <AlertCircle className="h-4 w-4 text-error-500" />,
};

export default function Settlements() {
  const { data, isLoading } = useSettlements({ limit: 50 });
  const settlements = data?.data || [];

  const completed = settlements.filter((s) => s.status === "completed");
  const pending = settlements.filter((s) => s.status === "pending");
  const totalSettled = completed.reduce(
    (sum, s) => sum + parseFloat(s.amount || "0"),
    0
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settlements</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track all invoice settlements and payment history
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardBody>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-success-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Completed</p>
                <p className="text-xl font-bold text-gray-900">
                  {completed.length}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning-50 rounded-lg">
                <Clock className="h-5 w-5 text-warning-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-xl font-bold text-gray-900">
                  {pending.length}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-50 rounded-lg">
                <ArrowLeftRight className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Settled</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(totalSettled.toString())}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-900">
            Settlement History
          </h2>
        </CardHeader>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="p-6">
              <SkeletonTable rows={8} />
            </div>
          ) : settlements.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              No settlements yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">
                      Invoice
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">
                      From
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">
                      To
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">
                      Amount
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">
                      Status
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">
                      Date
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">
                      Tx Hash
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {settlements.map((s) => (
                    <tr
                      key={s.id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-6 py-3.5 text-sm font-mono text-gray-900">
                        {truncateAddress(s.invoiceId, 8)}
                      </td>
                      <td className="px-6 py-3.5 text-sm font-mono text-gray-600">
                        {truncateAddress(s.payerAddress)}
                      </td>
                      <td className="px-6 py-3.5 text-sm font-mono text-gray-600">
                        {truncateAddress(s.payeeAddress)}
                      </td>
                      <td className="px-6 py-3.5 text-sm font-semibold text-gray-900">
                        {formatCurrency(s.amount)}
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 text-xs font-medium capitalize",
                            s.status === "completed"
                              ? "text-success-600"
                              : s.status === "pending"
                                ? "text-warning-600"
                                : "text-error-600"
                          )}
                        >
                          {statusIcons[s.status]}
                          {s.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-sm text-gray-600">
                        {formatDate(s.completedAt || s.createdAt)}
                      </td>
                      <td className="px-6 py-3.5 text-sm font-mono text-primary-600">
                        {truncateAddress(s.txHash, 6)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
