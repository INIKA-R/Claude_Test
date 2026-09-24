-- Phase 8 delta (CHANGE2). Updates the order-level Released/Backordered
-- Quantity (and status, so a backorder that's fully applied flips the
-- order from PartiallyReleased to Released) on an existing
-- M08944_FulfilmentResult row. Counterpart to M08944_sp_SaveFulfilmentResult
-- (INSERT, used at order-creation time) — this one is UPDATE-only and
-- assumes the row already exists (every order that can have an Open
-- backorder already has one, from order creation).

IF OBJECT_ID(N'dbo.M08944_sp_UpdateFulfilmentResult', N'P') IS NOT NULL
    DROP PROCEDURE dbo.M08944_sp_UpdateFulfilmentResult;
GO

CREATE PROCEDURE dbo.M08944_sp_UpdateFulfilmentResult
    @orderId              VARCHAR(50),
    @status               VARCHAR(20),
    @releasedQuantity     INT,
    @backorderedQuantity  INT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.M08944_FulfilmentResult
    SET status = @status,
        releasedQuantity = @releasedQuantity,
        backorderedQuantity = @backorderedQuantity
    WHERE orderId = @orderId;
END
GO
