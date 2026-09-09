import { Request, Response } from "express";
import * as settlementService from "./settlement.service";

export async function listSettlements(req: Request, res: Response) {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const result = await settlementService.listSettlements(page, limit);
  res.json(result);
}

export async function getSettlementById(req: Request, res: Response) {
  const settlement = await settlementService.getSettlementById(req.params.id);
  res.json(settlement);
}

export async function getStats(_req: Request, res: Response) {
  const stats = await settlementService.getStats();
  res.json(stats);
}
