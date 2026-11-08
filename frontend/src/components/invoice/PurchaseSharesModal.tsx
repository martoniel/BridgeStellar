import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShoppingCart, Calculator } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import {
  purchaseSharesSchema,
  type PurchaseSharesFormData,
} from "@/utils/validate";
import { usePurchaseShares } from "@/hooks/useInvoices";
import { useWallet } from "@/hooks/useWallet";
import { toast } from "@/components/ui/Toast";
import { formatCurrency } from "@/utils/format";

interface PurchaseSharesModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
  invoiceAmount: string;
  fundedAmount: string;
  currency: string;
  sharePrice: number;
  totalShares: number;
}

export default function PurchaseSharesModal({
  isOpen,
  onClose,
  invoiceId,
  invoiceAmount,
  currency,
  sharePrice,
  totalShares,
}: PurchaseSharesModalProps) {
  const { signAndSubmit } = useWallet();
  const purchaseShares = usePurchaseShares();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<PurchaseSharesFormData>({
    resolver: zodResolver(purchaseSharesSchema),
    defaultValues: { shareCount: 1 },
  });

  const watchCount = watch("shareCount", 1);
  const totalPrice = sharePrice * watchCount;
  const potentialReturn = totalPrice * 1.15;

  const onSubmit = async (data: PurchaseSharesFormData) => {
    try {
      const txHash = await signAndSubmit("placeholder_xdr");
      await purchaseShares.mutateAsync({
        id: invoiceId,
        data: { shareCount: data.shareCount, txHash },
      });
      toast.success("Shares purchased successfully!");
      reset();
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to purchase shares";
      toast.error(message);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Purchase Shares"
      description="Buy shares in this invoice to earn returns upon settlement."
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Invoice Value</span>
            <span className="font-medium text-gray-900">
              {formatCurrency(invoiceAmount, currency)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Price per Share</span>
            <span className="font-medium text-gray-900">
              {formatCurrency(sharePrice.toString(), currency)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Available Shares</span>
            <span className="font-medium text-gray-900">{totalShares}</span>
          </div>
        </div>

        <Input
          label="Number of Shares"
          type="number"
          min="1"
          max={totalShares}
          step="1"
          placeholder="1"
          icon={<ShoppingCart className="h-4 w-4" />}
          error={errors.shareCount?.message}
          {...register("shareCount", { valueAsNumber: true })}
        />

        {watchCount > 0 && (
          <div className="bg-primary-50 rounded-lg p-4 animate-fade-in">
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="h-4 w-4 text-primary-600" />
              <span className="text-sm font-medium text-primary-700">
                Purchase Summary
              </span>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-primary-600">
                  {watchCount} share{watchCount !== 1 ? "s" : ""}
                </span>
                <span className="font-bold text-primary-700">
                  {formatCurrency(totalPrice.toString(), currency)}
                </span>
              </div>
              <div className="flex justify-between text-success-600">
                <span>Potential Return</span>
                <span className="font-semibold">
                  {formatCurrency(potentialReturn.toString(), currency)}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={purchaseShares.isPending}
            className="flex-1"
          >
            Purchase Shares
          </Button>
        </div>
      </form>
    </Modal>
  );
}
