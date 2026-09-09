import { FileText, DollarSign, Clock, TrendingUp } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useInvoices } from "@/hooks/useInvoices";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import StatsCard from "@/components/dashboard/StatsCard";
import RecentInvoices from "@/components/dashboard/RecentInvoices";
import PortfolioChart from "@/components/dashboard/PortfolioChart";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { SkeletonCard, SkeletonTable } from "@/components/ui/Skeleton";
import { formatCurrency } from "@/utils/format";

export default function Dashboard() {
  const { address } = useWallet();

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard", "stats", address],
    queryFn: () => api.dashboard.getStats(address!),
    enabled: !!address,
  });

  const { data: portfolioData, isLoading: portfolioLoading } = useQuery({
    queryKey: ["dashboard", "portfolio", address],
    queryFn: () => api.dashboard.getPortfolioHistory(address!, 30),
    enabled: !!address,
  });

  const { data: invoicesData, isLoading: invoicesLoading } = useInvoices({
    limit: 5,
    creator: address || undefined,
  });

  const stats = statsData?.data;
  const invoices = invoicesData?.data || [];
  const portfolio = portfolioData?.data || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your invoice factoring activity
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatsCard
              icon={<FileText className="h-5 w-5" />}
              label="Total Invoices"
              value={String(stats?.totalInvoices || 0)}
              trend={stats?.monthlyChange}
              trendLabel="vs last month"
            />
            <StatsCard
              icon={<DollarSign className="h-5 w-5" />}
              label="Total Funded"
              value={formatCurrency(stats?.totalFunded || "0")}
              trend={8.2}
              trendLabel="vs last month"
            />
            <StatsCard
              icon={<Clock className="h-5 w-5" />}
              label="Pending Settlements"
              value={String(stats?.pendingSettlements || 0)}
            />
            <StatsCard
              icon={<TrendingUp className="h-5 w-5" />}
              label="Portfolio Value"
              value={formatCurrency(stats?.portfolioValue || "0")}
              trend={5.1}
              trendLabel="vs last month"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-900">
              Recent Invoices
            </h2>
          </CardHeader>
          <CardBody className="p-0">
            {invoicesLoading ? (
              <div className="p-6">
                <SkeletonTable rows={5} />
              </div>
            ) : (
              <RecentInvoices invoices={invoices} />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-900">
              Portfolio Value
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Last 30 days</p>
          </CardHeader>
          <CardBody>
            {portfolioLoading ? (
              <div className="h-64">
                <SkeletonCard />
              </div>
            ) : (
              <PortfolioChart data={portfolio} />
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
