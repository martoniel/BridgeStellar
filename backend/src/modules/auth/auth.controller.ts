import { Request, Response } from "express";
import * as authService from "./auth.service";

export async function register(req: Request, res: Response) {
  const result = await authService.register(req.body);
  res.status(201).json(result);
}

export async function login(req: Request, res: Response) {
  const result = await authService.login(req.body);
  res.json(result);
}

export async function verifyStellar(req: Request, res: Response) {
  const result = await authService.verifyStellar(req.body);
  res.json(result);
}

export async function me(req: Request, res: Response) {
  const user = await authService.getMe(req.user!.userId);
  res.json(user);
}
