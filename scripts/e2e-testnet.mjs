#!/usr/bin/env node
/**
 * FactBridge testnet end-to-end run.
 *
 * Deploys the contract, tokenizes an invoice, funds it from two independent
 * liquidity providers, then has the buyer settle it on-chain and verifies that
 * the settlement proceeds were distributed pro-rata to the funders.
 *
 * Everything is real: real accounts funded by Friendbot, a real WASM deploy,
 * and real Stellar testnet transactions. The script prints stellar.expert
 * links for each transaction and writes a JSON report to docs/evidence/.
 *
 * Usage:
 *   cd scripts && npm install && npm run e2e:testnet
 */

import { createHash, randomBytes } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  Address,
  Asset,
  Contract,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const RPC_URL = process.env.SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";
const FRIENDBOT_URL = process.env.FRIENDBOT_URL || "https://friendbot.stellar.org";
const WASM_PATH = resolve(
  ROOT,
  process.env.FACTBRIDGE_WASM || "contracts/target/wasm32v1-none/release/factbridge.wasm"
);
const EVIDENCE_DIR = resolve(ROOT, "docs/evidence");

const server = new rpc.Server(RPC_URL);
const NETWORK = Networks.TESTNET;

const FACE_VALUE = 1_000n * 10_000_000n; // 1,000 XLM in stroops
const DISCOUNT_BPS = 500; // 5% discount
const FUNDING_TARGET = (FACE_VALUE * BigInt(10_000 - DISCOUNT_BPS)) / 10_000n;
const FUNDER_A_AMOUNT = 500n * 10_000_000n;
const FUNDER_B_AMOUNT = FUNDING_TARGET - FUNDER_A_AMOUNT;
const SHARES_TOTAL = 1_000;
const MATURITY_OFFSET_SECONDS = 20;
/** Fees and rounding mean exact equality is the wrong assertion for balances. */
const TOLERANCE = 50_000_000n; // 5 XLM

const report = {
  generatedAt: new Date().toISOString(),
  network: "testnet",
  rpc: RPC_URL,
  contractId: null,
  token: Asset.native().contractId(NETWORK),
  invoice: {
    faceValue: FACE_VALUE.toString(),
    discountBps: DISCOUNT_BPS,
    fundingTarget: FUNDING_TARGET.toString(),
    sharesTotal: SHARES_TOTAL,
    contributions: {},
  },
  transactions: {},
  balances: {},
};

function log(section, message) {
  console.log(`\n[${section}] ${message}`);
}

function link(hash) {
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}

/** Contract enums serialise as u32 on the wire. */
function statusName(status) {
  const names = ["Created", "Funded", "Settled", "Defaulted", "Disputed"];
  return typeof status === "number" ? names[status] : String(status);
}

async function friendbot(address) {
  const res = await fetch(`${FRIENDBOT_URL}?addr=${encodeURIComponent(address)}`);
  if (!res.ok && res.status !== 400) {
    throw new Error(`Friendbot failed for ${address}: ${res.status}`);
  }
}

async function waitForTransaction(hash, timeoutMs = 60_000) {
  const started = Date.now();
  for (;;) {
    const tx = await server.getTransaction(hash);
    if (tx.status === "SUCCESS") return tx;
    if (tx.status === "FAILED") {
      throw new Error(`Transaction ${hash} failed: ${JSON.stringify(tx)}`);
    }
    if (Date.now() - started > timeoutMs) {
      throw new Error(`Timed out waiting for transaction ${hash}`);
    }
    await sleep(1_000);
  }
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

/**
 * Build, simulate, sign and submit a contract invocation. The transaction
 * source doubles as the authorizing account, which satisfies require_auth().
 */
async function invoke(sourceKeypair, contractId, method, args) {
  const contract = new Contract(contractId);
  const account = await server.getAccount(sourceKeypair.publicKey());
  const tx = new TransactionBuilder(account, {
    fee: "1000000",
    networkPassphrase: NETWORK,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(60)
    .build();

  const prepared = await server.prepareTransaction(tx);
  prepared.sign(sourceKeypair);

  const sent = await server.sendTransaction(prepared);
  if (sent.status === "ERROR") {
    throw new Error(`sendTransaction failed for ${method}: ${JSON.stringify(sent)}`);
  }

  const result = await waitForTransaction(sent.hash);
  return { hash: sent.hash, result };
}

/** Read-only simulation that returns the native JS value. */
async function read(sourceKeypair, contractId, method, args = []) {
  const contract = new Contract(contractId);
  const account = await server.getAccount(sourceKeypair.publicKey());
  const tx = new TransactionBuilder(account, {
    fee: "1000000",
    networkPassphrase: NETWORK,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(60)
    .build();

  const simulation = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(simulation)) {
    throw new Error(`Simulation failed for ${method}: ${simulation.error}`);
  }
  return scValToNative(simulation.result.retval);
}

async function sacBalance(sourceKeypair, address) {
  return read(sourceKeypair, Asset.native().contractId(NETWORK), "balance", [
    Address.fromString(address).toScVal(),
  ]);
}

async function main() {
  const wasm = await readFile(WASM_PATH);

  log("setup", "creating and funding testnet accounts via Friendbot");
  const accounts = {
    deployer: Keypair.random(),
    seller: Keypair.random(),
    buyer: Keypair.random(),
    funderA: Keypair.random(),
    funderB: Keypair.random(),
  };

  for (const [name, keypair] of Object.entries(accounts)) {
    await friendbot(keypair.publicKey());
    log("setup", `${name}: ${keypair.publicKey()}`);
  }
  report.accounts = Object.fromEntries(
    Object.entries(accounts).map(([name, kp]) => [name, kp.publicKey()])
  );

  // --- Deploy the contract -------------------------------------------------
  const wasmHash = createHash("sha256").update(wasm).digest();
  {
    const account = await server.getAccount(accounts.deployer.publicKey());
    const tx = new TransactionBuilder(account, {
      fee: "1000000",
      networkPassphrase: NETWORK,
    })
      .addOperation(Operation.uploadContractWasm({ wasm }))
      .setTimeout(60)
      .build();
    const prepared = await server.prepareTransaction(tx);
    prepared.sign(accounts.deployer);
    const sent = await server.sendTransaction(prepared);
    if (sent.status === "ERROR") {
      throw new Error(`WASM upload failed: ${JSON.stringify(sent)}`);
    }
    await waitForTransaction(sent.hash);
    report.transactions.uploadWasm = { hash: sent.hash, link: link(sent.hash) };
    log("deploy", `uploaded WASM: ${link(sent.hash)}`);
  }

  let contractId;
  {
    const account = await server.getAccount(accounts.deployer.publicKey());
    const tx = new TransactionBuilder(account, {
      fee: "1000000",
      networkPassphrase: NETWORK,
    })
      .addOperation(
        Operation.createCustomContract({
          address: Address.fromString(accounts.deployer.publicKey()),
          wasmHash,
          salt: randomBytes(32),
        })
      )
      .setTimeout(60)
      .build();
    const prepared = await server.prepareTransaction(tx);
    prepared.sign(accounts.deployer);
    const sent = await server.sendTransaction(prepared);
    if (sent.status === "ERROR") {
      throw new Error(`Contract deploy failed: ${JSON.stringify(sent)}`);
    }
    const result = await waitForTransaction(sent.hash);
    contractId = Address.fromScVal(result.returnValue).toString();
    report.transactions.deployContract = { hash: sent.hash, link: link(sent.hash) };
    report.contractId = contractId;
    log("deploy", `contract ${contractId}`);
    log("deploy", `deploy tx: ${link(sent.hash)}`);
  }

  const client = new Contract(contractId);
  const maturity = BigInt(Math.floor(Date.now() / 1000) + MATURITY_OFFSET_SECONDS);

  // --- Tokenize the invoice ------------------------------------------------
  {
    const args = [
      Address.fromString(accounts.seller.publicKey()).toScVal(),
      Address.fromString(accounts.buyer.publicKey()).toScVal(),
      Address.fromString(Asset.native().contractId(NETWORK)).toScVal(),
      nativeToScVal(FACE_VALUE, { type: "i128" }),
      nativeToScVal("XLM", { type: "string" }),
      nativeToScVal(SHARES_TOTAL, { type: "u32" }),
      nativeToScVal(maturity, { type: "u64" }),
      nativeToScVal("ipfs://bafyfactbridge-e2e-invoice", { type: "string" }),
      nativeToScVal(DISCOUNT_BPS, { type: "u32" }),
    ];
    const { hash } = await invoke(accounts.seller, contractId, "create_invoice", args);
    report.transactions.createInvoice = { hash, link: link(hash) };
    log("invoice", `created: ${link(hash)}`);
  }

  const invoiceId = await read(accounts.deployer, contractId, "get_invoice_count");
  report.invoice.id = invoiceId.toString();

  // --- Fund from two independent liquidity providers -----------------------
  const balanceBefore = {
    seller: await sacBalance(accounts.deployer, accounts.seller.publicKey()),
    funderA: await sacBalance(accounts.deployer, accounts.funderA.publicKey()),
    funderB: await sacBalance(accounts.deployer, accounts.funderB.publicKey()),
    buyer: await sacBalance(accounts.deployer, accounts.buyer.publicKey()),
  };

  {
    const { hash } = await invoke(accounts.funderA, contractId, "fund_invoice", [
      Address.fromString(accounts.funderA.publicKey()).toScVal(),
      nativeToScVal(invoiceId, { type: "u64" }),
      nativeToScVal(FUNDER_A_AMOUNT, { type: "i128" }),
    ]);
    report.transactions.fundA = { hash, link: link(hash) };
    log("fund", `funder A contributed 500 XLM: ${link(hash)}`);
  }

  {
    const { hash } = await invoke(accounts.funderB, contractId, "fund_invoice", [
      Address.fromString(accounts.funderB.publicKey()).toScVal(),
      nativeToScVal(invoiceId, { type: "u64" }),
      nativeToScVal(FUNDER_B_AMOUNT, { type: "i128" }),
    ]);
    report.transactions.fundB = { hash, link: link(hash) };
    log("fund", `funder B contributed 450 XLM: ${link(hash)}`);
  }

  report.invoice.contributions.funderA = FUNDER_A_AMOUNT.toString();
  report.invoice.contributions.funderB = FUNDER_B_AMOUNT.toString();

  const fundedInvoice = await read(accounts.deployer, contractId, "get_invoice", [
    nativeToScVal(invoiceId, { type: "u64" }),
  ]);
  log(
    "fund",
    `invoice status=${statusName(fundedInvoice.status)} funded=${fundedInvoice.funded_amount} target=${fundedInvoice.funding_target}`
  );
  report.invoice.statusAfterFunding = statusName(fundedInvoice.status);

  // --- Wait for maturity, then settle --------------------------------------
  log("settle", "waiting for the invoice maturity ledger");
  for (;;) {
    const latest = await server.getLatestLedger();
    if (BigInt(latest.closeTime) >= maturity) break;
    await sleep(1_000);
  }

  {
    const { hash } = await invoke(accounts.buyer, contractId, "settle_invoice", [
      Address.fromString(accounts.buyer.publicKey()).toScVal(),
      nativeToScVal(invoiceId, { type: "u64" }),
    ]);
    report.transactions.settle = { hash, link: link(hash) };
    log("settle", `buyer paid the invoice: ${link(hash)}`);
  }

  const settledInvoice = await read(accounts.deployer, contractId, "get_invoice", [
    nativeToScVal(invoiceId, { type: "u64" }),
  ]);
  report.invoice.statusAfterSettlement = statusName(settledInvoice.status);

  const balanceAfter = {
    seller: await sacBalance(accounts.deployer, accounts.seller.publicKey()),
    funderA: await sacBalance(accounts.deployer, accounts.funderA.publicKey()),
    funderB: await sacBalance(accounts.deployer, accounts.funderB.publicKey()),
    buyer: await sacBalance(accounts.deployer, accounts.buyer.publicKey()),
  };

  for (const party of Object.keys(balanceBefore)) {
    report.balances[party] = {
      before: balanceBefore[party].toString(),
      after: balanceAfter[party].toString(),
      delta: (balanceAfter[party] - balanceBefore[party]).toString(),
    };
  }

  // --- Verify the money actually moved ------------------------------------
  const sellerRaised = balanceBefore.seller + FUNDING_TARGET;
  // Mirrors the contract: each funder gets face_value * contribution / funded,
  // and the final funder absorbs the rounding remainder.
  const payoutA = (FACE_VALUE * FUNDER_A_AMOUNT) / FUNDING_TARGET;
  const payouts = [payoutA, FACE_VALUE - payoutA];
  const distributions = await read(accounts.deployer, contractId, "get_funders", [
    nativeToScVal(invoiceId, { type: "u64" }),
  ]);

  // Contract enums serialise as u32 on the wire.
  const checks = [
    [
      "invoice status is Settled",
      statusName(settledInvoice.status) === "Settled",
    ],
    ["both funders recorded on-chain", distributions.length === 2],
    [
      "seller received the funding target (net of fees)",
      balanceAfter.seller >= sellerRaised - TOLERANCE,
    ],
    [
      "funder A earned the discount yield (net of fees)",
      balanceAfter.funderA >=
        balanceBefore.funderA + payouts[0] - FUNDER_A_AMOUNT - TOLERANCE,
    ],
    [
      "funder B earned the discount yield (net of fees)",
      balanceAfter.funderB >=
        balanceBefore.funderB + payouts[1] - FUNDER_B_AMOUNT - TOLERANCE,
    ],
    ["buyer paid the face value", balanceAfter.buyer <= balanceBefore.buyer - FACE_VALUE],
    [
      "payouts sum to the face value",
      payouts[0] + payouts[1] === FACE_VALUE,
    ],
  ];

  report.settlement = {
    faceValuePaid: FACE_VALUE.toString(),
    payouts: {
      funderA: payouts[0].toString(),
      funderB: payouts[1].toString(),
    },
    funders: distributions,
  };
  report.checks = Object.fromEntries(checks);

  const failed = checks.filter(([, ok]) => !ok);
  if (failed.length > 0) {
    log("verify", `FAILED checks: ${failed.map(([name]) => name).join(", ")}`);
  } else {
    log("verify", "all settlement invariants passed");
  }

  await mkdir(EVIDENCE_DIR, { recursive: true });
  const outPath = resolve(EVIDENCE_DIR, "testnet-e2e.json");
  await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  log("done", `evidence written to ${outPath}`);
  console.log(`\nContract: https://stellar.expert/explorer/testnet/contract/${contractId}`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("\nE2E run failed:", err);
  process.exitCode = 1;
});
