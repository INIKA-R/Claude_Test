import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { PackageCheck, Send } from "lucide-react";
import { toast } from "react-toastify";
import { Badge, fulfilmentStatusTone } from "../reusablecomponents/Badge";
import { Button } from "../reusablecomponents/Button";
import { Card } from "../reusablecomponents/Card";
import { PageHeader } from "../reusablecomponents/PageHeader";
import { SelectField } from "../reusablecomponents/SelectField";
import { TextField } from "../reusablecomponents/TextField";
import * as ordersApi from "../services/ordersApi";
import { getErrorMessage } from "../services/apiClient";
import { CustomerType, FulfilmentResponse } from "../types";

const CUSTOMER_TYPE_OPTIONS: { value: CustomerType; label: string }[] = [
  { value: "Standard", label: "Standard" },
  { value: "Priority", label: "Priority" },
];

const EMPTY_FORM = {
  orderId: "",
  customerId: "",
  customerType: "Standard" as CustomerType,
  productId: "",
  quantity: "",
  promisedDeliveryDate: "",
};

export default function OrderSubmissionPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<FulfilmentResponse | null>(null);

  function update<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const quantity = Number(form.quantity);
    if (
      !form.orderId.trim() ||
      !form.customerId.trim() ||
      !form.productId.trim() ||
      !Number.isInteger(quantity) ||
      quantity <= 0 ||
      !form.promisedDeliveryDate
    ) {
      toast.error("All fields are required and quantity must be a whole number > 0");
      return;
    }

    setIsSubmitting(true);
    setResult(null);
    try {
      const response = await ordersApi.createOrder({
        orderId: form.orderId.trim(),
        customerId: form.customerId.trim(),
        customerType: form.customerType,
        productId: form.productId.trim(),
        quantity,
        promisedDeliveryDate: form.promisedDeliveryDate,
      });
      setResult(response);
      if (response.status === "Released") {
        toast.success(`Order ${response.orderId} released`);
      } else {
        toast.info(`Order ${response.orderId} blocked: ${response.reason}`);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Order Submission"
        description="Submit an order for fulfilment evaluation."
      />

      <Card>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="Order ID"
            placeholder="e.g. ORD-1001"
            value={form.orderId}
            onChange={(e) => update("orderId", e.target.value)}
          />
          <TextField
            label="Customer ID"
            placeholder="e.g. CUST-001"
            value={form.customerId}
            onChange={(e) => update("customerId", e.target.value)}
          />
          <SelectField
            label="Customer Type"
            options={CUSTOMER_TYPE_OPTIONS}
            value={form.customerType}
            onChange={(e) => update("customerType", e.target.value as CustomerType)}
          />
          <TextField
            label="Product ID"
            placeholder="e.g. PROD-100"
            value={form.productId}
            onChange={(e) => update("productId", e.target.value)}
          />
          <TextField
            label="Quantity"
            type="number"
            min={1}
            value={form.quantity}
            onChange={(e) => update("quantity", e.target.value)}
          />
          <TextField
            label="Promised Delivery Date"
            type="date"
            value={form.promisedDeliveryDate}
            onChange={(e) => update("promisedDeliveryDate", e.target.value)}
          />
          <div className="sm:col-span-2">
            <Button type="submit" isLoading={isSubmitting} icon={<Send className="h-4 w-4" />}>
              Submit Order
            </Button>
          </div>
        </form>
      </Card>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Card>
            <div className="flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-blue-500" />
              <h2 className="text-sm font-semibold text-slate-800">
                Result for {result.orderId}
              </h2>
              <Badge tone={fulfilmentStatusTone(result.status)}>{result.status}</Badge>
            </div>

            {result.reason && <p className="mt-2 text-sm text-slate-600">Reason: {result.reason}</p>}

            <div className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Released Qty</p>
                <p className="font-medium text-slate-700">{result.releasedQuantity}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Backordered Qty</p>
                <p className="font-medium text-slate-700">{result.backorderedQuantity}</p>
              </div>
            </div>

            {result.allocations.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Allocations</p>
                <ul className="flex flex-col gap-1">
                  {result.allocations.map((allocation) => (
                    <li
                      key={allocation.warehouseId}
                      className="flex items-center justify-between rounded-xl bg-blue-50 px-4 py-2 text-sm text-blue-700"
                    >
                      <span>{allocation.warehouseId}</span>
                      <span className="font-medium">{allocation.allocatedQuantity} units</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </motion.div>
      )}
    </div>
  );
}
