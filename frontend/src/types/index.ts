export enum InvoiceStatus {
  Draft = "draft",
  Pending = "pending",
  Funded = "funded",
  PartiallyFunded = "partially_funded",
  Matured = "matured",
  Settled = "settled",
  Defaulted = "defaulted",
  Cancelled = "cancelled",
}

export interface Invoice {
  id: string;
  contractId: string;
  creatorAddress: string;
  buyerAddress: string;
  amount: string;
  currency: string;
  fundedAmount: string;
  maturityDate: string;
  createdAt: string;
  updatedAt: string;
  status: InvoiceStatus;
  metadataUri: string;
  shares: Share[];
  settlements: Settlement[];
  fundedPercentage: number;
  estimatedReturn: string;
}

export interface Share {
  id: string;
  invoiceId: string;
  ownerAddress: string;
  shareCount: number;
  purchasePrice: string;
  purchasedAt: string;
  currentValue: string;
}

export interface Settlement {
  id: string;
  invoiceId: string;
  payerAddress: string;
  payeeAddress: string;
  amount: string;
  txHash: string;
  status: "pending" | "completed" | "failed";
  createdAt: string;
  completedAt: string | null;
}

export interface User {
  id: string;
  address: string;
  email: string | null;
  displayName: string | null;
  createdAt: string;
  totalInvoices: number;
  totalFunded: string;
  portfolioValue: string;
}

export interface WalletInfo {
  address: string;
  network: "testnet" | "public";
  isConnected: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DashboardStats {
  totalInvoices: number;
  totalFunded: string;
  pendingSettlements: number;
  portfolioValue: string;
  fundedPercentage: number;
  monthlyChange: number;
}

export interface PortfolioDataPoint {
  date: string;
  value: number;
}

export interface MarketplaceFilters {
  status?: InvoiceStatus;
  minAmount?: string;
  maxAmount?: string;
  currency?: string;
  sortBy?: "amount" | "maturity" | "funded" | "created";
  sortOrder?: "asc" | "desc";
}
