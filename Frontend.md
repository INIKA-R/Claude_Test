# Frontend.md — Architecture & Reference

React + TypeScript + Vite + Tailwind app for the Order Fulfilment backend (see
[Claude.md](Claude.md) / [Backend](backend) for the API contract).

## Structure
```
frontend/src/
  pages/                 One component per route (see Routes below)
  components/            App-specific shell: Navbar, Layout (nav + page transitions + toasts)
  reusablecomponents/    Generic, presentation-only UI: Button, Card, TextField, SelectField,
                         Badge, LoadingState, EmptyState, ErrorState, PageHeader
  services/              All HTTP calls — apiClient.ts (axios instance + getErrorMessage),
                         customersApi.ts, inventoryApi.ts, ordersApi.ts,
                         inventoryAvailabilityApi.ts (CHANGE2, Phase 10)
  hooks/                 useAsyncData.ts — shared loading/error/data fetch lifecycle
  types/                 Mirrors backend/src/types/index.ts
```

**Rule enforced throughout:** components never call `apiClient`/axios directly or
import from `../services/*Api` for anything other than the typed functions — every
network call goes through a `services/*Api.ts` function. Pages call those functions
(directly for one-off actions, via `useAsyncData` for list fetches); components only
receive data/handlers as props.

## Routes (`react-router-dom`, all under one `Layout`)
| Path | Page | Purpose |
|---|---|---|
| `/customers` | `CustomerMaintenancePage` | List/create/edit/delete customers |
| `/inventory` | `InventoryMaintenancePage` | List/create/edit/delete inventory rows (productId+warehouseId) |
| `/inventory-availability` | `InventoryAvailabilityPage` | (CHANGE2, Phase 10) Report newly available stock, apply it to the oldest Open backorder for that product |
| `/orders/new` | `OrderSubmissionPage` | Submit an order, view its fulfilment result |
| `/orders/lookup` | `OrderResultLookupPage` | Look up a persisted fulfilment result by orderId |
| `/` and unknown paths | — | Redirect to `/orders/new` |

## State handling
- **Loading**: `LoadingState` (spinner) while a list/lookup fetch is in flight.
- **Empty**: `EmptyState` for zero rows, or for the lookup page before any search / after a
  confirmed 404 ("Order not Found" per FRD §5, distinguished from a real error).
- **Error**: `ErrorState` with a "Try again" retry action, driven by `getErrorMessage()`
  in `services/apiClient.ts` (unwraps the backend's `{error, details}` shape, or reports
  "Cannot reach the server" on a network-level failure).
- **Feedback**: `react-toastify` for every create/update/delete action and order submit
  result (success/blocked/error), so list-mutation feedback doesn't require a page reload.

## Theming & motion
- Tailwind utility classes only (no custom theme tokens) — blue-600 as the primary accent,
  slate for neutral text/borders, rounded-2xl cards with a soft shadow (`Card` component).
  Responsive via Tailwind breakpoints (`sm:`) — forms stack to a single column on narrow
  viewports, the nav collapses to icon-only.
- `lucide-react` for all icons.
- `framer-motion`: `Layout` wraps `<Outlet/>` in `AnimatePresence`/`motion.div` for a
  fade+slide route transition; result cards (order submit/lookup) fade in on arrival.

## Known gaps (by design, Phase 3 scope)
- No client-side auth/session — matches the backend, which has none.
- Master-data CRUD (Customers/Inventory) has no pagination; fine for the scale of a
  Stage 1 demo, would need it before use with a large dataset.
- Inline "modal" confirmation for delete uses `window.confirm` rather than a styled
  dialog — kept simple since no design system/dialog primitive was specified.

## CHANGE1 result display (Phase 7)
`OrderSubmissionPage` and `OrderResultLookupPage` already rendered
`backorderedQuantity` and looped over every `allocations` row generically (built
Phase 3, before CHANGE1 existed), and `Badge`'s `fulfilmentStatusTone` already had an
amber case for `"PartiallyReleased"`. No new page/component was added; the existing
result panel was extended in place:
- Backordered Qty is now amber-highlighted when `> 0` (both pages), so a partial
  release is visually distinct from a full one at a glance.
- The allocations list header now shows `(N warehouses)` when there's more than one
  allocation, so a Priority multi-warehouse release reads differently from a
  Standard single-warehouse one.
- `OrderSubmissionPage`'s submit toast previously assumed only two outcomes
  (`Released` success / anything-else "blocked: {reason}"), which showed a
  nonsensical "blocked: null" for a `PartiallyReleased` result (`reason` is always
  `null` for that status). Fixed with a dedicated `toast.warning` branch reporting
  released/backordered counts.

## CHANGE2: Inventory Availability page (Phase 10)
One new page, `InventoryAvailabilityPage`, for `POST /inventory-availability` — no
new design system, built entirely from existing `reusablecomponents` (`Card`,
`TextField`, `SelectField`, `Button`, `Badge`, `PageHeader`), following the exact
form-then-result-card layout `OrderSubmissionPage` already established:
- Form: Product ID (`TextField`), Warehouse (`SelectField`, same `WH-A`/`WH-B`/`WH-C`
  options as the order form), Available Quantity (`TextField`, `type="number"`).
- Result card: reuses the same "Released Qty / Backordered Qty" tile layout as the
  order pages (backordered amber-highlighted when `> 0`), plus a single allocation
  row when one exists, or a "No Open backorder existed for this product" message
  when the response is `NoOpenBackorder`.
- One new tone function, `backorderStatusTone`, added to `Badge.tsx` alongside the
  existing `fulfilmentStatusTone`/`eligibilityStatusTone` (green for `Closed`, amber
  for `Open`, slate for `NoOpenBackorder`) — same pattern, no new component.
- New nav item "Restock" (`Truck` icon) between Inventory and New Order.

## Verified
`npm install`, `tsc --noEmit`, and `npm run build` all pass. Phase 3 exercised every
page in an environment with no live MSSQL instance, confirming error handling but not
the happy paths. Phase 7 re-ran the frontend against the real MSSQL instance used in
Phase 4-6 and confirmed, via the browser, that a Priority partial release
(`PartiallyReleased`, released 75 / backordered 25, two allocation rows) renders
correctly on both the Order Submission and Order Lookup pages. Phase 10 re-confirmed
this plus the new page against the same live instance: submitting inventory against
a real `PartiallyReleased` order's backorder correctly showed the `Open` badge,
updated released/backordered counts, and the new allocation row on the Inventory
Availability page itself, and the Order Result Lookup page for that same order
picked up the change (status, quantities, and the new allocation row) with no page
code changes needed — see `Claude.md`'s Phase 10 verification table for the full
scenario list.
