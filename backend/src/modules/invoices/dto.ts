import { z } from "zod";

export const createInvoiceDto = z.object({
  buyerAddress: z.string().startsWith("G").length(56),
  amount: z.number().positive().max(10_000_000),
  denomination: z.string().default("USDC"),
  sharesTotal: z.number().int().positive().max(10_000),
  metadataUri: z.string().url().optional(),
  maturityDate: z.string().datetime(),
});

export const updateInvoiceDto = z.object({
  buyerAddress: z.string().startsWith("G").length(56).optional(),
  amount: z.number().positive().optional(),
  sharesTotal: z.number().int().positive().optional(),
  metadataUri: z.string().url().optional(),
  maturityDate: z.string().datetime().optional(),
  status: z
    .enum(["PENDING", "ACTIVE", "FUNDED", "SETTLED", "DEFAULTED", "DISPUTED"])
    .optional(),
});

export const fundInvoiceDto = z.object({
  amount: z.number().positive().max(10_000_000),
});

export const purchaseSharesDto = z.object({
  shareCount: z.number().int().positive(),
  pricePerShare: z.number().positive(),
});

export const invoiceQueryDto = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z
    .enum(["PENDING", "ACTIVE", "FUNDED", "SETTLED", "DEFAULTED", "DISPUTED"])
    .optional(),
  search: z.string().optional(),
  sortBy: z
    .enum(["createdAt", "amount", "maturityDate", "status"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  minAmount: z.coerce.number().positive().optional(),
  maxAmount: z.coerce.number().positive().optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceDto>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceDto>;
export type FundInvoiceInput = z.infer<typeof fundInvoiceDto>;
export type PurchaseSharesInput = z.infer<typeof purchaseSharesDto>;
export type InvoiceQueryInput = z.infer<typeof invoiceQueryDto>;
