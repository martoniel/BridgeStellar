import { Navigate, useLocation } from "react-router-dom";
import { useWallet } from "@/hooks/useWallet";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isConnected } = useWallet();
  const location = useLocation();

  if (!isConnected) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
