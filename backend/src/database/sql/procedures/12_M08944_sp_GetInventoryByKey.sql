-- Phase 2: Inventory CRUD — get a single row by its composite key.

IF OBJECT_ID(N'dbo.M08944_sp_GetInventoryByKey', N'P') IS NOT NULL
    DROP PROCEDURE dbo.M08944_sp_GetInventoryByKey;
GO

CREATE PROCEDURE dbo.M08944_sp_GetInventoryByKey
    @productId      VARCHAR(50),
    @warehouseId    VARCHAR(10)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT productId, warehouseId, availableQuantity, earliestDispatchDate
    FROM dbo.M08944_Inventory
    WHERE productId = @productId
      AND warehouseId = @warehouseId;
END
GO
