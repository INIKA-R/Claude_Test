-- Phase 2: Inventory CRUD.

IF OBJECT_ID(N'dbo.M08944_sp_CreateInventory', N'P') IS NOT NULL
    DROP PROCEDURE dbo.M08944_sp_CreateInventory;
GO

CREATE PROCEDURE dbo.M08944_sp_CreateInventory
    @productId              VARCHAR(50),
    @warehouseId            VARCHAR(10),
    @availableQuantity      INT,
    @earliestDispatchDate   DATE
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.M08944_Inventory
        (productId, warehouseId, availableQuantity, earliestDispatchDate)
    VALUES
        (@productId, @warehouseId, @availableQuantity, @earliestDispatchDate);
END
GO
