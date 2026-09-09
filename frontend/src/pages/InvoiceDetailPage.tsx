import { useState } from "react";
import { useParams } from "react-router-dom";
import { useInvoice } from "@/hooks/useInvoices";
import InvoiceDetail from "@/components/invoice/InvoiceDetail";
import FundInvoiceModal from "@/components/invoice/FundInvoiceModal";
import PurchaseSharesModal from "@/components/invoice/PurchaseSharesModal";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { AlertCircle } from "lucide-react";

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useInvoice(id);
  const [fundModalOpen, setFundModalOpen] = useState(false);
  const [sharesModalOpen, setSharesModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-error-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Invoice Not Found
          </h2>
          <p className="text-sm text-gray-500">
            {error instanceof Error
              ? error.message
              : "The invoice you're looking for doesn't exist or you don't have access."}
          </p>
        </div>
      </div>
    );
  }

  const invoice = data.data;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <InvoiceDetail
        invoice={invoice}
        onFund={() => setFundModalOpen(true)}
        onPurchaseShares={() => setSharesModalOpen(true)}
      />

      <FundInvoiceModal
        isOpen={fundModalOpen}
        onClose={() => setFundModalOpen(false)}
        invoiceId={invoice.id}
        invoiceAmount={invoice.amount}
        fundedAmount={invoice.fundedAmount}
        currency={invoice.currency}
      />

      <PurchaseSharesModal
        isOpen={sharesModalOpen}
        onClose={() => setSharesModalOpen(false)}
        invoiceId={invoice.id}
        invoiceAmount={invoice.amount}
        fundedAmount={invoice.fundedAmount}
        currency={invoice.currency}
        sharePrice={100}
        totalShares={100}
      />
    </div>
  );
}
