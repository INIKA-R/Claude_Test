-- Phase 8 delta (CHANGE2). Redefines the Phase 5 M08944_sp_CreateBackorder
-- (same proc name — DROP+CREATE, this file's version wins once run) so new
-- backorders also populate the columns Phase 8 added: createdAt (needed to
-- find the *oldest* Open backorder per product) and remainingQuantity
-- (starts equal to the amount backordered; a NOT NULL column with no valid
-- static DEFAULT, since it must equal this row's own backorderedQuantity —
-- the proc has to set it explicitly, so this redefinition is required, not
-- optional, for the Phase 8 columns to work at all).

IF OBJECT_ID(N'dbo.M08944_sp_CreateBackorder', N'P') IS NOT NULL
    DROP PROCEDURE dbo.M08944_sp_CreateBackorder;
GO

CREATE PROCEDURE dbo.M08944_sp_CreateBackorder
    @orderId              VARCHAR(50),
    @backorderedQuantity  INT
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.M08944_Backorder
        (orderId, backorderedQuantity, status, createdAt, remainingQuantity)
    VALUES
        (@orderId, @backorderedQuantity, 'Open', SYSUTCDATETIME(), @backorderedQuantity);
END
GO
