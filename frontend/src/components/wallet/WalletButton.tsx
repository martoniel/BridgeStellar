import { Wallet, LogOut } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { truncateAddress } from "@/utils/format";
import Button from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";

export default function WalletButton() {
  const { address, isConnected, isConnecting, connect, disconnect } =
    useWallet();

  const handleConnect = async () => {
    try {
      await connect();
      toast.success("Wallet connected successfully");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to connect wallet";
      toast.error(message);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    toast.success("Wallet disconnected");
  };

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-success-50 border border-success-200 rounded-lg">
          <span className="h-2 w-2 rounded-full bg-success-500 animate-pulse" />
          <span className="text-sm font-medium text-success-700 font-mono">
            {truncateAddress(address)}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDisconnect}
          icon={<LogOut className="h-4 w-4" />}
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="primary"
      size="md"
      onClick={handleConnect}
      loading={isConnecting}
      icon={<Wallet className="h-4 w-4" />}
    >
      Connect Wallet
    </Button>
  );
}
