import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

type ValidationTarget = "body" | "params" | "query";

export function validate(
  schema: ZodSchema,
  target: ValidationTarget = "body"
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const message = result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      _res.status(400).json({ error: "Validation failed", details: message });
      return;
    }
    req[target] = result.data;
    next();
  };
}
