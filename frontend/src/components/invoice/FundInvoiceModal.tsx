import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DollarSign, TrendingUp } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { fundInvoiceSchema, type FundInvoiceFormData } from "@/utils/validate";
import { useFundInvoice } from "@/hooks/useInvoices";
import { useWallet } from "@/hooks/useWallet";
import { toast } from "@/components/ui/Toast";
import { formatCurrency, formatPercentage } from "@/utils/format";

interface FundInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
  invoiceAmount: string;
  fundedAmount: string;
  currency: string;
}

export default function FundInvoiceModal({
  isOpen,
  onClose,
  invoiceId,
  invoiceAmount,
  fundedAmount,
  currency,
}: FundInvoiceModalProps) {
  const { signAndSubmit } = useWallet();
  const fundInvoice = useFundInvoice();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FundInvoiceFormData>({
    resolver: zodResolver(fundInvoiceSchema),
  });

  const watchAmount = watch("amount", "");
  const amount = parseFloat(watchAmount) || 0;
  const totalAmount = parseFloat(invoiceAmount) || 0;
  const currentFunded = parseFloat(fundedAmount) || 0;
  const remaining = totalAmount - currentFunded;
  const estimatedReturnRate = 0.05;
  const estimatedReturn = amount * (1 + estimatedReturnRate);

  const onSubmit = async (data: FundInvoiceFormData) => {
    try {
      const txHash = await signAndSubmit("placeholder_xdr");
      await fundInvoice.mutateAsync({
        id: invoiceId,
        data: { amount: data.amount, txHash },
      });
      toast.success("Invoice funded successfully!");
      reset();
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fund invoice";
      toast.error(message);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Fund Invoice"
      description="Provide capital to this invoice and earn returns upon settlement."
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Invoice Amount</span>
            <span className="font-medium text-gray-900">
              {formatCurrency(invoiceAmount, currency)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Already Funded</span>
            <span className="font-medium text-gray-900">
              {formatCurrency(fundedAmount, currency)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Remaining</span>
            <span className="font-semibold text-primary-600">
              {formatCurrency(remaining.toString(), currency)}
            </span>
          </div>
        </div>

        <Input
          label="Funding Amount"
          type="number"
          step="0.01"
          min="0"
          max={remaining}
          placeholder="0.00"
          icon={<DollarSign className="h-4 w-4" />}
          error={errors.amount?.message}
          {...register("amount")}
        />

        {amount > 0 && (
          <div className="bg-success-50 rounded-lg p-4 animate-fade-in">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-success-600" />
              <span className="text-sm font-medium text-success-700">
                Estimated Return
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-success-600">
                {formatPercentage(estimatedReturnRate * 100)} return
              </span>
              <span className="font-bold text-success-700">
                {formatCurrency(estimatedReturn.toString(), currency)}
              </span>
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
            loading={fundInvoice.isPending}
            className="flex-1"
          >
            Fund Invoice
          </Button>
        </div>
      </form>
    </Modal>
  );
}
