-- Phase 2: Inventory CRUD — full replace of availableQuantity/earliestDispatchDate.
-- Distinct from M08944_sp_UpdateInventoryQty, which only decrements quantity during
-- order fulfilment (FRD §3 Rule 6).

IF OBJECT_ID(N'dbo.M08944_sp_UpdateInventory', N'P') IS NOT NULL
    DROP PROCEDURE dbo.M08944_sp_UpdateInventory;
GO

CREATE PROCEDURE dbo.M08944_sp_UpdateInventory
    @productId              VARCHAR(50),
    @warehouseId            VARCHAR(10),
    @availableQuantity      INT,
    @earliestDispatchDate   DATE
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.M08944_Inventory
    SET availableQuantity = @availableQuantity,
        earliestDispatchDate = @earliestDispatchDate
    WHERE productId = @productId
      AND warehouseId = @warehouseId;
END
GO
