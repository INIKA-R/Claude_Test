-- Phase 5 delta. Returns the backorder row for an order, if any. Used by
-- GET /orders/:orderId and idempotent replay to reassemble a persisted
-- PartiallyReleased result without reprocessing.

IF OBJECT_ID(N'dbo.M08944_sp_GetBackorderByOrderId', N'P') IS NOT NULL
    DROP PROCEDURE dbo.M08944_sp_GetBackorderByOrderId;
GO

CREATE PROCEDURE dbo.M08944_sp_GetBackorderByOrderId
    @orderId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT orderId, backorderedQuantity, status
    FROM dbo.M08944_Backorder
    WHERE orderId = @orderId;
END
GO
