import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, LayoutGrid, List } from "lucide-react";
import { useInvoices } from "@/hooks/useInvoices";
import { useWallet } from "@/hooks/useWallet";
import type { InvoiceStatus } from "@/types";
import InvoiceCard from "@/components/invoice/InvoiceCard";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import StatusBadge from "@/components/ui/StatusBadge";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { cn } from "@/utils/format";

const statusFilters: (InvoiceStatus | "all")[] = [
  "all",
  "pending",
  "partially_funded",
  "funded",
  "matured",
  "settled",
];

export default function Invoices() {
  const { address } = useWallet();
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useInvoices({
    limit: 50,
    creator: address || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

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
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Invoices</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage and track your invoices
          </p>
        </div>
        <Link to="/invoices/new">
          <Button icon={<Plus className="h-4 w-4" />}>New Invoice</Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          {statusFilters.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                statusFilter === status
                  ? "bg-primary-100 text-primary-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {status === "all" ? "All" : status.replace("_", " ")}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search invoices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
            />
          </div>
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-2 transition-colors",
                viewMode === "grid"
                  ? "bg-primary-50 text-primary-600"
                  : "text-gray-400 hover:text-gray-600"
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-2 transition-colors",
                viewMode === "list"
                  ? "bg-primary-50 text-primary-600"
                  : "text-gray-400 hover:text-gray-600"
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div
          className={cn(
            viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              : "space-y-4"
          )}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            No invoices found
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            {search
              ? "Try adjusting your search or filters"
              : "Create your first invoice to get started"}
          </p>
          <Link to="/invoices/new">
            <Button icon={<Plus className="h-4 w-4" />}>Create Invoice</Button>
          </Link>
        </div>
      ) : (
        <div
          className={cn(
            viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              : "space-y-4"
          )}
        >
          {filtered.map((invoice) => (
            <InvoiceCard key={invoice.id} invoice={invoice} />
          ))}
        </div>
      )}
    </div>
  );
}
