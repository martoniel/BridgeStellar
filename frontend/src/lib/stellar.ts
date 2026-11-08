import * as StellarSdk from "@stellar/stellar-sdk";
import {
  isConnected,
  getPublicKey,
  requestAccess,
  signTransaction,
  getNetwork,
} from "@stellar/freighter-api";

const HORIZON_URL =
  import.meta.env.VITE_HORIZON_URL || "https://horizon-testnet.stellar.org";
const SOROBAN_RPC_URL =
  import.meta.env.VITE_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE =
  import.meta.env.VITE_NETWORK_PASSPHRASE || StellarSdk.Networks.TESTNET;

let horizon: StellarSdk.Horizon.Server | null = null;
let soroban: StellarSdk.rpc.Server | null = null;

/** Horizon is used for account/balance lookups. */
export function getServer(): StellarSdk.Horizon.Server {
  if (!horizon) {
    horizon = new StellarSdk.Horizon.Server(HORIZON_URL);
  }
  return horizon;
}

/** Soroban RPC is used to simulate, prepare and submit contract calls. */
export function getSorobanServer(): StellarSdk.rpc.Server {
  if (!soroban) {
    soroban = new StellarSdk.rpc.Server(SOROBAN_RPC_URL);
  }
  return soroban;
}

export async function isFreighterConnected(): Promise<boolean> {
  try {
    return await isConnected();
  } catch {
    return false;
  }
}

export async function connectWallet(): Promise<{
  address: string;
  network: string;
}> {
  if (!(await isFreighterConnected())) {
    await requestAccess();
  }

  const [address, network] = await Promise.all([getPublicKey(), getNetwork()]);

  return { address, network };
}

export async function getWalletAddress(): Promise<string> {
  return getPublicKey();
}

/**
 * Sign a prepared transaction with Freighter and submit it through Soroban
 * RPC. The transaction must already be prepared (footprint + fee attached);
 * use `buildAndSignInvokeContract` for contract calls.
 */
export async function signAndSubmitTransaction(
  xdr: string,
  opts?: { networkPassphrase?: string; accountToSign?: string }
): Promise<{ hash: string }> {
  const networkPassphrase = opts?.networkPassphrase || NETWORK_PASSPHRASE;

  const signedXdr = await signTransaction(xdr, {
    networkPassphrase,
    accountToSign: opts?.accountToSign,
  });

  const transaction = StellarSdk.TransactionBuilder.fromXDR(
    signedXdr,
    networkPassphrase
  );
  const server = getSorobanServer();

  const sent = await server.sendTransaction(transaction);
  if (sent.status === "ERROR") {
    throw new Error(`Transaction rejected: ${JSON.stringify(sent.errorResult)}`);
  }

  const deadline = Date.now() + 60_000;
  for (;;) {
    const result = await server.getTransaction(sent.hash);
    if (result.status === "SUCCESS") {
      return { hash: sent.hash };
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

/**
 * Build a contract invocation, simulate it to attach the storage footprint and
 * resource fee, then have the wallet owner sign the prepared transaction.
 * Returns the signed XDR, ready for `signAndSubmitTransaction` or a relayer.
 */
export async function buildAndSignInvokeContract(
  contractId: string,
  method: string,
  args: StellarSdk.xdr.ScVal[],
  sourceAddress: string,
  opts?: { fee?: string }
): Promise<string> {
  const server = getSorobanServer();
  const sourceAccount = await server.getAccount(sourceAddress);

  const contract = new StellarSdk.Contract(contractId);
  const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: opts?.fee || StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(300)
    .build();

  const prepared = await server.prepareTransaction(transaction);

  return signTransaction(prepared.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
    accountToSign: sourceAddress,
  });
}

export function isValidStellarAddress(address: string): boolean {
  try {
    StellarSdk.StrKey.decodeEd25519PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

export function formatAmount(amount: string, decimals = 7): string {
  const num = parseFloat(amount);
  if (isNaN(num)) return "0";
  return num.toFixed(decimals);
}

export { StellarSdk };
