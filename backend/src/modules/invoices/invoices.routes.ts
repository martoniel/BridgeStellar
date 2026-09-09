import { Router } from "express";
import { validate } from "../../middleware/validate";
import { authenticate } from "../../middleware/auth";
import {
  createInvoiceDto,
  updateInvoiceDto,
  fundInvoiceDto,
  purchaseSharesDto,
  invoiceQueryDto,
} from "./dto";
import * as invoicesController from "./invoices.controller";

const router = Router();

router.get(
  "/",
  validate(invoiceQueryDto, "query"),
  invoicesController.listInvoices
);

router.get("/:id", invoicesController.getInvoiceById);

router.post(
  "/",
  authenticate,
  validate(createInvoiceDto),
  invoicesController.createInvoice
);

router.patch(
  "/:id",
  authenticate,
  validate(updateInvoiceDto),
  invoicesController.updateInvoice
);

router.post(
  "/:id/fund",
  authenticate,
  validate(fundInvoiceDto),
  invoicesController.fundInvoice
);

router.post(
  "/:id/shares",
  authenticate,
  validate(purchaseSharesDto),
  invoicesController.purchaseShares
);

router.post(
  "/:id/settle",
  authenticate,
  invoicesController.settleInvoice
);

export { router as invoiceRoutes };
