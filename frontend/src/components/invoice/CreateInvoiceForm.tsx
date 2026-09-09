import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  ArrowLeft,
  FileText,
  Check,
} from "lucide-react";
import {
  createInvoiceSchema,
  type CreateInvoiceFormData,
} from "@/utils/validate";
import { useCreateInvoice } from "@/hooks/useInvoices";
import { useWallet } from "@/hooks/useWallet";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { toast } from "@/components/ui/Toast";
import { formatCurrency, formatDate } from "@/utils/format";

const steps = [
  { id: 1, title: "Invoice Details", description: "Amount and buyer info" },
  { id: 2, title: "Terms & Metadata", description: "Maturity and metadata" },
  { id: 3, title: "Review & Submit", description: "Confirm and create" },
];

export default function CreateInvoiceForm() {
  const [step, setStep] = useState(1);
  const { address } = useWallet();
  const createInvoice = useCreateInvoice();

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    formState: { errors },
  } = useForm<CreateInvoiceFormData>({
    resolver: zodResolver(createInvoiceSchema),
    defaultValues: {
      currency: "USD",
      maturityDate: "",
      metadataUri: "",
    },
  });

  const watchedValues = watch();

  const handleNext = async () => {
    let valid = false;
    if (step === 1) {
      valid = await trigger(["buyerAddress", "amount", "currency"]);
    } else if (step === 2) {
      valid = await trigger(["maturityDate", "metadataUri"]);
    }
    if (valid) setStep((s) => Math.min(s + 1, 3));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 1));

  const onSubmit = async (data: CreateInvoiceFormData) => {
    try {
      await createInvoice.mutateAsync({
        buyerAddress: data.buyerAddress,
        amount: data.amount,
        currency: data.currency,
        maturityDate: data.maturityDate,
        metadataUri: data.metadataUri || "",
      });
      toast.success("Invoice created successfully!");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create invoice";
      toast.error(message);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-50 rounded-lg">
            <FileText className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Create New Invoice
            </h2>
            <p className="text-sm text-gray-500">
              Tokenize your invoice on Stellar
            </p>
          </div>
        </div>
      </CardHeader>

      <CardBody>
        <div className="flex items-center justify-between mb-8">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div className="flex items-center gap-2">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    step > s.id
                      ? "bg-success-500 text-white"
                      : step === s.id
                        ? "bg-primary-600 text-white"
                        : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {step > s.id ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    s.id
                  )}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">{s.title}</p>
                  <p className="text-xs text-gray-500">{s.description}</p>
                </div>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`hidden sm:block h-px w-16 mx-3 ${
                    step > s.id ? "bg-success-300" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <Input
                label="Buyer's Stellar Address"
                placeholder="G..."
                error={errors.buyerAddress?.message}
                {...register("buyerAddress")}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Invoice Amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  error={errors.amount?.message}
                  {...register("amount")}
                />
                <Input
                  label="Currency"
                  placeholder="USD"
                  error={errors.currency?.message}
                  {...register("currency")}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <Input
                label="Maturity Date"
                type="date"
                hint="Date when the invoice payment is due"
                error={errors.maturityDate?.message}
                {...register("maturityDate")}
              />
              <Input
                label="Metadata URI (Optional)"
                placeholder="https://..."
                hint="Link to invoice document or metadata"
                error={errors.metadataUri?.message}
                {...register("metadataUri")}
              />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-900">
                  Invoice Summary
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Amount</p>
                    <p className="font-semibold text-gray-900">
                      {watchedValues.amount
                        ? formatCurrency(watchedValues.amount, watchedValues.currency)
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Currency</p>
                    <p className="font-semibold text-gray-900">
                      {watchedValues.currency || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Buyer</p>
                    <p className="font-mono text-xs text-gray-900 break-all">
                      {watchedValues.buyerAddress || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Maturity</p>
                    <p className="font-semibold text-gray-900">
                      {watchedValues.maturityDate
                        ? formatDate(watchedValues.maturityDate)
                        : "-"}
                    </p>
                  </div>
                  {watchedValues.metadataUri && (
                    <div className="col-span-2">
                      <p className="text-gray-500">Metadata</p>
                      <p className="text-xs text-primary-600 break-all">
                        {watchedValues.metadataUri}
                      </p>
                    </div>
                  )}
                  <div className="col-span-2">
                    <p className="text-gray-500">Creator</p>
                    <p className="font-mono text-xs text-gray-900 break-all">
                      {address || "-"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            {step > 1 ? (
              <Button
                type="button"
                variant="ghost"
                onClick={handleBack}
                icon={<ArrowLeft className="h-4 w-4" />}
              >
                Back
              </Button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <Button
                type="button"
                onClick={handleNext}
                icon={<ArrowRight className="h-4 w-4" />}
              >
                Continue
              </Button>
            ) : (
              <Button
                type="submit"
                loading={createInvoice.isPending}
                icon={<FileText className="h-4 w-4" />}
              >
                Create Invoice
              </Button>
            )}
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
