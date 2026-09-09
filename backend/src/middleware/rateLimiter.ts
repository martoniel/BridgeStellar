import rateLimit from "express-rate-limit";

export function createRateLimiter(windowMs = 15 * 60 * 1000, max = 100) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later" },
  });
}
