import dotenv from "dotenv";

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: requireEnv("DATABASE_URL"),
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  jwtSecret: requireEnv("JWT_SECRET"),
  jwtExpiresIn: "7d",
  stellarNetwork: process.env.STELLAR_NETWORK || "testnet",
  sorobanRpcUrl:
    process.env.SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org",
  contractId: process.env.CONTRACT_ID || "",
  /** SEP-41 token used for funding and settlement. Defaults to the native asset. */
  tokenContractId: process.env.TOKEN_CONTRACT_ID || "",
  /** Account used for read-only simulations (no signing). */
  platformAddress: process.env.PLATFORM_ADDRESS || "",
  /** Discount applied to new invoices when the client does not specify one. */
  defaultDiscountBps: parseInt(process.env.DEFAULT_DISCOUNT_BPS || "500", 10),
};
