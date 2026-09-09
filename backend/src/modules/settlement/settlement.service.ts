import { PrismaClient } from "@prisma/client";
import { AppError } from "../../middleware/errorHandler";
import { cacheGet, cacheSet } from "../../services/redis";

const prisma = new PrismaClient();

export async function listSettlements(page = 1, limit = 20) {
  const cacheKey = `settlements:list:${page}:${limit}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const skip = (page - 1) * limit;
  const [settlements, total] = await Promise.all([
    prisma.settlement.findMany({
      include: {
        invoice: {
          select: {
            id: true,
            amount: true,
            denomination: true,
            buyerAddress: true,
            maturityDate: true,
            creator: { select: { id: true, name: true, stellarAddress: true } },
          },
        },
      },
      orderBy: { settledAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.settlement.count(),
  ]);

  const result = {
    data: settlements,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };

  await cacheSet(cacheKey, result, 60);
  return result;
}

export async function getSettlementById(id: string) {
  const settlement = await prisma.settlement.findUnique({
    where: { id },
    include: {
      invoice: {
        include: {
          creator: { select: { id: true, name: true, stellarAddress: true } },
          shares: {
            include: {
              holder: { select: { id: true, name: true, stellarAddress: true } },
            },
          },
        },
      },
    },
  });

  if (!settlement) {
    throw new AppError(404, "Settlement not found");
  }
  return settlement;
}

export async function getStats() {
  const cacheKey = "settlements:stats";
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const [totalSettled, settlements] = await Promise.all([
    prisma.settlement.aggregate({
      _sum: { settlementAmount: true },
      _count: true,
      _avg: { settlementAmount: true },
    }),
    prisma.settlement.findMany({
      select: { settlementAmount: true, settledAt: true },
      orderBy: { settledAt: "asc" },
    }),
  ]);

  const byMonth: Record<string, { count: number; total: number }> = {};
  for (const s of settlements) {
    const month = s.settledAt.toISOString().slice(0, 7);
    if (!byMonth[month]) byMonth[month] = { count: 0, total: 0 };
    byMonth[month].count += 1;
    byMonth[month].total += s.settlementAmount;
  }

  const invoices = await prisma.invoice.findMany({
    where: { status: "SETTLED" },
    select: { createdAt: true, updatedAt: true },
  });

  let avgSettlementDays = 0;
  if (invoices.length > 0) {
    const totalDays = invoices.reduce((sum, inv) => {
      const days =
        (inv.updatedAt.getTime() - inv.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      return sum + days;
    }, 0);
    avgSettlementDays = totalDays / invoices.length;
  }

  const stats = {
    totalSettledAmount: totalSettled._sum.settlementAmount || 0,
    totalSettlements: totalSettled._count,
    avgSettlementAmount: totalSettled._avg.settlementAmount || 0,
    avgSettlementDays: Math.round(avgSettlementDays * 10) / 10,
    byMonth,
  };

  await cacheSet(cacheKey, stats, 300);
  return stats;
}
