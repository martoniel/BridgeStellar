import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { User, Bell, Wallet, Save } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { api } from "@/lib/api";
import { settingsSchema, type SettingsFormData } from "@/utils/validate";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { truncateAddress, cn } from "@/utils/format";
import { toast } from "@/components/ui/Toast";

export default function Settings() {
  const { address, network } = useWallet();
  const [notifications, setNotifications] = useState({
    invoiceFunded: true,
    settlementComplete: true,
    sharePurchased: false,
    maturityReminder: true,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
  });

  const onSubmit = async (data: SettingsFormData) => {
    try {
      await api.users.upsert({
        displayName: data.displayName || undefined,
        email: data.email || undefined,
      });
      toast.success("Settings updated successfully");
    } catch {
      toast.error("Failed to update settings");
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your profile and preferences
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-900">Profile</h2>
            </div>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Wallet Address</p>
                <p className="text-sm font-mono text-gray-900 break-all">
                  {address || "Not connected"}
                </p>
                {network && (
                  <p className="text-xs text-gray-500 mt-1">
                    Network: {network}
                  </p>
                )}
              </div>
              <Input
                label="Display Name"
                placeholder="Your name"
                error={errors.displayName?.message}
                {...register("displayName")}
              />
              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                error={errors.email?.message}
                {...register("email")}
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!isDirty}
                  loading={false}
                  icon={<Save className="h-4 w-4" />}
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-900">
                Notifications
              </h2>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {(
                Object.keys(notifications) as Array<
                  keyof typeof notifications
                >
              ).map((key) => {
                const labels: Record<keyof typeof notifications, string> = {
                  invoiceFunded: "Invoice fully funded",
                  settlementComplete: "Settlement completed",
                  sharePurchased: "Share purchased by others",
                  maturityReminder: "Invoice maturity reminder",
                };
                return (
                  <label
                    key={key}
                    className="flex items-center justify-between py-2"
                  >
                    <span className="text-sm text-gray-700">
                      {labels[key]}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={notifications[key]}
                      onClick={() =>
                        setNotifications((prev) => ({
                          ...prev,
                          [key]: !prev[key],
                        }))
                      }
                      className={cn(
                        "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
                        notifications[key] ? "bg-primary-600" : "bg-gray-200"
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                          notifications[key]
                            ? "translate-x-5"
                            : "translate-x-0"
                        )}
                      />
                    </button>
                  </label>
                );
              })}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-900">
                Connected Wallet
              </h2>
            </div>
          </CardHeader>
          <CardBody>
            {address ? (
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-success-50 flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-success-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Freighter Wallet
                  </p>
                  <p className="text-xs font-mono text-gray-500 mt-0.5">
                    {truncateAddress(address, 8)}
                  </p>
                  <p className="text-xs text-success-600 mt-0.5">
                    Connected on {network || "testnet"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                No wallet connected. Connect your Freighter wallet from the
                navbar.
              </p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
