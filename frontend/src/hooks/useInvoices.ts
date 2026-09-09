import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { InvoiceStatus, MarketplaceFilters } from "@/types";

export function useInvoices(params?: {
  page?: number;
  limit?: number;
  status?: InvoiceStatus;
  creator?: string;
}) {
  return useQuery({
    queryKey: ["invoices", params],
    queryFn: () => api.invoices.list(params),
  });
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: ["invoice", id],
    queryFn: () => api.invoices.get(id!),
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      buyerAddress: string;
      amount: string;
      currency: string;
      maturityDate: string;
      metadataUri: string;
    }) => api.invoices.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useFundInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { amount: string; txHash: string };
    }) => api.invoices.fund(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function usePurchaseShares() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { shareCount: number; txHash: string };
    }) => api.invoices.purchaseShares(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useSettleInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { txHash: string };
    }) => api.invoices.settle(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["settlements"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useMarketplaceInvoices(filters?: MarketplaceFilters) {
  const params = {
    page: 1,
    limit: 20,
    status: filters?.status as InvoiceStatus | undefined,
  };

  return useQuery({
    queryKey: ["marketplace", filters],
    queryFn: () => api.invoices.list(params),
  });
}
