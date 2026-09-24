-- FRD §7. Returns the fulfilment result row (result set 1) and its allocations,
-- if any (result set 2). Used by GET /orders/:orderId and idempotent replay (FRD §3.8).

IF OBJECT_ID(N'dbo.M08944_sp_GetFulfilmentResult', N'P') IS NOT NULL
    DROP PROCEDURE dbo.M08944_sp_GetFulfilmentResult;
GO

CREATE PROCEDURE dbo.M08944_sp_GetFulfilmentResult
    @orderId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT orderId, status, reason, releasedQuantity, backorderedQuantity, evaluatedAt
    FROM dbo.M08944_FulfilmentResult
    WHERE orderId = @orderId;

    SELECT orderId, warehouseId, allocatedQuantity
    FROM dbo.M08944_Allocation
    WHERE orderId = @orderId;
END
GO
