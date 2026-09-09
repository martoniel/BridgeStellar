import { useState, useEffect, useCallback } from "react";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/utils/format";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

const icons: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const styles: Record<ToastType, string> = {
  success: "bg-success-50 border-success-200 text-success-800",
  error: "bg-error-50 border-error-200 text-error-800",
  warning: "bg-warning-50 border-warning-200 text-warning-800",
  info: "bg-primary-50 border-primary-200 text-primary-800",
};

const iconStyles: Record<ToastType, string> = {
  success: "text-success-500",
  error: "text-error-500",
  warning: "text-warning-500",
  info: "text-primary-500",
};

let toastListeners: ((toast: Toast) => void)[] = [];

export function toast(type: ToastType, message: string, duration = 5000) {
  const id = Math.random().toString(36).slice(2, 9);
  const newToast: Toast = { id, type, message, duration };
  toastListeners.forEach((listener) => listener(newToast));
}

toast.success = (message: string, duration?: number) =>
  toast("success", message, duration);
toast.error = (message: string, duration?: number) =>
  toast("error", message, duration);
toast.warning = (message: string, duration?: number) =>
  toast("warning", message, duration);
toast.info = (message: string, duration?: number) =>
  toast("info", message, duration);

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const listener = (newToast: Toast) => {
      setToasts((prev) => [...prev, newToast]);
      if (newToast.duration && newToast.duration > 0) {
        setTimeout(() => removeToast(newToast.id), newToast.duration);
      }
    };
    toastListeners.push(listener);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== listener);
    };
  }, [removeToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((t) => {
        const Icon = icons[t.type];
        return (
          <div
            key={t.id}
            className={cn(
              "flex items-start gap-3 p-4 rounded-lg border shadow-lg animate-slide-up",
              styles[t.type]
            )}
            role="alert"
          >
            <Icon className={cn("h-5 w-5 flex-shrink-0 mt-0.5", iconStyles[t.type])} />
            <p className="text-sm font-medium flex-1">{t.message}</p>
            <button
              onClick={() => removeToast(t.id)}
              className="flex-shrink-0 p-0.5 rounded hover:bg-black/5 transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
