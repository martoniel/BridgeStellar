import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { config } from "../../config";
import { AppError } from "../../middleware/errorHandler";

const prisma = new PrismaClient();

export const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  password: z.string().min(8).max(128),
  stellarAddress: z.string().startsWith("G").length(56),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const verifyStellarSchema = z.object({
  stellarAddress: z.string().startsWith("G").length(56),
  signature: z.string(),
  nonce: z.string(),
});

type RegisterInput = z.infer<typeof registerSchema>;
type LoginInput = z.infer<typeof loginSchema>;
type VerifyStellarInput = z.infer<typeof verifyStellarSchema>;

function generateToken(user: { id: string; email: string; role: string }): string {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, { stellarAddress: input.stellarAddress }] },
  });
  if (existing) {
    throw new AppError(409, "Email or Stellar address already registered");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash,
      stellarAddress: input.stellarAddress,
    },
  });

  const token = generateToken(user);
  const { passwordHash: _, ...safeUser } = user;
  return { user: safeUser, token };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw new AppError(401, "Invalid credentials");
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw new AppError(401, "Invalid credentials");
  }

  const token = generateToken(user);
  const { passwordHash: _, ...safeUser } = user;
  return { user: safeUser, token };
}

export async function verifyStellar(input: VerifyStellarInput) {
  const user = await prisma.user.findUnique({
    where: { stellarAddress: input.stellarAddress },
  });
  if (!user) {
    throw new AppError(404, "User not found with this Stellar address");
  }

  // SEP-10 style verification stub
  // In production, use stellar-sdk to verify the signed challenge
  const isValidSignature = input.signature.length > 0 && input.nonce.length > 0;
  if (!isValidSignature) {
    throw new AppError(401, "Invalid Stellar signature");
  }

  const token = generateToken(user);
  const { passwordHash: _, ...safeUser } = user;
  return { user: safeUser, token };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError(404, "User not found");
  }
  const { passwordHash: _, ...safeUser } = user;
  return safeUser;
}
