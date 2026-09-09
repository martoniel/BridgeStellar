import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as stellar from "@/lib/stellar";

interface WalletState {
  address: string | null;
  network: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  signAndSubmit: (xdr: string, networkPassphrase?: string) => Promise<string>;
}

export const useWallet = create<WalletState>()(
  persist(
    (set, get) => ({
      address: null,
      network: null,
      isConnected: false,
      isConnecting: false,
      error: null,

      connect: async () => {
        set({ isConnecting: true, error: null });
        try {
          const result = await stellar.connectWallet();
          localStorage.setItem("wallet_address", result.address);
          set({
            address: result.address,
            network: result.network,
            isConnected: true,
            isConnecting: false,
          });
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Failed to connect wallet";
          set({ isConnecting: false, error: message });
          throw err;
        }
      },

      disconnect: () => {
        localStorage.removeItem("wallet_address");
        set({
          address: null,
          network: null,
          isConnected: false,
          error: null,
        });
      },

      signAndSubmit: async (xdr: string, networkPassphrase?: string) => {
        const result = await stellar.signAndSubmitTransaction(xdr, {
          networkPassphrase,
          submit: true,
        });
        return result.hash;
      },
    }),
    {
      name: "factbridge-wallet",
      partialize: (state) => ({
        address: state.address,
        network: state.network,
        isConnected: state.isConnected,
      }),
    }
  )
);
