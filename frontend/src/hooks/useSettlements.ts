import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useSettlements(params?: {
  page?: number;
  limit?: number;
  invoiceId?: string;
}) {
  return useQuery({
    queryKey: ["settlements", params],
    queryFn: () => api.settlements.list(params),
  });
}

export function useSettlementsByInvoice(invoiceId: string | undefined) {
  return useQuery({
    queryKey: ["settlements", "invoice", invoiceId],
    queryFn: () => api.settlements.getByInvoice(invoiceId!),
    enabled: !!invoiceId,
  });
}
