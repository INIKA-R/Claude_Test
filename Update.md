# Update.md — Phase Log

## Phase 1 — Scaffold + Database (2026-09-24)
- Created `/frontend` (React + TS + Vite + Tailwind) and `/backend` (Node + Express + TS)
  as separate apps with their own `package.json`.
- Backend folder structure: `routes`, `controllers`, `services`, `middleware`, `utils`,
  `database`, `types`, `server.ts`.
- Frontend folder structure: `pages`, `components`, `reusablecomponents`, `services`, `hooks`, `types`.
- Added `.env` + `.env.example` to both apps (`.env` gitignored).
- Generated SQL scripts per FRD §7 under `backend/src/database/sql/`: 5 CREATE TABLE
  scripts (FK-ordered) and 7 stored procedure scripts, as separate `.sql` files for SSMS.
- Created `Claude.md` (architecture) and this file.
- No business logic implemented yet — controllers/services are stubs that throw
  `Not implemented`; stored procedures are pure CRUD.

## Phase 2 — Backend: Master Data + Fulfilment Logic (2026-09-24)
- Added a DB access layer (`backend/src/database/*.repository.ts`) between services
  and stored procs: `customer.repository.ts`, `inventory.repository.ts`,
  `order.repository.ts`, `allocation.repository.ts`, `fulfilmentResult.repository.ts`.
  No raw SQL in controllers or services — every DB call goes through a repository
  function that executes a named stored proc.
- Added `withTransaction`/`getRequest` helpers to `database/db.ts` so a multi-step
  persist (order + fulfilment decision + allocation + inventory decrement) commits or
  rolls back as one unit.
- Implemented full CRUD for Customer and Inventory (not specified in FRD §5, designed
  from the FRD §2 entity fields):
  - `GET/POST /customers`, `GET/PUT/DELETE /customers/:customerId`
  - `GET/POST /inventory`, `GET/PUT/DELETE /inventory/:productId/:warehouseId`
  - Added 9 new stored procs beyond FRD §7's indicative list (`sp_GetAllCustomers`,
    `sp_CreateCustomer`, `sp_UpdateCustomer`, `sp_DeleteCustomer`,
    `sp_GetInventoryByKey`, `sp_GetAllInventory`, `sp_CreateInventory`,
    `sp_UpdateInventory`, `sp_DeleteInventory`) — see
    `backend/src/database/sql/README.md` for the full execution order.
- Implemented `POST /orders` and `GET /orders/:orderId` exactly per FRD §5
  (request/response shapes, status codes), with FRD §3/§4 business rules in
  `backend/src/services/orders.service.ts`:
  - Eligibility gate (`Blocked-CreditHold` / `Eligibility Unknown`).
  - Single-warehouse-only match (`availableQuantity >= quantity` and
    `earliestDispatchDate <= promisedDeliveryDate`), fixed `WH-A > WH-B > WH-C`
    tie-break even on identical stock/date.
  - `Product Not Available` when no inventory row exists for the product;
    `Cannot Fulfil From Single Warehouse` when rows exist but none qualify.
  - Idempotent resubmission: a `FulfilmentResult` already persisted for the
    `orderId` short-circuits reprocessing and returns the stored result as-is (200).
- Consistent JSON error responses via a new `ApiError` class and central
  `errorHandler` middleware (validation errors → 400 with `{error, details}`;
  not-found → `{error}` with the appropriate 404/409/400).
- Decisions made to fill FRD §10 open items (flagged for confirmation, not final):
  - Reason strings used as proposed in FRD §4: `Product Not Available`,
    `Cannot Fulfil From Single Warehouse`.
  - `customerId` referencing a non-existent customer → `400 Customer not found`
    (FRD doesn't cover this case; the eligibility gate assumes the customer exists).
  - Idempotent replay responds `200` (not `409`) with the stored result, matching
    the `200 Released`/`200 Blocked` examples in FRD §5.
  - Inventory-decrement concurrency still relies only on the transaction's row lock
    (FRD §10 flags this as unspecified) — no optimistic/pessimistic retry logic added.
- Verified: `npm install`, `tsc --noEmit`, and the dev server boot on both a
  validation-error request (400 with field-level details) and a DB-dependent request
  (clean 500 JSON, no crash, when no MSSQL instance is reachable — this environment
  has no live SQL Server to test the full happy path against).

## Phase 3 — Frontend (2026-09-24)
- Added `react-router-dom`, `react-toastify`, `framer-motion`, `lucide-react`.
- Built the four pages: `CustomerMaintenancePage`, `InventoryMaintenancePage`,
  `OrderSubmissionPage`, `OrderResultLookupPage` (routes in `App.tsx`, `/` and unknown
  paths redirect to `/orders/new`).
- Added a `services/` API layer (`customersApi.ts`, `inventoryApi.ts`, `ordersApi.ts`,
  plus `getErrorMessage()` in `apiClient.ts`) — pages/components never call axios
  directly, only these typed functions.
- Added a `hooks/useAsyncData.ts` hook for the shared loading/error/data fetch
  lifecycle used by the two list pages.
- Added reusable, presentation-only components in `reusablecomponents/` (Button, Card,
  TextField, SelectField, Badge, LoadingState, EmptyState, ErrorState, PageHeader) and
  an app shell in `components/` (Navbar, Layout — nav + route-transition animation +
  the single `ToastContainer`).
- Every page has explicit loading/empty/error states; every mutation (create/update/
  delete/submit) reports success or failure via `react-toastify`.
- Theme: Tailwind blue/slate palette, rounded-2xl cards with soft shadows, responsive
  down to mobile widths (nav collapses to icons, forms stack to one column).
- Created `Frontend.md` documenting the structure, routing, state-handling and theming
  conventions, and this entry.
- Verified: `npm install`, `tsc --noEmit`, `npm run build` all pass. Manually exercised
  every page end-to-end against the running Phase 2 backend — nav, form validation,
  toasts, and error states all confirmed working. This environment has no live MSSQL
  instance, so every API call surfaced the backend's `500` (DB connection failure);
  this proved the frontend's error-handling path but not the Released/Blocked/
  idempotent-replay happy paths, which need a real database to exercise.

## Phase 4 — Integration, Testing & Docs (2026-09-24)
- Ran the SQL scripts (5 tables + 16 stored procedures) against a real MSSQL
  instance via SSMS, then pointed `backend/.env` at it (SQL Server Authentication).
- **Found and fixed a real bug**: `backend/src/database/db.ts` built its MSSQL
  connection config as a module-level constant read from `process.env` at import
  time, but `server.ts` imports the `routes` chain (which transitively imports
  `db.ts`) *before* calling `dotenv.config()` — so the config was silently frozen
  at its hardcoded fallback values (`localhost:1433`, no credentials) no matter
  what `.env` said. Invisible in Phases 1-3 (every DB call failed the same way
  either way); surfaced immediately once a real database was available. Fixed by
  making `db.ts` build its config lazily inside `getPool()`, and moved
  `dotenv.config()` to the first statement in `server.ts` as defense in depth.
- Ran the frontend and backend together against the real database and exercised
  every FRD §5 flow end-to-end (both via direct API calls and by driving the
  actual UI): Released (including the WH-A>WH-B tie-break with two identically
  qualifying warehouses), Blocked-CreditHold, Eligibility Unknown, Product Not
  Available (no inventory row), Cannot Fulfil From Single Warehouse (insufficient
  qty), duplicate-orderId idempotent replay (for both a Released and a Blocked
  order — confirmed inventory is not double-decremented), `GET /orders/:orderId`
  for an existing order, 404 for a non-existent order, and the `400 Customer not
  found` gap-fill decision from Phase 2. All passed correctly — see the table in
  `Claude.md`'s "End-to-end verification" section for the full matrix.
- No other errors found in this pass.
- Finalized `Claude.md`: added a full architecture diagram, an end-to-end
  verification table, and the bug writeup above; the rest of the architecture
  content from Phases 1-3 remains accurate and unchanged.
- Test data seeded during this pass (customers `CUST-ELIGIBLE-1`,
  `CUST-CREDITHOLD-1`, `CUST-UNKNOWN-1`; inventory for `PROD-A`/`PROD-B`; orders
  `ORD-RELEASED-1` and several `ORD-BLOCKED-*`/`ORD-UI-TEST-1`) was left in the
  database as-is — it's isolated to the `M08944_*` tables and doubles as sample
  data for manually exploring the app; delete it via the Customer/Inventory
  maintenance pages (or SSMS) if a clean database is wanted.

## Phase 5 — DB Delta: Priority Partial Fulfilment (2026-09-24)
Change requirement: Priority customers may now combine inventory across
WH-A/WH-B/WH-C and be partially released, instead of requiring one warehouse
to cover the full quantity (Standard-customer behaviour is unchanged).
- DB-only delta — did **not** rebuild the Phase 1-4 schema. Added two new
  tables and three new stored procedures as additional numbered scripts
  (continuing the existing 01-05 tables / 01-16 procedures sequence), FK-
  ordered, documented in `backend/src/database/sql/README.md`:
  - `M08944_Config` (`tables/06_M08944_Config.sql`) — generic key/value
    config store, seeded with `PriorityReleaseThresholdPct = 0.70`, so the
    release threshold can be changed via SQL with no code deploy.
  - `M08944_Backorder` (`tables/07_M08944_Backorder.sql`) — `orderId` (PK/FK
    -> `M08944_Order`), `backorderedQuantity` (> 0), `status` (`VARCHAR(20)
    DEFAULT 'Open'`). Modeled 1:1 per order, like `M08944_FulfilmentResult`,
    not 1:many like `M08944_Allocation`, since the change requirement creates
    at most one backorder per order.
  - `procedures/17_M08944_sp_CreateBackorder.sql`,
    `procedures/18_M08944_sp_GetBackorderByOrderId.sql`,
    `procedures/19_M08944_sp_GetConfigValue.sql` (generic by `@configKey`,
    reusable for future config beyond the release threshold).
- `M08944_FulfilmentResult.status` already allowed `'PartiallyReleased'` in
  its Phase 1 `CHECK` constraint, and `M08944_Order.customerType` already
  allowed `'Priority'` — no `ALTER` needed on existing tables.
- Left `M08944_Backorder.status` without a `CHECK` enum for now (just the
  `'Open'` default): no backorder-closure workflow was requested, and this
  phase's proc set only ever inserts `'Open'`.

## Phase 6 — Backend Logic Delta: Priority Partial Fulfilment (2026-09-24)
Wired the Phase 5 DB delta into `backend/src/services/orders.service.ts`.
Reused the existing eligibility gate, idempotent-replay check, and the
Standard-customer single-warehouse path unchanged; added a Priority-only
branch alongside it.
- Added `database/backorder.repository.ts` (`createBackorder`) and
  `database/config.repository.ts` (`getConfigValue`) — one function per new
  stored proc, same convention as the existing repositories.
  `sp_GetBackorderByOrderId` isn't called from the service yet: the
  `FulfilmentResult` row already persists `backorderedQuantity`, so replay
  and `GET /orders/:orderId` don't need to join `Backorder` to answer the
  existing response contract; the repository/proc are in place for a future
  backorder-management view.
- `orders.service.ts` changes:
  - `planPriorityFulfilment()`: for `customerType: "Priority"`, filters
    inventory to dispatch-eligible rows (`earliestDispatchDate <=
    promisedDeliveryDate`, same rule as Stage 1), sums availability across
    WH-A/WH-B/WH-C in that fixed order, and compares the sum against
    `quantity * threshold` (`>=` qualifies — exactly the threshold passes).
  - `getPriorityReleaseThreshold()`: reads `PriorityReleaseThresholdPct` via
    `config.repository`; falls back to `0.70` only if the row is ever missing
    or unparsable (defensive — the Phase 5 script seeds it).
  - Qualifying: releases `min(availableSum, quantity)` (never more than
    requested), greedily allocates that amount across the fixed warehouse
    order, and persists one `M08944_Allocation` row plus one inventory
    decrement per warehouse used, an `Open` backorder for any remainder, and
    a `FulfilmentResult` of `"Released"` (no remainder) or
    `"PartiallyReleased"` (remainder > 0) — all inside the existing
    `withTransaction` helper, same atomicity guarantee as the Standard path.
  - Not qualifying (`availableSum < quantity * threshold`): `Blocked`, no
    allocation, no backorder — same persistence shape as the existing
    Standard-blocked path, with a new reason string,
    `"Cannot Fulfil Priority Threshold"` (not specified by the change
    request; proposed the same way the Phase 2 reason strings were).
  - Idempotent replay was already generic over status/allocations in
    `fulfilmentResultRepository.getFulfilmentResult` / `toFulfilmentResponse`
    — no change needed for `PartiallyReleased` orders to replay correctly.
  - `POST /orders` / `GET /orders/:orderId` request/response contracts are
    unchanged; `customerType: "Priority"` and `status: "PartiallyReleased"`
    were already valid per the Phase 1 types/DB constraints.
- Verified by hand against the change request's worked example (quantity
  100, WH-A=40/WH-B=35/WH-C=0 dispatch-eligible) — the logic produces exactly
  `{status: "PartiallyReleased", releasedQuantity: 75, backorderedQuantity:
  25, allocations: [{WH-A,40},{WH-B,35}]}`. `tsc --noEmit` passes. No live
  MSSQL instance in this environment to re-run the Phase 4 end-to-end
  regression pass against a real database for this change; that (plus the
  Stage 1 regression the change request asks for) is still open.
- Frontend already renders `"PartiallyReleased"` (amber badge in
  `Badge.tsx`) from Phase 3 — no frontend change needed for this phase.
- Not done in this phase (out of scope for "Backend Logic Delta"): no
  automated test suite exists in this repo yet (Phase 1-4 verification was
  manual against real MSSQL), and `Claude.md`'s architecture text/rules
  section still describes Stage 1 only.

## Phase 7 — Frontend Delta + Regression + Submission: CHANGE1 (2026-09-24)

### Frontend delta
Reused the existing Order Submission / Order Result Lookup pages and components —
no new pages or components. Both pages already rendered `backorderedQuantity` and
looped generically over every `allocations` row (built in Phase 3, before this
change requirement existed), and `Badge.fulfilmentStatusTone` already had an amber
case for `"PartiallyReleased"`. What was actually missing/wrong:
- `OrderSubmissionPage`'s submit toast only handled two outcomes (`Released`
  success, else "blocked: {reason}"), which showed a nonsensical
  "blocked: null" for `PartiallyReleased` (`reason` is always `null` for that
  status). Added a `toast.warning` branch reporting released/backordered counts.
- Backordered Qty is now amber-highlighted when `> 0` on both pages, and the
  allocations header shows `(N warehouses)` when there's more than one row, so a
  Priority multi-warehouse partial release is visually distinct from a Standard
  single-warehouse release.
- `tsc --noEmit` passes.

### Regression + new-scenario verification
This environment has network access to the real MSSQL instance configured in
`backend/.env` (the same one used for Phase 4-6), and Phase 5's delta scripts were
already applied to it. Started the real backend against it and drove both the API
directly and the actual UI — this is a genuine re-run, not a re-statement of Phase 4.

**Stage 1 regression** (fresh orderIds, proving the *code path* still works, not
just replaying stored data; plus the original Phase 4 orderIds replayed too):
| Scenario | orderId | Result |
|---|---|---|
| Released, tie-break (WH-A & WH-B both qualify) | `ORD-P7-STD-RELEASED-1` | ✅ WH-A chosen (qty 5 vs WH-A=6/WH-B=10) |
| Released, only one warehouse qualifies | `ORD-P7-STD-RELEASED-2` | ✅ WH-B chosen (qty 8, WH-A had only 1 left after the above) |
| Blocked — `Blocked-CreditHold` | `ORD-P7-STD-BLOCKED-CREDITHOLD-1` | ✅ |
| Blocked — `Product Not Available` | `ORD-P7-STD-BLOCKED-NOPRODUCT-1` | ✅ |
| Blocked — `Cannot Fulfil From Single Warehouse` | `ORD-P7-STD-BLOCKED-SINGLEWH-1` | ✅ (WH-A=2 < qty 5) |
| Idempotent replay, Phase 4 order, resubmitted with `quantity: 999` | `ORD-RELEASED-1` | ✅ original stored result (`releasedQuantity: 5`, WH-A) returned unchanged |
| Idempotent replay, fresh order, resubmitted with `quantity: 999` | `ORD-P7-STD-RELEASED-1` | ✅ unchanged |
| `GET /orders/:orderId` 404 | `ORD-P7-DOES-NOT-EXIST` | ✅ `404 {orderId, error:"Order not Found"}` |
| `400 Customer not found` | `ORD-P7-CUSTOMER-404` | ✅ `400 {error:"Customer not found", details:{customerId}}` |

**New Priority scenarios**:
| Scenario | orderId | Inventory | Result |
|---|---|---|---|
| ≥70%, <100% (the change request's own worked example) | `ORD-P7-PRI-GE70-1` | WH-A=40, WH-B=35, qty 100 (75%) | ✅ `PartiallyReleased`, released 75 / backordered 25, allocations `[WH-A:40, WH-B:35]`, exactly one `Open` `M08944_Backorder` row |
| Exactly 70% | `ORD-P7-PRI-EQ70-1` | WH-A=50, WH-B=20, qty 100 (70%) | ✅ qualifies (boundary inclusive) — `PartiallyReleased`, released 70 / backordered 30 |
| <70% | `ORD-P7-PRI-LT70-1` | WH-A=40, WH-B=29, qty 100 (69%) | ✅ `Blocked`, reason `Cannot Fulfil Priority Threshold`, no allocation, no backorder, inventory left untouched (confirmed by re-querying `M08944_Inventory`) |
| 100%, split across two warehouses | `ORD-P7-PRI-FULL-1` | WH-A=60, WH-B=40, qty 100 (100%) | ✅ `Released` (not `PartiallyReleased`), backordered 0, no backorder row, allocations `[WH-A:60, WH-B:40]` |
| Dispatch-date filter applies per warehouse in the combine, not just in aggregate | `ORD-P7-PRI-DATE-1` | WH-A=60 but dispatches after `promisedDeliveryDate` (excluded), WH-B=10 eligible, qty 50 (20% of eligible-only stock) | ✅ `Blocked`, `Cannot Fulfil Priority Threshold` — confirms the Stage 1 `earliestDispatchDate <= promisedDeliveryDate` rule was actually reused, not silently dropped, for the Priority path |
| Resubmission of a completed Priority `PartiallyReleased` order, with a different `quantity: 999` | `ORD-P7-PRI-GE70-1` | (already allocated above) | ✅ original stored result returned unchanged; `SELECT` against `M08944_Allocation`/`M08944_Backorder`/`M08944_FulfilmentResult` confirmed exactly the rows from the first submission (2 allocations, 1 backorder, 1 result row) — no duplicates from the replay |

**Frontend UI** (browser-driven, against the live backend above): submitted a fresh
Priority order (`ORD-P7-UI-1`, WH-A=45/WH-B=30, qty 100 → 75%) via the Order
Submission page and confirmed the result panel showed the `PartiallyReleased` badge,
released/backordered 75/25 with backordered amber-highlighted, and
"ALLOCATIONS (2 WAREHOUSES)" listing WH-A:45/WH-B:30; then looked the same order up
on the Order Result Lookup page and confirmed it rendered identically.

No regressions found anywhere in the Standard/eligibility-gate path; every new
Priority scenario and the Priority replay case matched the change request exactly,
including the boundary case (exactly 70% qualifies) and the "never allocate more
than requested" rule (100% case releases exactly 100, not more).

Verification fixtures (`CUST-P7-*`, `PROD-P7-*`, `ORD-P7-*`) were left in the
database, isolated by prefix from all Phase 4 data — same convention as the sample
data Phase 4 left behind.

### Docs updated
- `Claude.md`: header now covers both Stage 1 and CHANGE1; architecture diagram's
  services box and MSSQL table/proc counts updated; "Order fulfilment rules"
  section split into Standard (unchanged) + a new "Priority partial fulfilment"
  subsection (rules 9-13); "Data model" lists `M08944_Config`/`M08944_Backorder`
  and the 3 new SPs; added a Phase 7 end-to-end verification table alongside the
  existing (still-accurate) Phase 4 one.
- `Frontend.md`: added a "CHANGE1 result display" section describing what was
  already generic vs. what actually changed (the toast bug, the amber
  highlight, the warehouse count label); updated "Verified" to record the Phase 7
  browser-driven Priority verification.
- No `Backend.md` exists in this repo (checked again this phase) — `Claude.md` is
  the architecture doc that covers the backend; nothing to update there beyond
  what's listed above.

### Not done / open
- No automated test suite was added — still none in this repo. All verification
  this phase was manual (API calls + browser), same as Phase 4.
- `sp_GetBackorderByOrderId` is still unused by the service (see Phase 6 note) —
  left in place for a possible future backorder-management view.

## Phase 8 — DB Delta: CHANGE2 (Fulfil an Open Backorder) (2026-09-24)
Change requirement 2: use newly available inventory to fulfil an existing Open
backorder. DB-only delta — did **not** rebuild the Phase 1-7 schema.
- `tables/08_M08944_Backorder_AddColumns.sql` ALTERs the existing
  `M08944_Backorder` table (from Phase 5) in place — never drops it or a row:
  - Adds `createdAt` (`DATETIME2`, defaulted to `SYSUTCDATETIME()`, backfilled
    for existing rows) so the oldest Open backorder per product can be found.
  - Adds `remainingQuantity` (`INT`, backfilled from `backorderedQuantity` for
    existing rows) — the current outstanding amount, which shrinks as new
    inventory is applied; kept distinct from `backorderedQuantity`, which
    stays as the amount recorded when the backorder was created.
  - Adds a `CHECK` constraint limiting `status` to `'Open'`/`'Closed'` — the
    API's third literal, `'NoOpenBackorder'`, is a response-only value for
    "no backorder row found," never persisted.
- New stored procedures: `M08944_sp_GetOldestOpenBackorderByProduct`
  (`createdAt` asc, `orderId` tie-break, joins `M08944_Order` to get from
  `productId` to the backorder's `orderId`), `M08944_sp_UpdateBackorder`
  (`remainingQuantity`/`status`), `M08944_sp_UpdateFulfilmentResult` (the
  UPDATE counterpart to `sp_SaveFulfilmentResult`, for an order's
  `releasedQuantity`/`backorderedQuantity`/`status` once a backorder is
  fulfilled).
- Also redefined `M08944_sp_CreateBackorder` (DROP+CREATE, new file
  `procedures/20_M08944_sp_CreateBackorder.sql`) to populate the two new
  columns. Not in the literal SP list for this phase, but required: once
  `remainingQuantity` is `NOT NULL` with no valid static `DEFAULT` (it must
  equal that row's own `backorderedQuantity`), every future backorder
  creation would otherwise fail.
- Verified by executing all five scripts against the live MSSQL instance
  already configured for this project: columns/constraints came out as
  expected, the 3 existing Phase 6/7 backorder rows backfilled correctly,
  the new procs run without error, and the `status` `CHECK` constraint
  correctly rejects an invalid value.
- Updated `backend/src/database/sql/README.md` with the Phase 8 run order.

## Phase 9 — Backend: POST /inventory-availability, CHANGE2 (2026-09-24)
Wired the Phase 8 DB delta into a new endpoint. Did not touch Stage 1/2 order
logic (`orders.service.ts` is unchanged) — reused the existing
`allocationRepository.createAllocation` and added new repository functions
alongside the existing ones, never modifying them.

- New files: `services/inventoryAvailability.service.ts`,
  `controllers/inventoryAvailability.controller.ts`,
  `routes/inventoryAvailability.routes.ts` (mounted at
  `POST /inventory-availability` in `routes/index.ts`), plus a
  `validateInventoryAvailabilityRequest` in `utils/validation.ts`.
- New repository functions (existing ones untouched):
  `backorderRepository.getOldestOpenBackorderByProduct`,
  `backorderRepository.updateBackorder`,
  `fulfilmentResultRepository.updateFulfilmentResult`.
- Logic in `inventoryAvailability.service.ts`:
  - No Open backorder for `productId` → still records the submitted
    inventory (see below), returns
    `{orderId:null, backorderStatus:"NoOpenBackorder", releasedQuantity:0,
    backorderedQuantity:0, allocation:null}`. The change request's "Business
    Change" paragraph separates *recording* new inventory (unconditional)
    from *applying* it to a backorder (conditional on one existing), so
    recording still happens even with no backorder to fulfil — the response
    schema has no field for it either way, since it's entirely about
    order/backorder status.
  - Otherwise: picks the oldest Open backorder (`createdAt` asc, `orderId`
    tie-break, via the Phase 8 proc), allocates
    `min(availableQuantity, remainingQuantity)` — never more than what's
    remaining — as one new `M08944_Allocation` row for the submitted
    warehouse, updates the backorder's `remainingQuantity`/`status`
    (`Closed` at 0, else `Open`), and updates the order's
    `releasedQuantity`/`backorderedQuantity`/`status` (flips
    `PartiallyReleased` → `Released` once `backorderedQuantity` hits 0).
    All in one transaction via the existing `withTransaction` helper.
  - Inventory side effect (`recordNewInventoryArrival`): increases
    `availableQuantity` by the *net* of what was submitted minus what got
    allocated — implemented as a single adjustment, reusing the existing
    Stage 1/2 decrement proc (`M08944_sp_UpdateInventoryQty`) with a
    *negative* delta, rather than two separate writes or a new proc, since
    at the SQL level "increase" and "decrement" are the same
    `availableQuantity = availableQuantity - @quantity` operation. Net
    effect matches the change request's own framing exactly: "leftover
    beyond the backorder stays as available inventory."
  - Gap-fill decision (flagged, not confirmed, same convention as Phase 2's
    FRD gaps): if no inventory row exists yet for that `productId`/
    `warehouseId` (not covered by the change request, which assumes one
    already exists), one is created with `earliestDispatchDate` defaulted to
    today, since the stock is being reported available right now.
- `tsc --noEmit` and `npm run build` both pass.
- Verified end-to-end against the live MSSQL instance, reusing the exact
  Priority order from Phase 7's own worked-example test
  (`ORD-P7-PRI-GE70-1`: ordered 100, already released 75, backordered 25 on
  `PROD-P7-GE70`, WH-A/WH-B both at 0 available):
  | Step | Request | Result |
  |---|---|---|
  | 1 | `POST /inventory-availability {productId:"PROD-P7-GE70", warehouseId:"WH-A", availableQuantity:20}` | ✅ `{orderId:"ORD-P7-PRI-GE70-1", backorderStatus:"Open", releasedQuantity:95, backorderedQuantity:5, allocation:{warehouseId:"WH-A", allocatedQuantity:20}}` — matches the change doc's own "Partial Fulfilment Response" example exactly; inventory unchanged (20 submitted, 20 allocated, net 0) |
  | 2 | `POST /inventory-availability {productId:"PROD-P7-GE70", warehouseId:"WH-A", availableQuantity:10}` | ✅ `{orderId:"ORD-P7-PRI-GE70-1", backorderStatus:"Closed", releasedQuantity:100, backorderedQuantity:0, allocation:{warehouseId:"WH-A", allocatedQuantity:5}}` — matches the change doc's "Full Fulfilment Response" example exactly; `M08944_Inventory` WH-A rose by 5 (10 submitted, only 5 allocated, "never allocate more than remaining") |
  | 3 | `GET /orders/ORD-P7-PRI-GE70-1` after both | ✅ `status:"Released"` (flipped from `PartiallyReleased`), `releasedQuantity:100`, `backorderedQuantity:0`, 4 allocation rows total (2 from Phase 7 + 2 new) |
  | 4 | `POST /inventory-availability` again for `PROD-P7-GE70` (backorder now Closed) | ✅ `NoOpenBackorder`, `orderId:null`, `allocation:null`; inventory still recorded in full (no backorder to consume it) |
  | 5 | `POST /inventory-availability` for `PROD-A` (Standard-only product, never had a backorder) | ✅ `NoOpenBackorder`; inventory recorded |
  | 6 | `POST /inventory-availability` for a brand-new `productId`/`warehouseId` with no existing row | ✅ `NoOpenBackorder`; new inventory row created with today's `earliestDispatchDate` |
  | 7 | Invalid `warehouseId` / negative `availableQuantity` | ✅ both `400` with field-level `details` |
- Did not re-run the full Phase 4/7 Stage 1/2 regression suite this phase —
  `orders.service.ts` was not touched, and Phase 7 already re-verified that
  path in depth; step 3 above (`GET /orders/:orderId` for the order this
  phase modified) is the direct regression check for this change.

### Not done / open
- Frontend: no UI for `POST /inventory-availability` — not asked for in this
  phase (Phase 9 was backend-only, mirroring Phase 6's scope).
- No automated test suite — still none in this repo.
- The gap-fill decision above (defaulting `earliestDispatchDate` to today for
  a never-before-seen inventory row) is proposed, not confirmed.
