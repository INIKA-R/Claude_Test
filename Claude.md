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
    controllers/           Parse request, call service, shape response
    services/              Business rules (FRD §3) — implemented in a later phase
    middleware/             Cross-cutting concerns (error handling, etc.)
    utils/                 Small shared helpers (e.g. asyncHandler)
    database/
      db.ts                MSSQL connection pool
      sql/
        tables/            CREATE TABLE scripts, FK-dependency ordered
        procedures/        Stored procedure scripts (data access only)
    types/                 Shared TS types (mirrors frontend/src/types)
    server.ts              App bootstrap (Express instance, middleware, listen)
```

## Backend flow (FRD §6)
`Route -> Controller -> Service -> DB layer (mssql pool) -> Stored Procedure -> MSSQL`

Stored procedures are pure data access (CRUD only). Business rules — eligibility
gating, single-warehouse selection, tie-break priority, idempotent replay — belong
in the service layer, not in SQL. This keeps the rules testable in TypeScript and
keeps the procs reusable/simple.

## Data model (FRD §2, §7)
Tables (prefix `M08944`, FK-dependency order):
1. `M08944_Customer` — customerId (PK), eligibilityStatus
2. `M08944_Inventory` — productId + warehouseId (composite PK), availableQuantity, earliestDispatchDate
3. `M08944_Order` — orderId (PK), FK -> Customer, customerType, productId, quantity, promisedDeliveryDate
4. `M08944_FulfilmentResult` — orderId (PK, FK -> Order), status, reason, releasedQuantity, backorderedQuantity, evaluatedAt
5. `M08944_Allocation` — allocationId (surrogate PK), FK -> Order, warehouseId, allocatedQuantity

Stored procedures (all under `database/sql/procedures/`, all pure CRUD):
`M08944_sp_GetCustomer`, `M08944_sp_GetInventoryByProduct`, `M08944_sp_CreateOrder`,
`M08944_sp_GetFulfilmentResult`, `M08944_sp_CreateAllocation`,
`M08944_sp_UpdateInventoryQty`, `M08944_sp_SaveFulfilmentResult`.

See `backend/src/database/sql/README.md` for the exact SSMS execution order.

## Deviations / notes vs. FRD
- `M08944_Inventory.availableQuantity` uses `CHECK (>= 0)` rather than `> 0`: a row
  legitimately reaches 0 after an allocation decrements it (FRD §3.6). The `> 0`
  constraint in FRD §2 describes valid *input* rows, not the post-decrement state.
- Open items from FRD §10 (exact "not available" reason strings, `PartiallyReleased`
  trigger, inventory-decrement concurrency strategy) are not yet resolved and must be
  confirmed before the service layer (business rules) is implemented.

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
