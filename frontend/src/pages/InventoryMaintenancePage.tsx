import { FormEvent, useState } from "react";
import { PackagePlus, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { Button } from "../reusablecomponents/Button";
import { Card } from "../reusablecomponents/Card";
import { EmptyState } from "../reusablecomponents/EmptyState";
import { ErrorState } from "../reusablecomponents/ErrorState";
import { LoadingState } from "../reusablecomponents/LoadingState";
import { PageHeader } from "../reusablecomponents/PageHeader";
import { SelectField } from "../reusablecomponents/SelectField";
import { TextField } from "../reusablecomponents/TextField";
import { useAsyncData } from "../hooks/useAsyncData";
import * as inventoryApi from "../services/inventoryApi";
import { getErrorMessage } from "../services/apiClient";
import { Inventory, WarehouseId } from "../types";

const WAREHOUSE_OPTIONS: { value: WarehouseId; label: string }[] = [
  { value: "WH-A", label: "WH-A" },
  { value: "WH-B", label: "WH-B" },
  { value: "WH-C", label: "WH-C" },
];

const rowKey = (row: { productId: string; warehouseId: string }) =>
  `${row.productId}::${row.warehouseId}`;

export default function InventoryMaintenancePage() {
  const { data: inventory, isLoading, error, refetch } = useAsyncData(inventoryApi.listInventory);

  const [productId, setProductId] = useState("");
  const [warehouseId, setWarehouseId] = useState<WarehouseId>("WH-A");
  const [availableQuantity, setAvailableQuantity] = useState("");
  const [earliestDispatchDate, setEarliestDispatchDate] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState("");
  const [editDate, setEditDate] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const quantity = Number(availableQuantity);
    if (!productId.trim() || !earliestDispatchDate || !Number.isInteger(quantity) || quantity < 0) {
      toast.error("productId, a valid quantity (>= 0) and a dispatch date are required");
      return;
    }
    setIsCreating(true);
    try {
      await inventoryApi.createInventory({
        productId: productId.trim(),
        warehouseId,
        availableQuantity: quantity,
        earliestDispatchDate,
      });
      toast.success(`Inventory row created for ${productId} / ${warehouseId}`);
      setProductId("");
      setAvailableQuantity("");
      setEarliestDispatchDate("");
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsCreating(false);
    }
  }

  function startEdit(row: Inventory) {
    setEditingKey(rowKey(row));
    setEditQuantity(String(row.availableQuantity));
    setEditDate(row.earliestDispatchDate);
  }

  async function saveEdit(row: Inventory) {
    const quantity = Number(editQuantity);
    if (!Number.isInteger(quantity) || quantity < 0 || !editDate) {
      toast.error("A valid quantity (>= 0) and dispatch date are required");
      return;
    }
    setIsSavingEdit(true);
    try {
      await inventoryApi.updateInventory(row.productId, row.warehouseId, {
        availableQuantity: quantity,
        earliestDispatchDate: editDate,
      });
      toast.success(`Inventory row updated for ${row.productId} / ${row.warehouseId}`);
      setEditingKey(null);
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleDelete(row: Inventory) {
    if (!window.confirm(`Delete inventory row ${row.productId} / ${row.warehouseId}?`)) return;
    setDeletingKey(rowKey(row));
    try {
      await inventoryApi.deleteInventory(row.productId, row.warehouseId);
      toast.success(`Inventory row deleted for ${row.productId} / ${row.warehouseId}`);
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeletingKey(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Inventory Maintenance"
        description="Manage available stock per product and warehouse."
      />

      <Card>
        <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-5 sm:items-end">
          <div className="sm:col-span-2">
            <TextField
              label="Product ID"
              placeholder="e.g. PROD-100"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            />
          </div>
          <SelectField
            label="Warehouse"
            options={WAREHOUSE_OPTIONS}
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value as WarehouseId)}
          />
          <TextField
            label="Available Qty"
            type="number"
            min={0}
            value={availableQuantity}
            onChange={(e) => setAvailableQuantity(e.target.value)}
          />
          <TextField
            label="Earliest Dispatch"
            type="date"
            value={earliestDispatchDate}
            onChange={(e) => setEarliestDispatchDate(e.target.value)}
          />
          <div className="sm:col-span-5">
            <Button type="submit" isLoading={isCreating} icon={<PackagePlus className="h-4 w-4" />}>
              Add Inventory Row
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-0">
        {isLoading && <LoadingState label="Loading inventory..." />}
        {!isLoading && error && <ErrorState message={error} onRetry={refetch} />}
        {!isLoading && !error && inventory && inventory.length === 0 && (
          <EmptyState
            title="No inventory rows yet"
            description="Add a product/warehouse row above to get started."
          />
        )}
        {!isLoading && !error && inventory && inventory.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-6 py-3 font-medium">Product ID</th>
                  <th className="px-6 py-3 font-medium">Warehouse</th>
                  <th className="px-6 py-3 font-medium">Available Qty</th>
                  <th className="px-6 py-3 font-medium">Earliest Dispatch</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventory.map((row) => {
                  const key = rowKey(row);
                  const isEditing = editingKey === key;
                  return (
                    <tr key={key}>
                      <td className="px-6 py-3 font-medium text-slate-700">{row.productId}</td>
                      <td className="px-6 py-3 text-slate-600">{row.warehouseId}</td>
                      <td className="px-6 py-3">
                        {isEditing ? (
                          <TextField
                            label=""
                            aria-label="Available Quantity"
                            type="number"
                            min={0}
                            value={editQuantity}
                            onChange={(e) => setEditQuantity(e.target.value)}
                          />
                        ) : (
                          <span className="text-slate-600">{row.availableQuantity}</span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        {isEditing ? (
                          <TextField
                            label=""
                            aria-label="Earliest Dispatch Date"
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                          />
                        ) : (
                          <span className="text-slate-600">{row.earliestDispatchDate}</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="secondary"
                              onClick={() => setEditingKey(null)}
                              disabled={isSavingEdit}
                            >
                              Cancel
                            </Button>
                            <Button isLoading={isSavingEdit} onClick={() => saveEdit(row)}>
                              Save
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => startEdit(row)}>
                              Edit
                            </Button>
                            <Button
                              variant="danger"
                              isLoading={deletingKey === key}
                              onClick={() => handleDelete(row)}
                              icon={<Trash2 className="h-4 w-4" />}
                            >
                              Delete
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
