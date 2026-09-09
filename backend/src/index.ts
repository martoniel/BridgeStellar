import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config";
import { errorHandler } from "./middleware/errorHandler";
import { createRateLimiter } from "./middleware/rateLimiter";
import { authRoutes } from "./modules/auth/auth.routes";
import { invoiceRoutes } from "./modules/invoices/invoices.routes";
import { settlementRoutes } from "./modules/settlement/settlement.routes";
import { userRoutes } from "./modules/users/users.routes";

const app = express();

app.use(helmet());
app.use(cors({ origin: config.nodeEnv === "production" ? [] : "*" }));
app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));
app.use(createRateLimiter());

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/invoices", invoiceRoutes);
app.use("/api/v1/settlements", settlementRoutes);
app.use("/api/v1/users", userRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`FactBridge server running on port ${config.port}`);
});

export default app;
