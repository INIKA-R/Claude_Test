-- Phase 8 delta (CHANGE2). Finds the single oldest Open backorder for a
-- product, so one inventory-availability submission processes exactly one
-- backorder (the change request's own rule): oldest createdAt first,
-- orderId as the tie-break when createdAt is equal. Joins M08944_Order to
-- get from productId (what the caller has) to the backorder's orderId,
-- since M08944_Backorder itself doesn't carry productId.

IF OBJECT_ID(N'dbo.M08944_sp_GetOldestOpenBackorderByProduct', N'P') IS NOT NULL
    DROP PROCEDURE dbo.M08944_sp_GetOldestOpenBackorderByProduct;
GO

CREATE PROCEDURE dbo.M08944_sp_GetOldestOpenBackorderByProduct
    @productId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP (1)
        b.orderId, b.backorderedQuantity, b.remainingQuantity, b.status, b.createdAt
    FROM dbo.M08944_Backorder b
    INNER JOIN dbo.M08944_Order o ON o.orderId = b.orderId
    WHERE o.productId = @productId
      AND b.status = 'Open'
    ORDER BY b.createdAt ASC, b.orderId ASC;
END
GO
