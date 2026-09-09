import * as StellarSdk from "@stellar/stellar-sdk";
import {
  isConnected,
  getAddress,
  signTransaction,
  getNetwork,
} from "@stellar/freighter-api";

const HORIZON_URL = import.meta.env.VITE_HORIZON_URL || "https://horizon-testnet.stellar.org";
const NETWORK_PASSPHRASE =
  import.meta.env.VITE_NETWORK_PASSPHRASE || StellarSdk.Networks.TESTNET;

let server: StellarSdk.Horizon.Server | null = null;

export function getServer(): StellarSdk.Horizon.Server {
  if (!server) {
    server = new StellarSdk.Horizon.Server(HORIZON_URL);
  }
  return server;
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
  const [addressRes, networkRes] = await Promise.all([
    getAddress(),
    getNetwork(),
  ]);

  return {
    address: addressRes.address,
    network: networkRes.network,
  };
}

export async function getWalletAddress(): Promise<string> {
  const result = await getAddress();
  return result.address;
}

export async function signAndSubmitTransaction(
  xdr: string,
  opts?: { networkPassphrase?: string; submit?: boolean }
): Promise<StellarSdk.SorobanRpc.Api.SendTransactionResponse> {
  const server = getServer();
  const networkPassphrase = opts?.networkPassphrase || NETWORK_PASSPHRASE;

  const signedTx = await signTransaction(xdr, {
    networkPassphrase,
  });

  const transaction = StellarSdk.TransactionBuilder.fromXDR(
    signedTx,
    networkPassphrase
  );

  const result = await server
    .submitTransaction(transaction, { skipMemoRequiredCheck: true })
    .catch(async (err) => {
      if (opts?.submit === false) {
        throw err;
      }
      throw err;
    });

  return result;
}

export async function buildAndSignInvokeContract(
  contractId: string,
  method: string,
  args: StellarSdk.xdr.ScVal[],
  sourceAddress: string,
  opts?: { fee?: string }
): Promise<string> {
  const server = getServer();
  const sourceAccount = await server.loadAccount(sourceAddress);

  const contract = new StellarSdk.Contract(contractId);
  const operation = contract.call(method, ...args);

  const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: opts?.fee || "100000",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(300)
    .build();

  const xdr = transaction.toXDR();
  const signedXdr = await signTransaction(xdr, {
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  return signedXdr;
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
