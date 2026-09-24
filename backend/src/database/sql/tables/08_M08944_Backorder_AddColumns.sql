-- Phase 8 delta (CHANGE2: fulfil an Open backorder from newly available
-- inventory). Adds createdAt (needed to find the *oldest* Open backorder
-- per product) and remainingQuantity (the current outstanding amount, which
-- shrinks as new inventory is applied — distinct from backorderedQuantity,
-- which stays as the amount recorded when the backorder was created) to the
-- existing M08944_Backorder table from CHANGE1 (Phase 5). Also constrains
-- status to the two values the DB actually stores: 'Open'/'Closed' — the
-- API's third literal, 'NoOpenBackorder', is a response-only value meaning
-- "no backorder row found", never persisted.
--
-- Do NOT rebuild the table. This script only ALTERs the existing
-- M08944_Backorder table and backfills its existing rows; it never drops
-- the table or any row. Idempotent — safe to re-run.
-- Run after 07_M08944_Backorder.sql, before the Phase 8 stored procedures.

IF COL_LENGTH('dbo.M08944_Backorder', 'createdAt') IS NULL
BEGIN
    ALTER TABLE dbo.M08944_Backorder
        ADD createdAt DATETIME2 NOT NULL
            CONSTRAINT DF_M08944_Backorder_CreatedAt DEFAULT SYSUTCDATETIME();
END
GO

IF COL_LENGTH('dbo.M08944_Backorder', 'remainingQuantity') IS NULL
BEGIN
    ALTER TABLE dbo.M08944_Backorder ADD remainingQuantity INT NULL;
END
GO

-- Backfill existing rows (created before this column existed) so
-- remainingQuantity starts equal to the originally recorded backorder
-- amount, same as a brand-new backorder's initial state.
UPDATE dbo.M08944_Backorder
SET remainingQuantity = backorderedQuantity
WHERE remainingQuantity IS NULL;
GO

IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.M08944_Backorder')
      AND name = 'remainingQuantity'
      AND is_nullable = 1
)
BEGIN
    ALTER TABLE dbo.M08944_Backorder ALTER COLUMN remainingQuantity INT NOT NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints WHERE name = 'CK_M08944_Backorder_RemainingQuantity'
)
BEGIN
    ALTER TABLE dbo.M08944_Backorder
        ADD CONSTRAINT CK_M08944_Backorder_RemainingQuantity CHECK (remainingQuantity >= 0);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints WHERE name = 'CK_M08944_Backorder_Status'
)
BEGIN
    ALTER TABLE dbo.M08944_Backorder
        ADD CONSTRAINT CK_M08944_Backorder_Status CHECK (status IN ('Open', 'Closed'));
END
GO
