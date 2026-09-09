import type {
  ApiResponse,
  PaginatedResponse,
  Invoice,
  Settlement,
  User,
  DashboardStats,
  PortfolioDataPoint,
  InvoiceStatus,
} from "@/types";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const walletAddress = localStorage.getItem("wallet_address");
  if (walletAddress) {
    (headers as Record<string, string>)["X-Wallet-Address"] = walletAddress;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(
      body.error || body.message || `Request failed: ${response.statusText}`,
      response.status
    );
  }

  return response.json();
}

export const api = {
  invoices: {
    list: (params?: {
      page?: number;
      limit?: number;
      status?: InvoiceStatus;
      creator?: string;
    }): Promise<PaginatedResponse<Invoice>> => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set("page", String(params.page));
      if (params?.limit) searchParams.set("limit", String(params.limit));
      if (params?.status) searchParams.set("status", params.status);
      if (params?.creator) searchParams.set("creator", params.creator);
      const query = searchParams.toString();
      return request(`/invoices${query ? `?${query}` : ""}`);
    },

    get: (id: string): Promise<ApiResponse<Invoice>> =>
      request(`/invoices/${id}`),

    create: (data: {
      buyerAddress: string;
      amount: string;
      currency: string;
      maturityDate: string;
      metadataUri: string;
    }): Promise<ApiResponse<Invoice>> =>
      request("/invoices", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    fund: (
      id: string,
      data: { amount: string; txHash: string }
    ): Promise<ApiResponse<Invoice>> =>
      request(`/invoices/${id}/fund`, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    purchaseShares: (
      id: string,
      data: { shareCount: number; txHash: string }
    ): Promise<ApiResponse<Invoice>> =>
      request(`/invoices/${id}/shares`, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    settle: (
      id: string,
      data: { txHash: string }
    ): Promise<ApiResponse<Invoice>> =>
      request(`/invoices/${id}/settle`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  settlements: {
    list: (params?: {
      page?: number;
      limit?: number;
      invoiceId?: string;
    }): Promise<PaginatedResponse<Settlement>> => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set("page", String(params.page));
      if (params?.limit) searchParams.set("limit", String(params.limit));
      if (params?.invoiceId) searchParams.set("invoiceId", params.invoiceId);
      const query = searchParams.toString();
      return request(`/settlements${query ? `?${query}` : ""}`);
    },

    getByInvoice: (invoiceId: string): Promise<ApiResponse<Settlement[]>> =>
      request(`/invoices/${invoiceId}/settlements`),
  },

  users: {
    get: (address: string): Promise<ApiResponse<User>> =>
      request(`/users/${address}`),

    upsert: (data: {
      email?: string;
      displayName?: string;
    }): Promise<ApiResponse<User>> =>
      request("/users", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  dashboard: {
    getStats: (address: string): Promise<ApiResponse<DashboardStats>> =>
      request(`/dashboard/stats?address=${address}`),

    getPortfolioHistory: (
      address: string,
      days?: number
    ): Promise<ApiResponse<PortfolioDataPoint[]>> =>
      request(
        `/dashboard/portfolio?address=${address}${days ? `&days=${days}` : ""}`
      ),
  },
};

export { ApiError };
