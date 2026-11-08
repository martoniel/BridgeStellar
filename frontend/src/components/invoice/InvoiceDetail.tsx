import {
  Users,
  Calendar,
  Link2,
  TrendingUp,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import type { Invoice } from "@/types";
import { InvoiceStatus } from "@/types";
import StatusBadge from "@/components/ui/StatusBadge";
import Button from "@/components/ui/Button";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import {
  formatCurrency,
  formatDate,
  formatPercentage,
  truncateAddress,
  daysUntil,
} from "@/utils/format";

interface InvoiceDetailProps {
  invoice: Invoice;
  onFund?: () => void;
  onPurchaseShares?: () => void;
  onSettle?: () => void;
}

const timelineSteps = [
  { status: InvoiceStatus.Pending, label: "Created" },
  { status: InvoiceStatus.PartiallyFunded, label: "Funding" },
  { status: InvoiceStatus.Funded, label: "Funded" },
  { status: InvoiceStatus.Matured, label: "Matured" },
  { status: InvoiceStatus.Settled, label: "Settled" },
];

function StatusTimeline({ currentStatus }: { currentStatus: InvoiceStatus }) {
  const statusOrder = [
    InvoiceStatus.Pending,
    InvoiceStatus.PartiallyFunded,
    InvoiceStatus.Funded,
    InvoiceStatus.Matured,
    InvoiceStatus.Settled,
  ];
  const currentIndex = statusOrder.indexOf(currentStatus);

  return (
    <div className="flex items-center justify-between">
      {timelineSteps.map((step, i) => {
        const isCompleted =
          currentIndex >= statusOrder.indexOf(step.status);
        const isCurrent = currentStatus === step.status;
        const isFailed = currentStatus === InvoiceStatus.Defaulted;

        return (
          <div key={step.status} className="flex-1 flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  isFailed
                    ? "bg-error-100 text-error-600"
                    : isCompleted
                      ? "bg-success-500 text-white"
                      : isCurrent
                        ? "bg-primary-600 text-white ring-4 ring-primary-100"
                        : "bg-gray-200 text-gray-500"
                }`}
              >
                {isCompleted && !isFailed ? (
                  <CheckCircle className="h-4 w-4" />
                ) : isFailed ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`text-xs mt-1.5 font-medium ${
                  isCompleted || isCurrent ? "text-gray-900" : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < timelineSteps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 ${
                  isCompleted && !isFailed
                    ? "bg-success-300"
                    : "bg-gray-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function InvoiceDetail({
  invoice,
  onFund,
  onPurchaseShares,
  onSettle,
}: InvoiceDetailProps) {
  const days = daysUntil(invoice.maturityDate);
  const isMatured = invoice.status === InvoiceStatus.Matured;
  const canFund =
    invoice.status === InvoiceStatus.Pending ||
    invoice.status === InvoiceStatus.PartiallyFunded;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">Invoice Details</h1>
            <StatusBadge status={invoice.status} size="md" />
          </div>
          <p className="text-sm text-gray-500 font-mono">{invoice.id}</p>
        </div>
        <div className="flex gap-2">
          {canFund && onFund && (
            <Button onClick={onFund}>Fund Invoice</Button>
          )}
          {canFund && onPurchaseShares && (
            <Button variant="secondary" onClick={onPurchaseShares}>
              Purchase Shares
            </Button>
          )}
          {isMatured && onSettle && (
            <Button variant="success" onClick={onSettle}>
              Settle
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardBody>
          <StatusTimeline currentStatus={invoice.status} />
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardBody>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-primary-50 rounded-lg">
                <TrendingUp className="h-5 w-5 text-primary-600" />
              </div>
              <span className="text-sm text-gray-500">Invoice Amount</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(invoice.amount, invoice.currency)}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-success-50 rounded-lg">
                <Users className="h-5 w-5 text-success-600" />
              </div>
              <span className="text-sm text-gray-500">Funded</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(invoice.fundedAmount, invoice.currency)}
            </p>
            <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-success-500 rounded-full transition-all"
                style={{ width: `${Math.min(invoice.fundedPercentage, 100)}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {formatPercentage(invoice.fundedPercentage)} funded
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-warning-50 rounded-lg">
                <Calendar className="h-5 w-5 text-warning-600" />
              </div>
              <span className="text-sm text-gray-500">Maturity</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatDate(invoice.maturityDate)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {days > 0
                ? `${days} days remaining`
                : days === 0
                  ? "Due today"
                  : `${Math.abs(days)} days overdue`}
            </p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-gray-900">Details</h3>
        </CardHeader>
        <CardBody>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <dt className="text-xs text-gray-500 mb-1">Creator</dt>
              <dd className="text-sm font-mono text-gray-900 break-all">
                {invoice.creatorAddress}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 mb-1">Buyer</dt>
              <dd className="text-sm font-mono text-gray-900 break-all">
                {invoice.buyerAddress}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 mb-1">Contract ID</dt>
              <dd className="text-sm font-mono text-gray-900 break-all">
                {invoice.contractId}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 mb-1">Estimated Return</dt>
              <dd className="text-sm font-semibold text-success-600">
                {formatCurrency(invoice.estimatedReturn, invoice.currency)}
              </dd>
            </div>
            {invoice.metadataUri && (
              <div className="sm:col-span-2">
                <dt className="text-xs text-gray-500 mb-1">Metadata</dt>
                <dd className="text-sm text-primary-600 break-all flex items-center gap-1">
                  <Link2 className="h-3.5 w-3.5 flex-shrink-0" />
                  <a
                    href={invoice.metadataUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {invoice.metadataUri}
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </CardBody>
      </Card>

      {invoice.shares.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-gray-900">
              Share Allocation ({invoice.shares.length})
            </h3>
          </CardHeader>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-4">
                      Owner
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-4">
                      Shares
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-4">
                      Price
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 pb-2">
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {invoice.shares.map((share) => (
                    <tr key={share.id}>
                      <td className="py-2.5 pr-4 font-mono text-gray-900">
                        {truncateAddress(share.ownerAddress)}
                      </td>
                      <td className="py-2.5 pr-4 text-gray-900">
                        {share.shareCount}
                      </td>
                      <td className="py-2.5 pr-4 text-gray-600">
                        {formatCurrency(share.purchasePrice, invoice.currency)}
                      </td>
                      <td className="py-2.5 text-gray-900 font-medium">
                        {formatCurrency(share.currentValue, invoice.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
