import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { useMarketplaceInvoices } from "@/hooks/useInvoices";
import InvoiceCard from "@/components/invoice/InvoiceCard";
import FundInvoiceModal from "@/components/invoice/FundInvoiceModal";
import { SkeletonCard } from "@/components/ui/Skeleton";
import type { Invoice, MarketplaceFilters } from "@/types";

export default function Marketplace() {
  const [filters, setFilters] = useState<MarketplaceFilters>({
    sortBy: "created",
    sortOrder: "desc",
  });
  const [fundInvoice, setFundInvoice] = useState<Invoice | null>(null);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useMarketplaceInvoices(filters);
  const invoices = data?.data || [];

  const filtered = search
    ? invoices.filter(
        (inv) =>
          inv.id.toLowerCase().includes(search.toLowerCase()) ||
          inv.buyerAddress.toLowerCase().includes(search.toLowerCase())
      )
    : invoices;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Marketplace</h1>
        <p className="mt-1 text-sm text-gray-500">
          Discover and fund invoices from verified creators
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search invoices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-gray-400" />
          <select
            value={filters.sortBy}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                sortBy: e.target.value as MarketplaceFilters["sortBy"],
              }))
            }
            className="text-sm rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
          >
            <option value="created">Recently Created</option>
            <option value="amount">Amount</option>
            <option value="maturity">Maturity Date</option>
            <option value="funded">Funding Progress</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-sm">
            No invoices available in the marketplace right now.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((invoice) => (
            <InvoiceCard
              key={invoice.id}
              invoice={invoice}
              onFund={setFundInvoice}
            />
          ))}
        </div>
      )}

      {fundInvoice && (
        <FundInvoiceModal
          isOpen={!!fundInvoice}
          onClose={() => setFundInvoice(null)}
          invoiceId={fundInvoice.id}
          invoiceAmount={fundInvoice.amount}
          fundedAmount={fundInvoice.fundedAmount}
          currency={fundInvoice.currency}
        />
      )}
    </div>
  );
}
