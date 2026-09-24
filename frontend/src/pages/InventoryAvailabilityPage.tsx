import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { PackageCheck, Truck } from "lucide-react";
import { toast } from "react-toastify";
import { Badge, backorderStatusTone } from "../reusablecomponents/Badge";
import { Button } from "../reusablecomponents/Button";
import { Card } from "../reusablecomponents/Card";
import { PageHeader } from "../reusablecomponents/PageHeader";
import { SelectField } from "../reusablecomponents/SelectField";
import { TextField } from "../reusablecomponents/TextField";
import * as inventoryAvailabilityApi from "../services/inventoryAvailabilityApi";
import { getErrorMessage } from "../services/apiClient";
import { InventoryAvailabilityResponse, WarehouseId } from "../types";

const WAREHOUSE_OPTIONS: { value: WarehouseId; label: string }[] = [
  { value: "WH-A", label: "WH-A" },
  { value: "WH-B", label: "WH-B" },
  { value: "WH-C", label: "WH-C" },
];

const EMPTY_FORM = {
  productId: "",
  warehouseId: "WH-A" as WarehouseId,
  availableQuantity: "",
};

export default function InventoryAvailabilityPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<InventoryAvailabilityResponse | null>(null);

  function update<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const availableQuantity = Number(form.availableQuantity);
    if (!form.productId.trim() || !Number.isInteger(availableQuantity) || availableQuantity <= 0) {
      toast.error("Product ID is required and available quantity must be a whole number > 0");
      return;
    }

    setIsSubmitting(true);
    setResult(null);
    try {
      const response = await inventoryAvailabilityApi.createInventoryAvailability({
        productId: form.productId.trim(),
        warehouseId: form.warehouseId,
        availableQuantity,
      });
      setResult(response);
      if (response.backorderStatus === "NoOpenBackorder") {
        toast.info(`Inventory recorded for ${form.productId.trim()} — no Open backorder to apply it to`);
      } else if (response.backorderStatus === "Closed") {
        toast.success(`Backorder for order ${response.orderId} fully closed`);
      } else {
        toast.warning(`Backorder for order ${response.orderId} partially fulfilled — still Open`);
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
        title="Inventory Availability"
        description="Report newly available stock and apply it to the oldest Open backorder for that product."
      />

      <Card>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="Product ID"
            placeholder="e.g. PROD01"
            value={form.productId}
            onChange={(e) => update("productId", e.target.value)}
          />
          <SelectField
            label="Warehouse"
            options={WAREHOUSE_OPTIONS}
            value={form.warehouseId}
            onChange={(e) => update("warehouseId", e.target.value as WarehouseId)}
          />
          <TextField
            label="Available Quantity"
            type="number"
            min={1}
            value={form.availableQuantity}
            onChange={(e) => update("availableQuantity", e.target.value)}
          />
          <div className="flex items-end sm:col-span-2">
            <Button type="submit" isLoading={isSubmitting} icon={<Truck className="h-4 w-4" />}>
              Submit Availability
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
                {result.orderId ? `Result for ${result.orderId}` : "Result"}
              </h2>
              <Badge tone={backorderStatusTone(result.backorderStatus)}>{result.backorderStatus}</Badge>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Released Qty</p>
                <p className="font-medium text-slate-700">{result.releasedQuantity}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Backordered Qty</p>
                <p
                  className={`font-medium ${
                    result.backorderedQuantity > 0 ? "text-amber-600" : "text-slate-700"
                  }`}
                >
                  {result.backorderedQuantity}
                </p>
              </div>
            </div>

            {result.allocation ? (
              <div className="mt-4">
                <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Allocation</p>
                <ul className="flex flex-col gap-1">
                  <li className="flex items-center justify-between rounded-xl bg-blue-50 px-4 py-2 text-sm text-blue-700">
                    <span>{result.allocation.warehouseId}</span>
                    <span className="font-medium">{result.allocation.allocatedQuantity} units</span>
                  </li>
                </ul>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">No Open backorder existed for this product.</p>
            )}
          </Card>
        </motion.div>
      )}
    </div>
  );
}
