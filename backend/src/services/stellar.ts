import {
  Server,
  Keypair,
  Contract,
  TransactionBuilder,
  Networks,
  Address,
  nativeToScVal,
  xdr,
} from "stellar-sdk";
import { config } from "../config";

let server: Server;

function getServer(): Server {
  if (!server) {
    server = new Server(config.sorobanRpcUrl);
  }
  return server;
}

function getNetworkPassphrase(): string {
  return config.stellarNetwork === "mainnet"
    ? Networks.PUBLIC
    : Networks.TESTNET;
}

function getContract(): Contract {
  return new Contract(config.contractId);
}

export async function getAccount(address: string) {
  const s = getServer();
  return s.loadAccount(address);
}

export async function createInvoiceOnChain(invoice: {
  id: string;
  buyerAddress: string;
  amount: number;
  sharesTotal: number;
  maturityDate: Date;
}): Promise<string> {
  try {
    const contract = getContract();
    const sourceKeypair = Keypair.fromSecret(
      process.env.STELLAR_SECRET_KEY || ""
    );

    const account = await getAccount(sourceKeypair.publicKey());
    const transaction = new TransactionBuilder(account, {
      fee: "100",
      networkPassphrase: getNetworkPassphrase(),
    })
      .addOperation(
        contract.call(
          "create_invoice",
          nativeToScVal(invoice.buyerAddress, { type: "address" }),
          nativeToScVal(invoice.amount * 10_000_000, { type: "i128" }),
          nativeToScVal(invoice.sharesTotal, { type: "u32" }),
          nativeToScVal(
            Math.floor(invoice.maturityDate.getTime() / 1000),
            { type: "u64" }
          )
        )
      )
      .setTimeout(300)
      .build();

    transaction.sign(sourceKeypair);
    const result = await getServer().submitTransaction(transaction);
    return result.hash;
  } catch (err) {
    console.error("Stellar createInvoiceOnChain error:", err);
    throw err;
  }
}

export async function fundInvoiceOnChain(
  contractInvoiceId: string,
  amount: number
): Promise<string> {
  try {
    const contract = getContract();
    const sourceKeypair = Keypair.fromSecret(
      process.env.STELLAR_SECRET_KEY || ""
    );

    const account = await getAccount(sourceKeypair.publicKey());
    const transaction = new TransactionBuilder(account, {
      fee: "100",
      networkPassphrase: getNetworkPassphrase(),
    })
      .addOperation(
        contract.call(
          "fund_invoice",
          nativeToScVal(contractInvoiceId, { type: "bytes" }),
          nativeToScVal(amount * 10_000_000, { type: "i128" })
        )
      )
      .setTimeout(300)
      .build();

    transaction.sign(sourceKeypair);
    const result = await getServer().submitTransaction(transaction);
    return result.hash;
  } catch (err) {
    console.error("Stellar fundInvoiceOnChain error:", err);
    throw err;
  }
}

export async function purchaseSharesOnChain(
  contractInvoiceId: string,
  shareCount: number,
  totalCost: number
): Promise<string> {
  try {
    const contract = getContract();
    const sourceKeypair = Keypair.fromSecret(
      process.env.STELLAR_SECRET_KEY || ""
    );

    const account = await getAccount(sourceKeypair.publicKey());
    const transaction = new TransactionBuilder(account, {
      fee: "100",
      networkPassphrase: getNetworkPassphrase(),
    })
      .addOperation(
        contract.call(
          "purchase_shares",
          nativeToScVal(contractInvoiceId, { type: "bytes" }),
          nativeToScVal(shareCount, { type: "u32" }),
          nativeToScVal(totalCost * 10_000_000, { type: "i128" })
        )
      )
      .setTimeout(300)
      .build();

    transaction.sign(sourceKeypair);
    const result = await getServer().submitTransaction(transaction);
    return result.hash;
  } catch (err) {
    console.error("Stellar purchaseSharesOnChain error:", err);
    throw err;
  }
}

export async function settleInvoiceOnChain(
  contractInvoiceId: string
): Promise<string> {
  try {
    const contract = getContract();
    const sourceKeypair = Keypair.fromSecret(
      process.env.STELLAR_SECRET_KEY || ""
    );

    const account = await getAccount(sourceKeypair.publicKey());
    const transaction = new TransactionBuilder(account, {
      fee: "100",
      networkPassphrase: getNetworkPassphrase(),
    })
      .addOperation(
        contract.call(
          "settle_invoice",
          nativeToScVal(contractInvoiceId, { type: "bytes" })
        )
      )
      .setTimeout(300)
      .build();

    transaction.sign(sourceKeypair);
    const result = await getServer().submitTransaction(transaction);
    return result.hash;
  } catch (err) {
    console.error("Stellar settleInvoiceOnChain error:", err);
    throw err;
  }
}

export async function getInvoiceFromChain(contractInvoiceId: string) {
  try {
    const contract = getContract();
    const result = await getServer().simulateTransaction(
      contract.call(
        "get_invoice",
        nativeToScVal(contractInvoiceId, { type: "bytes" })
      )
    );
    return result;
  } catch (err) {
    console.error("Stellar getInvoiceFromChain error:", err);
    throw err;
  }
}

export function listenForContractEvents(
  callback: (event: unknown) => void
): () => void {
  const s = getServer();
  const ledgers = s.ledgers();

  // Poll for new ledgers and check for contract events
  const interval = setInterval(async () => {
    try {
      // In production, use streaming/SSE for real-time events
      // This is a polling stub
    } catch (err) {
      console.error("Event listener error:", err);
    }
  }, 30000);

  return () => clearInterval(interval);
}
