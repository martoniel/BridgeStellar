import { Router } from "express";
import { validate } from "../../middleware/validate";
import { authenticate } from "../../middleware/auth";
import { registerSchema, loginSchema, verifyStellarSchema } from "./auth.service";
import * as authController from "./auth.controller";

const router = Router();

router.post("/register", validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);
router.post(
  "/verify-stellar",
  validate(verifyStellarSchema),
  authController.verifyStellar
);
router.get("/me", authenticate, authController.me);

export { router as authRoutes };
