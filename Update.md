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
