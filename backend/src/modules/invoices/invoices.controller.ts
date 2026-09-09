import { Request, Response } from "express";
import * as invoicesService from "./invoices.service";

export async function listInvoices(req: Request, res: Response) {
  const result = await invoicesService.listInvoices(req.query as any, req.user?.userId);
  res.json(result);
}

export async function getInvoiceById(req: Request, res: Response) {
  const invoice = await invoicesService.getInvoiceById(req.params.id);
  res.json(invoice);
}

export async function createInvoice(req: Request, res: Response) {
  const invoice = await invoicesService.createInvoice(req.body, req.user!.userId);
  res.status(201).json(invoice);
}

export async function updateInvoice(req: Request, res: Response) {
  const invoice = await invoicesService.updateInvoice(
    req.params.id,
    req.body,
    req.user!.userId
  );
  res.json(invoice);
}

export async function fundInvoice(req: Request, res: Response) {
  const result = await invoicesService.fundInvoice(
    req.params.id,
    req.body,
    req.user!.userId
  );
  res.json(result);
}

export async function purchaseShares(req: Request, res: Response) {
  const result = await invoicesService.purchaseShares(
    req.params.id,
    req.body,
    req.user!.userId
  );
  res.status(201).json(result);
}

export async function settleInvoice(req: Request, res: Response) {
  const result = await invoicesService.settleInvoice(req.params.id, req.user!.userId);
  res.json(result);
}
