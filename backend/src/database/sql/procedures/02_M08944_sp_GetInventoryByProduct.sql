-- FRD §7. Returns all warehouse rows for a product; warehouse selection/tie-break
-- logic (FRD §3 Rules 3-4) is applied in the service layer, not here.

IF OBJECT_ID(N'dbo.M08944_sp_GetInventoryByProduct', N'P') IS NOT NULL
    DROP PROCEDURE dbo.M08944_sp_GetInventoryByProduct;
GO

CREATE PROCEDURE dbo.M08944_sp_GetInventoryByProduct
    @productId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT productId, warehouseId, availableQuantity, earliestDispatchDate
    FROM dbo.M08944_Inventory
    WHERE productId = @productId
    ORDER BY warehouseId ASC;
END
GO
