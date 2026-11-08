import { PrismaClient, InvoiceStatus } from "@prisma/client";
import { AppError } from "../../middleware/errorHandler";
import {
  CreateInvoiceInput,
  UpdateInvoiceInput,
  FundInvoiceInput,
  PurchaseSharesInput,
  InvoiceQueryInput,
} from "./dto";
import * as stellarService from "../../services/stellar";
import { cacheGet, cacheSet, cacheDel } from "../../services/redis";
import { createNotification } from "../../services/notifications";

const prisma = new PrismaClient();

/** The wallet that must sign the on-chain invocation for this user. */
async function getStellarAddress(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stellarAddress: true },
  });
  if (!user) {
    throw new AppError(404, "User not found");
  }
  return user.stellarAddress;
}

export async function listInvoices(query: InvoiceQueryInput, userId?: string) {
  const cacheKey = `invoices:list:${JSON.stringify(query)}:${userId || "all"}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const { page, limit, status, search, sortBy, sortOrder, startDate, endDate, minAmount, maxAmount } = query;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (userId) where.creatorId = userId;
  if (startDate || endDate) {
    where.createdAt = {
      ...(startDate ? { gte: new Date(startDate) } : {}),
      ...(endDate ? { lte: new Date(endDate) } : {}),
    };
  }
  if (minAmount || maxAmount) {
    where.amount = {
      ...(minAmount ? { gte: minAmount } : {}),
      ...(maxAmount ? { lte: maxAmount } : {}),
    };
  }
  if (search) {
    where.OR = [
      { buyerAddress: { contains: search, mode: "insensitive" } },
      { metadataUri: { contains: search, mode: "insensitive" } },
    ];
  }

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: {
        creator: { select: { id: true, name: true, email: true, stellarAddress: true } },
        shares: { select: { id: true, shareCount: true, purchasePrice: true, purchasedAt: true } },
        settlement: true,
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.invoice.count({ where }),
  ]);

  const result = {
    data: invoices,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };

  await cacheSet(cacheKey, result, 60);
  return result;
}

export async function getInvoiceById(id: string) {
  const cacheKey = `invoice:${id}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, name: true, email: true, stellarAddress: true } },
      shares: {
        include: {
          holder: { select: { id: true, name: true, stellarAddress: true } },
        },
      },
      settlement: true,
    },
  });

  if (!invoice) {
    throw new AppError(404, "Invoice not found");
  }

  await cacheSet(cacheKey, invoice, 120);
  return invoice;
}

export async function createInvoice(input: CreateInvoiceInput, userId: string) {
  const invoice = await prisma.invoice.create({
    data: {
      creatorId: userId,
      buyerAddress: input.buyerAddress,
      amount: input.amount,
      denomination: input.denomination,
      sharesTotal: input.sharesTotal,
      metadataUri: input.metadataUri,
      maturityDate: new Date(input.maturityDate),
      status: "PENDING",
    },
    include: {
      creator: { select: { id: true, name: true, email: true, stellarAddress: true } },
    },
  });

  let txXdr: string | undefined;

  try {
    const prepared = await stellarService.createInvoiceOnChain({
      creatorAddress: invoice.creator.stellarAddress,
      buyerAddress: invoice.buyerAddress,
      amount: invoice.amount,
      denom: invoice.denomination,
      sharesTotal: invoice.sharesTotal,
      maturityDate: invoice.maturityDate,
      metadataUri: invoice.metadataUri || `factbridge://invoice/${invoice.id}`,
    });

    if (prepared) {
      txXdr = prepared.xdr;
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          contractInvoiceId: String(prepared.invoiceId),
          status: "ACTIVE",
        },
      });
      invoice.contractInvoiceId = String(prepared.invoiceId);
    }
  } catch (err) {
    console.error("Failed to prepare invoice creation transaction:", err);
  }

  await cacheDel(`invoices:list:*`);
  return { ...invoice, status: "ACTIVE" as const, txXdr };
}

export async function updateInvoice(id: string, input: UpdateInvoiceInput, userId: string) {
  const existing = await prisma.invoice.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, "Invoice not found");
  }
  if (existing.creatorId !== userId) {
    throw new AppError(403, "Not authorized to update this invoice");
  }

  const invoice = await prisma.invoice.update({
    where: { id },
    data: {
      ...input,
      maturityDate: input.maturityDate ? new Date(input.maturityDate) : undefined,
    },
    include: {
      creator: { select: { id: true, name: true, email: true, stellarAddress: true } },
    },
  });

  await cacheDel(`invoice:${id}`);
  await cacheDel(`invoices:list:*`);
  return invoice;
}

export async function fundInvoice(id: string, input: FundInvoiceInput, userId: string) {
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) {
    throw new AppError(404, "Invoice not found");
  }
  if (invoice.status !== "ACTIVE") {
    throw new AppError(400, "Invoice is not in ACTIVE status");
  }

  const newFundedAmount = invoice.fundedAmount + input.amount;
  if (newFundedAmount > invoice.amount) {
    throw new AppError(400, "Funding amount exceeds invoice total");
  }

  let txXdr: string | undefined;
  if (invoice.contractInvoiceId) {
    try {
      txXdr = await stellarService.fundInvoiceOnChain({
        funderAddress: await getStellarAddress(userId),
        invoiceId: Number(invoice.contractInvoiceId),
        amount: input.amount,
      });
    } catch (err) {
      console.error("Failed to prepare funding transaction:", err);
    }
  }

  const updated = await prisma.invoice.update({
    where: { id },
    data: {
      fundedAmount: newFundedAmount,
      status: newFundedAmount >= invoice.amount ? "FUNDED" : invoice.status,
    },
    include: {
      creator: { select: { id: true, name: true, email: true, stellarAddress: true } },
    },
  });

  await createNotification({
    userId: invoice.creatorId,
    type: "INVOICE_FUNDED",
    message: `Invoice ${id} received funding of ${input.amount} ${invoice.denomination}`,
  });

  await cacheDel(`invoice:${id}`);
  await cacheDel(`invoices:list:*`);
  return { invoice: updated, txXdr };
}

export async function purchaseShares(
  id: string,
  input: PurchaseSharesInput,
  userId: string
) {
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) {
    throw new AppError(404, "Invoice not found");
  }
  if (invoice.status !== "ACTIVE" && invoice.status !== "FUNDED") {
    throw new AppError(400, "Invoice is not available for share purchase");
  }

  const availableShares = invoice.sharesTotal - invoice.sharesSold;
  if (input.shareCount > availableShares) {
    throw new AppError(
      400,
      `Only ${availableShares} shares available`
    );
  }

  const totalCost = input.shareCount * input.pricePerShare;

  let txXdr: string | undefined;
  if (invoice.contractInvoiceId) {
    try {
      txXdr = await stellarService.purchaseSharesOnChain({
        investorAddress: await getStellarAddress(userId),
        invoiceId: Number(invoice.contractInvoiceId),
        shareCount: input.shareCount,
      });
    } catch (err) {
      console.error("Failed to prepare share purchase transaction:", err);
    }
  }

  const [share, updatedInvoice] = await prisma.$transaction([
    prisma.share.create({
      data: {
        invoiceId: id,
        holderId: userId,
        shareCount: input.shareCount,
        purchasePrice: totalCost,
      },
    }),
    prisma.invoice.update({
      where: { id },
      data: { sharesSold: invoice.sharesSold + input.shareCount },
    }),
  ]);

  await createNotification({
    userId: invoice.creatorId,
    type: "SHARES_PURCHASED",
    message: `${input.shareCount} shares of your invoice were purchased for ${totalCost} ${invoice.denomination}`,
  });

  await cacheDel(`invoice:${id}`);
  await cacheDel(`invoices:list:*`);
  return { share, txXdr };
}

export async function settleInvoice(id: string, userId: string) {
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) {
    throw new AppError(404, "Invoice not found");
  }
  if (invoice.status !== "FUNDED") {
    throw new AppError(400, "Only FUNDED invoices can be settled");
  }

  let txXdr: string | undefined;
  if (invoice.contractInvoiceId) {
    try {
      txXdr = await stellarService.settleInvoiceOnChain({
        buyerAddress: await getStellarAddress(userId),
        invoiceId: Number(invoice.contractInvoiceId),
      });
    } catch (err) {
      console.error("Failed to prepare settlement transaction:", err);
    }
  }

  // The buyer repays the invoice face value on-chain; funders keep the spread.
  const settlementAmount = invoice.amount;

  const [settlement, updatedInvoice] = await prisma.$transaction([
    prisma.settlement.create({
      data: {
        invoiceId: id,
        settlementAmount,
      },
    }),
    prisma.invoice.update({
      where: { id },
      data: { status: "SETTLED" },
    }),
  ]);

  await createNotification({
    userId: invoice.creatorId,
    type: "INVOICE_SETTLED",
    message: `Invoice ${id} has been settled for ${settlementAmount} ${invoice.denomination}`,
  });

  await cacheDel(`invoice:${id}`);
  await cacheDel(`invoices:list:*`);
  return { settlement, invoice: updatedInvoice, txXdr };
}
