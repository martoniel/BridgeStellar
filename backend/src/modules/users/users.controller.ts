import { Request, Response } from "express";
import * as usersService from "./users.service";

export async function getMe(req: Request, res: Response) {
  const user = await usersService.getUserById(req.user!.userId);
  res.json(user);
}

export async function updateMe(req: Request, res: Response) {
  const user = await usersService.updateUser(
    req.user!.userId,
    req.body,
    req.user!.userId
  );
  res.json(user);
}

export async function getUserInvoices(req: Request, res: Response) {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const result = await usersService.getUserInvoices(req.params.id, page, limit);
  res.json(result);
}
