import { Router } from "express";
import { z } from "zod";
import { validate } from "../../middleware/validate";
import { authenticate } from "../../middleware/auth";
import * as usersController from "./users.controller";

const router = Router();

const updateUserDto = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
});

router.get("/me", authenticate, usersController.getMe);
router.patch("/me", authenticate, validate(updateUserDto), usersController.updateMe);
router.get("/:id/invoices", authenticate, usersController.getUserInvoices);

export { router as userRoutes };
