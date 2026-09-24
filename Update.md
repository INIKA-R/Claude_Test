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
