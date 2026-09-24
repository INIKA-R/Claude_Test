-- Phase 2: Inventory CRUD.

IF OBJECT_ID(N'dbo.M08944_sp_DeleteInventory', N'P') IS NOT NULL
    DROP PROCEDURE dbo.M08944_sp_DeleteInventory;
GO

CREATE PROCEDURE dbo.M08944_sp_DeleteInventory
    @productId      VARCHAR(50),
    @warehouseId    VARCHAR(10)
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM dbo.M08944_Inventory
    WHERE productId = @productId
      AND warehouseId = @warehouseId;
END
GO
