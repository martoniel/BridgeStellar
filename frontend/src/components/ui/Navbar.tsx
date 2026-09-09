import { Link, useLocation } from "react-router-dom";
import { Landmark, LayoutDashboard, FileText, Store, ArrowLeftRight, Settings } from "lucide-react";
import WalletButton from "@/components/wallet/WalletButton";
import { cn } from "@/utils/format";
import { useWallet } from "@/hooks/useWallet";

const navLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/invoices", label: "Invoices", icon: FileText },
  { to: "/marketplace", label: "Marketplace", icon: Store },
  { to: "/settlements", label: "Settlements", icon: ArrowLeftRight },
];

export default function Navbar() {
  const location = useLocation();
  const { isConnected } = useWallet();

  return (
    <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="h-8 w-8 rounded-lg bg-primary-600 flex items-center justify-center">
                <Landmark className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                FactBridge
              </span>
            </Link>

            {isConnected && (
              <div className="hidden md:flex items-center gap-1">
                {navLinks.map(({ to, label, icon: Icon }) => {
                  const isActive = location.pathname.startsWith(to);
                  return (
                    <Link
                      key={to}
                      to={to}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary-50 text-primary-700"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isConnected && (
              <Link
                to="/settings"
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  location.pathname === "/settings"
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                )}
                aria-label="Settings"
              >
                <Settings className="h-5 w-5" />
              </Link>
            )}
            <WalletButton />
          </div>
        </div>
      </div>
    </nav>
  );
}
