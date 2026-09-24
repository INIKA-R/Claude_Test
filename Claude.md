# Claude.md — Architecture

Order Fulfilment Application (Stage 1) — **feature-complete and verified end-to-end
against a real MSSQL instance as of Phase 4**. Source of truth for business rules is
`TEST_FRD.md`; this file is the up-to-date architecture reference for the codebase
that implements it.

## Stack
- Frontend: React + TypeScript + Vite + Tailwind CSS
- Backend: Node.js + Express + TypeScript
- Database: MSSQL, accessed exclusively via stored procedures (no inline SQL from app code)
- API style: REST, JSON

## Architecture diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Browser                                                                  │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  React app (Vite dev server :5173 / static build)                  │  │
│  │                                                                      │  │
│  │   pages/                    reusablecomponents/    components/       │  │
│  │   ├─ CustomerMaintenance    Button, Card,          Navbar, Layout    │  │
│  │   ├─ InventoryMaintenance   TextField, SelectField (routing, toast   │  │
│  │   ├─ OrderSubmission        Badge, LoadingState,    container, page  │  │
│  │   └─ OrderResultLookup      EmptyState, ErrorState  transitions)     │  │
│  │        │                          ▲                                  │  │
│  │        ▼                          │ props/render                    │  │
│  │   hooks/useAsyncData.ts ──────────┘                                  │  │
│  │        │                                                             │  │
│  │        ▼                                                             │  │
│  │   services/  (ONLY place that touches HTTP)                         │  │
│  │   ├─ apiClient.ts   axios instance + getErrorMessage()               │  │
│  │   ├─ customersApi.ts / inventoryApi.ts / ordersApi.ts                │  │
│  └────────┼───────────────────────────────────────────────────────────┘  │
└───────────┼────────────────────────────────────────────────────────────-─┘
            │  REST/JSON over HTTP (CORS: CORS_ORIGIN)
            ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Express app (:5000)                                                      │
│                                                                            │
│   routes/            controllers/            services/                   │
│   orders.routes.ts    orders.controller.ts    orders.service.ts          │
│   customers.routes.ts customers.controller.ts customers.service.ts       │  business
│   inventory.routes.ts inventory.controller.ts inventory.service.ts       │  rules
│        │                    │                       │                    │  live here
│        ▼                    ▼                       ▼                    │
│   validate request     shape response         FRD §3/§4 logic:           │
│   (utils/validation)   (ApiError → 400/       eligibility gate,          │
│                         404/409 via            single-warehouse match,   │
│                         errorHandler)          WH-A>WH-B>WH-C tie-break,  │
│                                                 idempotent replay         │
│                                     │                                    │
│                                     ▼                                    │
│   database/*.repository.ts  (DB layer — one file per entity;             │
│                               each function = exactly one stored proc    │
│                               call, no raw SQL above this layer)         │
│        │                                                                 │
│        ▼                                                                 │
│   database/db.ts   getPool() / withTransaction()                        │
│   (multi-step persists — order + result + allocation + inventory        │
│    decrement — run inside one MSSQL transaction; config is read          │
│    lazily so it always reflects the current environment)                 │
└───────────┼────────────────────────────────────────────────────────────-┘
            │  tedious (mssql driver), SQL auth
            ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  MSSQL Server                                                             │
│   Tables (FK-ordered): M08944_Customer → M08944_Inventory →              │
│   M08944_Order → M08944_FulfilmentResult → M08944_Allocation             │
│   Stored procs: 16 procs, one per DB operation (see Data model below)    │
└────────────────────────────────────────────────────────────────────────-─┘
```

## Repository layout
```
/frontend                  React app (own package.json, own node_modules)
  src/
    pages/                 Route-level views
    components/            App-specific components (Navbar, Layout)
    reusablecomponents/    Generic/shared UI components
    services/              API clients (axios instance, endpoint wrappers) — the
                           ONLY place components/pages are allowed to call HTTP
    hooks/                 Custom React hooks (useAsyncData)
    types/                 Shared TS types (mirrors backend/src/types)

/backend                   Express app (own package.json, own node_modules)
  src/
    routes/                Express routers — map HTTP verb+path to controller
    controllers/           Parse/validate request, call service, shape response
    services/              Business rules (FRD §3) + CRUD orchestration
    middleware/            Cross-cutting concerns (error handling, etc.)
    utils/                 Shared helpers: asyncHandler, ApiError, request validation
    database/
      db.ts                MSSQL connection pool + withTransaction/getRequest helpers
      *.repository.ts      DB layer — one file per entity, each function executes
                           exactly one stored proc (no raw SQL above this layer)
      sql/
        tables/            CREATE TABLE scripts, FK-dependency ordered
        procedures/        Stored procedure scripts (data access only)
    types/                 Shared TS types (mirrors frontend/src/types)
    server.ts              App bootstrap (Express instance, middleware, listen)
```

## Backend flow (FRD §6)
`Route -> Controller -> Service -> DB layer (*.repository.ts) -> Stored Procedure -> MSSQL`

Stored procedures are pure data access (CRUD only). Business rules — eligibility
gating, single-warehouse selection, tie-break priority, idempotent replay — belong
in the service layer, not in SQL. This keeps the rules testable in TypeScript and
keeps the procs reusable/simple. Multi-step persists (order + fulfilment result +
allocation + inventory decrement) run inside one MSSQL transaction via
`database/db.ts`'s `withTransaction` helper, so a failure partway through rolls
back the whole order-creation attempt.

## API

### Orders (FRD §5) — business rules apply, see below
- `POST /orders` — create + evaluate fulfilment (Released/Blocked). Idempotent by `orderId`.
- `GET /orders/:orderId` — fetch the persisted fulfilment result; `404` if none exists.

### Customers / Inventory — master-data CRUD (not in FRD §5; designed from FRD §2)
- `GET /customers`, `POST /customers`
- `GET /customers/:customerId`, `PUT /customers/:customerId`, `DELETE /customers/:customerId`
- `GET /inventory`, `POST /inventory`
- `GET /inventory/:productId/:warehouseId`, `PUT .../:warehouseId`, `DELETE .../:warehouseId`

## Order fulfilment rules (FRD §3, §4) — `services/orders.service.ts`
1. Idempotent replay: if a `FulfilmentResult` already exists for `orderId`, return it as-is (200), no reprocessing — verified for both Released and Blocked orders (Phase 4).
2. Eligibility gate: `CreditHold` → `Blocked-CreditHold`; `Unknown` → `Eligibility Unknown`; customer not found → `400`.
3. No inventory row for the product anywhere → `Blocked`, reason `Product Not Available`.
4. Single-warehouse match only: a warehouse qualifies if `availableQuantity >= quantity` and `earliestDispatchDate <= promisedDeliveryDate`.
5. No qualifying warehouse → `Blocked`, reason `Cannot Fulfil From Single Warehouse`.
6. Multiple qualify → fixed tie-break `WH-A > WH-B > WH-C`, always, even on identical stock/date — verified with two identically-stocked warehouses (Phase 4).
7. Released → persist order + result + allocation, decrement the chosen warehouse's `availableQuantity`, all in one transaction.
8. Blocked → persist order + result only; no allocation, no inventory change.

## Data model (FRD §2, §7)
Tables (prefix `M08944`, FK-dependency order):
1. `M08944_Customer` — customerId (PK), eligibilityStatus
2. `M08944_Inventory` — productId + warehouseId (composite PK), availableQuantity, earliestDispatchDate
3. `M08944_Order` — orderId (PK), FK -> Customer, customerType, productId, quantity, promisedDeliveryDate
4. `M08944_FulfilmentResult` — orderId (PK, FK -> Order), status, reason, releasedQuantity, backorderedQuantity, evaluatedAt
5. `M08944_Allocation` — allocationId (surrogate PK), FK -> Order, warehouseId, allocatedQuantity

Stored procedures (all under `database/sql/procedures/`, all pure CRUD):
- Order fulfilment (FRD §7): `M08944_sp_GetCustomer`, `M08944_sp_GetInventoryByProduct`,
  `M08944_sp_CreateOrder`, `M08944_sp_GetFulfilmentResult`, `M08944_sp_CreateAllocation`,
  `M08944_sp_UpdateInventoryQty`, `M08944_sp_SaveFulfilmentResult`.
- Customer/Inventory CRUD (added Phase 2, beyond FRD §7's indicative list):
  `M08944_sp_GetAllCustomers`, `M08944_sp_CreateCustomer`, `M08944_sp_UpdateCustomer`,
  `M08944_sp_DeleteCustomer`, `M08944_sp_GetInventoryByKey`, `M08944_sp_GetAllInventory`,
  `M08944_sp_CreateInventory`, `M08944_sp_UpdateInventory`, `M08944_sp_DeleteInventory`.

See `backend/src/database/sql/README.md` for the exact SSMS execution order.

## Deviations / notes vs. FRD
- `M08944_Inventory.availableQuantity` uses `CHECK (>= 0)` rather than `> 0`: a row
  legitimately reaches 0 after an allocation decrements it (FRD §3.6). The `> 0`
  constraint in FRD §2 describes valid *input* rows, not the post-decrement state.
  Confirmed with the project owner in Phase 2.
- FRD §10 open items resolved pragmatically for Phase 2 (still flagged, not
  formally signed off): the proposed reason strings in §4 are used as-is;
  a `customerId` that doesn't exist in `M08944_Customer` yields `400 Customer not
  found` (not covered by §3's eligibility gate, which assumes the customer exists);
  idempotent replay (§5) responds `200`, not `409`; inventory-decrement concurrency
  relies only on the transaction's row lock, no retry/optimistic-concurrency logic.
  See `Update.md` Phase 2 entry for detail.

## Bug found and fixed in Phase 4
`backend/src/database/db.ts` built its MSSQL connection config as a **module-level
constant**, read from `process.env` at import time. `server.ts` imports `routes`
(which transitively imports `db.ts`) *before* it calls `dotenv.config()`, so the
connection config was always frozen at its hardcoded fallback values
(`localhost:1433`, no credentials) regardless of what `.env` actually contained.
This was invisible in Phases 1-3 because there was no live database to expose it —
every DB call failed the same way (connection refused) whether `.env` was right or
wrong. It surfaced immediately in Phase 4 once pointed at a real SQL Server.
**Fix:** `db.ts` now builds the config lazily inside `getPool()` (via `getDbConfig()`),
so it always reflects the environment at connection time; `server.ts` also now calls
`dotenv.config()` as its first statement, before any other import, as defense in depth.

## End-to-end verification (Phase 4)
Ran the frontend and backend together against a real MSSQL database (tables +
stored procedures applied via SSMS) and exercised every FRD §5 flow, both via direct
API calls and by driving the actual UI:

| Scenario | Result |
|---|---|
| Released (single qualifying warehouse) | ✅ correct allocation, inventory decremented |
| Released with two qualifying warehouses (tie-break) | ✅ WH-A chosen over WH-B despite identical stock/date |
| Blocked — `Blocked-CreditHold` | ✅ (verified via API and the Order Submission UI) |
| Blocked — `Eligibility Unknown` | ✅ |
| Blocked — `Product Not Available` (no inventory row at all) | ✅ |
| Blocked — `Cannot Fulfil From Single Warehouse` (insufficient qty) | ✅ |
| Duplicate `orderId` replay — Released order, resubmitted with different data | ✅ stored result returned unchanged, inventory not double-decremented |
| Duplicate `orderId` replay — Blocked order | ✅ stored result returned unchanged |
| `GET /orders/:orderId` for an existing order | ✅ matches persisted result |
| `GET /orders/:orderId` for a non-existent order | ✅ `404 {orderId, error:"Order not Found"}` (verified via API and the Order Lookup UI) |
| `customerId` referencing a non-existent customer | ✅ `400 Customer not found` |
| Customer/Inventory CRUD (create, list) | ✅ used to seed the above scenarios |

No other errors found. The only defect was the dotenv/config-timing bug above.

## Environment
Each app has its own `.env` / `.env.example` (gitignored). See
`backend/.env.example` and `frontend/.env.example` for required variables. The
backend currently supports **SQL Server Authentication only** (`DB_USER`/
`DB_PASSWORD`); Windows Authentication would require swapping the `mssql` driver
to `msnodesqlv8`, which is not set up.

## Running locally
```
cd backend && npm install && npm run dev     # http://localhost:5000
cd frontend && npm install && npm run dev    # http://localhost:5173
```
Run the SQL scripts in `backend/src/database/sql/` against MSSQL before starting the backend.

## Docs maintained in this repo
- `Claude.md` — this file (architecture, kept current every phase)
- `Update.md` — phase-by-phase change log
- `Frontend.md` — frontend structure/conventions reference
