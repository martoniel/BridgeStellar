import {
  Address,
  Asset,
  BASE_FEE,
  Contract,
  Networks,
  SorobanRpc,
  Transaction,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
} from "stellar-sdk";
import { config } from "../config";

/**
 * Thin Soroban client for the FactBridge contract.
 *
 * Every write path returns a *prepared but unsigned* transaction XDR. The
 * wallet that owns the acting address (SME, funder, buyer) signs it, so the
 * contract's `require_auth()` checks are satisfied by the right key. Nothing
 * is submitted with a server-side key.
 *
 * Preparing the transaction is essential: `prepareTransaction` runs the
 * simulation and attaches the storage footprint, auth entries and resource fee
 * that Soroban requires. Without it every invocation is rejected by the RPC.
 */

const STROOPS_PER_UNIT = 10_000_000;

let server: SorobanRpc.Server;

function getServer(): SorobanRpc.Server {
  if (!server) {
    server = new SorobanRpc.Server(config.sorobanRpcUrl, {
      allowHttp: config.sorobanRpcUrl.startsWith("http://"),
    });
  }
  return server;
}

function getNetworkPassphrase(): string {
  return config.stellarNetwork === "mainnet"
    ? Networks.PUBLIC
    : Networks.TESTNET;
}

function getContract(): Contract {
  if (!config.contractId) {
    throw new Error("CONTRACT_ID is not configured");
  }
  return new Contract(config.contractId);
}

function getTokenAddress(): string {
  if (config.tokenContractId) {
    return config.tokenContractId;
  }
  return Asset.native().contractId(getNetworkPassphrase());
}

export function toStroops(amount: number): bigint {
  return BigInt(Math.round(amount * STROOPS_PER_UNIT));
}

async function buildPreparedTransaction(
  sourceAddress: string,
  method: string,
  args: ReturnType<typeof nativeToScVal>[]
): Promise<string> {
  const s = getServer();
  const account = await s.getAccount(sourceAddress);

  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: getNetworkPassphrase(),
  })
    .addOperation(getContract().call(method, ...args))
    .setTimeout(300)
    .build();

  const prepared = await s.prepareTransaction(transaction);
  return prepared.toXDR();
}

async function simulateRead<T>(method: string, args: ReturnType<typeof nativeToScVal>[]): Promise<T> {
  const s = getServer();
  const account = await s.getAccount(config.platformAddress);
  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: getNetworkPassphrase(),
  })
    .addOperation(getContract().call(method, ...args))
    .setTimeout(300)
    .build();

  const simulation = await s.simulateTransaction(transaction);
  if (SorobanRpc.Api.isSimulationError(simulation)) {
    throw new Error(`Simulation failed for ${method}: ${simulation.error}`);
  }
  return scValToNative(simulation.result!.retval) as T;
}

export interface CreateInvoiceChainParams {
  creatorAddress: string;
  buyerAddress: string;
  amount: number;
  denom: string;
  sharesTotal: number;
  maturityDate: Date;
  metadataUri: string;
  discountBps?: number;
}

export interface PreparedInvoiceCreation {
  /** Unsigned, prepared XDR the creator signs with their wallet. */
  xdr: string;
  /** On-chain invoice id the transaction will create. */
  invoiceId: number;
}

/**
 * Build `create_invoice`. Returns the prepared XDR plus the deterministic id
 * the next invoice will receive, so the API can surface both to the client.
 */
export async function createInvoiceOnChain(
  input: CreateInvoiceChainParams
): Promise<PreparedInvoiceCreation> {
  const nextId = Number(await simulateRead<bigint>("get_invoice_count", [])) + 1;

  const xdr = await buildPreparedTransaction(input.creatorAddress, "create_invoice", [
    Address.fromString(input.creatorAddress).toScVal(),
    Address.fromString(input.buyerAddress).toScVal(),
    Address.fromString(getTokenAddress()).toScVal(),
    nativeToScVal(toStroops(input.amount), { type: "i128" }),
    nativeToScVal(input.denom, { type: "string" }),
    nativeToScVal(input.sharesTotal, { type: "u32" }),
    nativeToScVal(BigInt(Math.floor(input.maturityDate.getTime() / 1000)), {
      type: "u64",
    }),
    nativeToScVal(input.metadataUri, { type: "string" }),
    nativeToScVal(input.discountBps ?? config.defaultDiscountBps, { type: "u32" }),
  ]);

  return { xdr, invoiceId: nextId };
}

/** Build `fund_invoice` for a liquidity provider. */
export async function fundInvoiceOnChain(input: {
  funderAddress: string;
  invoiceId: number;
  amount: number;
}): Promise<string> {
  return buildPreparedTransaction(input.funderAddress, "fund_invoice", [
    Address.fromString(input.funderAddress).toScVal(),
    nativeToScVal(BigInt(input.invoiceId), { type: "u64" }),
    nativeToScVal(toStroops(input.amount), { type: "i128" }),
  ]);
}

/** Build `purchase_shares` for an investor. */
export async function purchaseSharesOnChain(input: {
  investorAddress: string;
  invoiceId: number;
  shareCount: number;
}): Promise<string> {
  return buildPreparedTransaction(input.investorAddress, "purchase_shares", [
    Address.fromString(input.investorAddress).toScVal(),
    nativeToScVal(BigInt(input.invoiceId), { type: "u64" }),
    nativeToScVal(input.shareCount, { type: "u32" }),
  ]);
}

/** Build `settle_invoice`. Only the invoice buyer can sign this. */
export async function settleInvoiceOnChain(input: {
  buyerAddress: string;
  invoiceId: number;
}): Promise<string> {
  return buildPreparedTransaction(input.buyerAddress, "settle_invoice", [
    Address.fromString(input.buyerAddress).toScVal(),
    nativeToScVal(BigInt(input.invoiceId), { type: "u64" }),
  ]);
}

/**
 * Submit a wallet-signed transaction and wait for it to be included in a
 * ledger. Returns the transaction hash and the raw result.
 */
export async function submitSignedTransaction(signedXdr: string): Promise<{
  hash: string;
  result: SorobanRpc.Api.GetSuccessfulTransactionResponse;
}> {
  const s = getServer();
  const transaction = TransactionBuilder.fromXDR(
    signedXdr,
    getNetworkPassphrase()
  ) as Transaction;

  const sent = await s.sendTransaction(transaction);
  if (sent.status === "ERROR") {
    throw new Error(`Transaction rejected: ${JSON.stringify(sent.errorResult)}`);
  }

  const deadline = Date.now() + 60_000;
  for (;;) {
    const result = await s.getTransaction(sent.hash);
    if (result.status === "SUCCESS") {
      return { hash: sent.hash, result };
    }
    if (result.status === "FAILED") {
      throw new Error(`Transaction ${sent.hash} failed on-chain`);
    }
    if (Date.now() > deadline) {
      throw new Error(`Timed out waiting for transaction ${sent.hash}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
}

export interface ChainInvoice {
  id: string;
  creator: string;
  buyer: string;
  token: string;
  amount: string;
  denom: string;
  discountBps: number;
  status: string;
  fundedAmount: string;
  fundingTarget: string;
  sharesTotal: number;
  sharesSold: number;
  createdAt: string;
  maturityDate: string;
  metadataUri: string;
}

const STATUS_NAMES = ["Created", "Funded", "Settled", "Defaulted", "Disputed"];

export async function getInvoiceFromChain(invoiceId: number): Promise<ChainInvoice> {
  const raw = await simulateRead<Record<string, unknown>>("get_invoice", [
    nativeToScVal(BigInt(invoiceId), { type: "u64" }),
  ]);

  return {
    id: String(raw.id),
    creator: String(raw.creator),
    buyer: String(raw.buyer),
    token: String(raw.token),
    amount: String(raw.amount),
    denom: String(raw.denom),
    discountBps: Number(raw.discount_bps),
    status: STATUS_NAMES[Number(raw.status)] ?? String(raw.status),
    fundedAmount: String(raw.funded_amount),
    fundingTarget: String(raw.funding_target),
    sharesTotal: Number(raw.shares_total),
    sharesSold: Number(raw.shares_sold),
    createdAt: String(raw.created_at),
    maturityDate: String(raw.maturity_date),
    metadataUri: String(raw.metadata_uri),
  };
}

export async function getPositionFromChain(
  invoiceId: number,
  funderAddress: string
): Promise<{ contributed: string; shares: number }> {
  const raw = await simulateRead<{ contributed: bigint; shares: number }>(
    "get_position",
    [
      nativeToScVal(BigInt(invoiceId), { type: "u64" }),
      Address.fromString(funderAddress).toScVal(),
    ]
  );
  return { contributed: String(raw.contributed), shares: Number(raw.shares) };
}

export async function getFundersFromChain(invoiceId: number): Promise<string[]> {
  return simulateRead<string[]>("get_funders", [
    nativeToScVal(BigInt(invoiceId), { type: "u64" }),
  ]);
}

export async function getAccount(address: string) {
  return getServer().getAccount(address);
}

export { getNetworkPassphrase, getTokenAddress };
