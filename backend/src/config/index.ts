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
};
