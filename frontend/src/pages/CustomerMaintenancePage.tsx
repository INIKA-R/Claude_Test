import { FormEvent, useState } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { toast } from "react-toastify";
import { Badge, eligibilityStatusTone } from "../reusablecomponents/Badge";
import { Button } from "../reusablecomponents/Button";
import { Card } from "../reusablecomponents/Card";
import { EmptyState } from "../reusablecomponents/EmptyState";
import { ErrorState } from "../reusablecomponents/ErrorState";
import { LoadingState } from "../reusablecomponents/LoadingState";
import { PageHeader } from "../reusablecomponents/PageHeader";
import { SelectField } from "../reusablecomponents/SelectField";
import { TextField } from "../reusablecomponents/TextField";
import { useAsyncData } from "../hooks/useAsyncData";
import * as customersApi from "../services/customersApi";
import { getErrorMessage } from "../services/apiClient";
import { Customer, EligibilityStatus } from "../types";

const ELIGIBILITY_OPTIONS: { value: EligibilityStatus; label: string }[] = [
  { value: "Eligible", label: "Eligible" },
  { value: "CreditHold", label: "Credit Hold" },
  { value: "Unknown", label: "Unknown" },
];

export default function CustomerMaintenancePage() {
  const { data: customers, isLoading, error, refetch } = useAsyncData(customersApi.listCustomers);

  const [customerId, setCustomerId] = useState("");
  const [eligibilityStatus, setEligibilityStatus] = useState<EligibilityStatus>("Eligible");
  const [isCreating, setIsCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<EligibilityStatus>("Eligible");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!customerId.trim()) {
      toast.error("customerId is required");
      return;
    }
    setIsCreating(true);
    try {
      await customersApi.createCustomer({ customerId: customerId.trim(), eligibilityStatus });
      toast.success(`Customer ${customerId} created`);
      setCustomerId("");
      setEligibilityStatus("Eligible");
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsCreating(false);
    }
  }

  function startEdit(customer: Customer) {
    setEditingId(customer.customerId);
    setEditingStatus(customer.eligibilityStatus);
  }

  async function saveEdit(customer: Customer) {
    setIsSavingEdit(true);
    try {
      await customersApi.updateCustomer(customer.customerId, { eligibilityStatus: editingStatus });
      toast.success(`Customer ${customer.customerId} updated`);
      setEditingId(null);
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleDelete(customer: Customer) {
    if (!window.confirm(`Delete customer ${customer.customerId}?`)) return;
    setDeletingId(customer.customerId);
    try {
      await customersApi.deleteCustomer(customer.customerId);
      toast.success(`Customer ${customer.customerId} deleted`);
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Customer Maintenance"
        description="Manage customers and their eligibility status."
      />

      <Card>
        <form onSubmit={handleCreate} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <TextField
              label="Customer ID"
              placeholder="e.g. CUST-001"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            />
          </div>
          <div className="sm:w-48">
            <SelectField
              label="Eligibility Status"
              options={ELIGIBILITY_OPTIONS}
              value={eligibilityStatus}
              onChange={(e) => setEligibilityStatus(e.target.value as EligibilityStatus)}
            />
          </div>
          <Button type="submit" isLoading={isCreating} icon={<UserPlus className="h-4 w-4" />}>
            Add Customer
          </Button>
        </form>
      </Card>

      <Card className="p-0">
        {isLoading && <LoadingState label="Loading customers..." />}
        {!isLoading && error && <ErrorState message={error} onRetry={refetch} />}
        {!isLoading && !error && customers && customers.length === 0 && (
          <EmptyState
            title="No customers yet"
            description="Add a customer above to get started."
          />
        )}
        {!isLoading && !error && customers && customers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-6 py-3 font-medium">Customer ID</th>
                  <th className="px-6 py-3 font-medium">Eligibility</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((customer) => (
                  <tr key={customer.customerId}>
                    <td className="px-6 py-3 font-medium text-slate-700">{customer.customerId}</td>
                    <td className="px-6 py-3">
                      {editingId === customer.customerId ? (
                        <SelectField
                          label=""
                          aria-label="Eligibility Status"
                          options={ELIGIBILITY_OPTIONS}
                          value={editingStatus}
                          onChange={(e) => setEditingStatus(e.target.value as EligibilityStatus)}
                        />
                      ) : (
                        <Badge tone={eligibilityStatusTone(customer.eligibilityStatus)}>
                          {customer.eligibilityStatus}
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right">
                      {editingId === customer.customerId ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="secondary"
                            onClick={() => setEditingId(null)}
                            disabled={isSavingEdit}
                          >
                            Cancel
                          </Button>
                          <Button isLoading={isSavingEdit} onClick={() => saveEdit(customer)}>
                            Save
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" onClick={() => startEdit(customer)}>
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            isLoading={deletingId === customer.customerId}
                            onClick={() => handleDelete(customer)}
                            icon={<Trash2 className="h-4 w-4" />}
                          >
                            Delete
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
