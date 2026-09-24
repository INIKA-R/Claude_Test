import { FormEvent, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { PackageSearch, Search } from "lucide-react";
import { Badge, fulfilmentStatusTone } from "../reusablecomponents/Badge";
import { Button } from "../reusablecomponents/Button";
import { Card } from "../reusablecomponents/Card";
import { EmptyState } from "../reusablecomponents/EmptyState";
import { ErrorState } from "../reusablecomponents/ErrorState";
import { LoadingState } from "../reusablecomponents/LoadingState";
import { PageHeader } from "../reusablecomponents/PageHeader";
import { TextField } from "../reusablecomponents/TextField";
import * as ordersApi from "../services/ordersApi";
import { getErrorMessage } from "../services/apiClient";
import { FulfilmentResponse } from "../types";

type LookupState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "not-found"; orderId: string }
  | { status: "error"; message: string }
  | { status: "found"; result: FulfilmentResponse };

export default function OrderResultLookupPage() {
  const [orderId, setOrderId] = useState("");
  const [state, setState] = useState<LookupState>({ status: "idle" });

  async function handleLookup(e: FormEvent) {
    e.preventDefault();
    const trimmed = orderId.trim();
    if (!trimmed) return;

    setState({ status: "loading" });
    try {
      const result = await ordersApi.getOrder(trimmed);
      setState({ status: "found", result });
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setState({ status: "not-found", orderId: trimmed });
      } else {
        setState({ status: "error", message: getErrorMessage(err) });
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Order Result Lookup"
        description="Look up a previously submitted order's fulfilment result by orderId."
      />

      <Card>
        <form onSubmit={handleLookup} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <TextField
              label="Order ID"
              placeholder="e.g. ORD-1001"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
            />
          </div>
          <Button type="submit" isLoading={state.status === "loading"} icon={<Search className="h-4 w-4" />}>
            Look Up
          </Button>
        </form>
      </Card>

      <Card className={state.status === "found" ? undefined : "p-0"}>
        {state.status === "idle" && (
          <EmptyState
            icon={<PackageSearch className="h-6 w-6" />}
            title="Search for an order"
            description="Enter an orderId above to see its fulfilment result."
          />
        )}
        {state.status === "loading" && <LoadingState label="Looking up order..." />}
        {state.status === "not-found" && (
          <EmptyState
            icon={<PackageSearch className="h-6 w-6" />}
            title="Order not found"
            description={`No fulfilment result exists yet for "${state.orderId}".`}
          />
        )}
        {state.status === "error" && (
          <ErrorState message={state.message} onRetry={() => setState({ status: "idle" })} />
        )}
        {state.status === "found" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-800">
                Result for {state.result.orderId}
              </h2>
              <Badge tone={fulfilmentStatusTone(state.result.status)}>{state.result.status}</Badge>
            </div>

            {state.result.reason && (
              <p className="mt-2 text-sm text-slate-600">Reason: {state.result.reason}</p>
            )}

            <div className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Released Qty</p>
                <p className="font-medium text-slate-700">{state.result.releasedQuantity}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Backordered Qty</p>
                <p className="font-medium text-slate-700">{state.result.backorderedQuantity}</p>
              </div>
            </div>

            {state.result.allocations.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Allocations</p>
                <ul className="flex flex-col gap-1">
                  {state.result.allocations.map((allocation) => (
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
          </motion.div>
        )}
      </Card>
    </div>
  );
}
