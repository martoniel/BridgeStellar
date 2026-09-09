import { PrismaClient } from "@prisma/client";
import { AppError } from "../../middleware/errorHandler";
import { cacheGet, cacheSet, cacheDel } from "../../services/redis";

const prisma = new PrismaClient();

export async function getUserById(id: string) {
  const cacheKey = `user:${id}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      stellarAddress: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { invoices: true, shares: true } },
    },
  });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  await cacheSet(cacheKey, user, 120);
  return user;
}

export async function updateUser(
  id: string,
  data: { name?: string; email?: string },
  requestingUserId: string
) {
  if (id !== requestingUserId) {
    throw new AppError(403, "Not authorized to update this user");
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, "User not found");
  }

  if (data.email && data.email !== existing.email) {
    const emailTaken = await prisma.user.findUnique({ where: { email: data.email } });
    if (emailTaken) {
      throw new AppError(409, "Email already in use");
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      stellarAddress: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  await cacheDel(`user:${id}`);
  return user;
}

export async function getUserInvoices(userId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where: { creatorId: userId },
      include: {
        shares: { select: { id: true, shareCount: true, purchasePrice: true } },
        settlement: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.invoice.count({ where: { creatorId: userId } }),
  ]);

  return {
    data: invoices,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}
