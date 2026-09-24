# Claude.md — Architecture

Order Fulfilment Application (Stage 1). Source of truth for business rules is `TEST_FRD.md`; this file tracks how the codebase implements it.

## Stack
- Frontend: React + TypeScript + Vite + Tailwind CSS
- Backend: Node.js + Express + TypeScript
- Database: MSSQL, accessed exclusively via stored procedures (no inline SQL from app code)
- API style: REST, JSON

## Repository layout
```
/frontend                  React app (own package.json, own node_modules)
  src/
    pages/                 Route-level views
    components/            App-specific components
    reusablecomponents/    Generic/shared UI components
    services/              API clients (axios instance, endpoint wrappers)
    hooks/                 Custom React hooks
    types/                 Shared TS types (mirrors backend/src/types)

/backend                   Express app (own package.json, own node_modules)
  src/
    routes/                Express routers — map HTTP verb+path to controller
    controllers/           Parse/validate request, call service, shape response
    services/              Business rules (FRD §3) + CRUD orchestration
    middleware/             Cross-cutting concerns (error handling, etc.)
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
1. Idempotent replay: if a `FulfilmentResult` already exists for `orderId`, return it as-is (200), no reprocessing.
2. Eligibility gate: `CreditHold` → `Blocked-CreditHold`; `Unknown` → `Eligibility Unknown`; customer not found → `400`.
3. No inventory row for the product anywhere → `Blocked`, reason `Product Not Available`.
4. Single-warehouse match only: a warehouse qualifies if `availableQuantity >= quantity` and `earliestDispatchDate <= promisedDeliveryDate`.
5. No qualifying warehouse → `Blocked`, reason `Cannot Fulfil From Single Warehouse`.
6. Multiple qualify → fixed tie-break `WH-A > WH-B > WH-C`, always, even on identical stock/date.
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

## Environment
Each app has its own `.env` / `.env.example` (gitignored). See
`backend/.env.example` and `frontend/.env.example` for required variables.

## Running locally
```
cd backend && npm install && npm run dev     # http://localhost:5000
cd frontend && npm install && npm run dev    # http://localhost:5173
```
Run the SQL scripts in `backend/src/database/sql/` against MSSQL before starting the backend.

## Docs maintained in this repo
- `Claude.md` — this file (architecture)
- `Update.md` — phase-by-phase change log
- `Frontend.md` / `Backend.md` — introduced once there is frontend/backend logic to document
