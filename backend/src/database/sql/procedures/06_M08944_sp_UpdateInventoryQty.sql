-- FRD §7. Decrements available quantity for the selected warehouse (FRD §3.6).
-- Concurrency handling beyond the row-level UPDATE lock is an open item (FRD §10).

IF OBJECT_ID(N'dbo.M08944_sp_UpdateInventoryQty', N'P') IS NOT NULL
    DROP PROCEDURE dbo.M08944_sp_UpdateInventoryQty;
GO

CREATE PROCEDURE dbo.M08944_sp_UpdateInventoryQty
    @productId      VARCHAR(50),
    @warehouseId    VARCHAR(10),
    @quantity       INT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.M08944_Inventory
    SET availableQuantity = availableQuantity - @quantity
    WHERE productId = @productId
      AND warehouseId = @warehouseId;
END
GO
