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
