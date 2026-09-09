import { z } from "zod";

export const createInvoiceSchema = z
  .object({
    buyerAddress: z
      .string()
      .min(56, "Invalid Stellar address")
      .max(56, "Invalid Stellar address"),
    amount: z
      .string()
      .min(1, "Amount is required")
      .refine((val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num > 0;
      }, "Amount must be greater than 0"),
    currency: z.string().min(3, "Currency is required").default("USD"),
    maturityDate: z
      .string()
      .min(1, "Maturity date is required")
      .refine((val) => {
        const date = new Date(val);
        const now = new Date();
        return date > now;
      }, "Maturity date must be in the future"),
    metadataUri: z
      .string()
      .url("Must be a valid URL")
      .optional()
      .or(z.literal("")),
  })
  .refine(
    (data) => {
      return data.buyerAddress !== localStorage.getItem("wallet_address");
    },
    {
      message: "Buyer address cannot be your own address",
      path: ["buyerAddress"],
    }
  );

export type CreateInvoiceFormData = z.infer<typeof createInvoiceSchema>;

export const fundInvoiceSchema = z.object({
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    }, "Amount must be greater than 0"),
});

export type FundInvoiceFormData = z.infer<typeof fundInvoiceSchema>;

export const purchaseSharesSchema = z.object({
  shareCount: z
    .number()
    .int("Must be a whole number")
    .min(1, "Must purchase at least 1 share")
    .max(1000, "Cannot exceed 1000 shares per transaction"),
});

export type PurchaseSharesFormData = z.infer<typeof purchaseSharesSchema>;

export const settingsSchema = z.object({
  displayName: z
    .string()
    .max(50, "Display name must be 50 characters or less")
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .email("Invalid email address")
    .optional()
    .or(z.literal("")),
});

export type SettingsFormData = z.infer<typeof settingsSchema>;

export const loginSchema = z.object({
  address: z.string().min(56, "Invalid Stellar address"),
});

export type LoginFormData = z.infer<typeof loginSchema>;
