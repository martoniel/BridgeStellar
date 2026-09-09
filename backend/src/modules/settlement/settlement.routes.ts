import { Router } from "express";
import * as settlementController from "./settlement.controller";

const router = Router();

router.get("/stats", settlementController.getStats);
router.get("/", settlementController.listSettlements);
router.get("/:id", settlementController.getSettlementById);

export { router as settlementRoutes };
