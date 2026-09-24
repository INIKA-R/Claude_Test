-- Phase 2: Inventory CRUD — list all rows.

IF OBJECT_ID(N'dbo.M08944_sp_GetAllInventory', N'P') IS NOT NULL
    DROP PROCEDURE dbo.M08944_sp_GetAllInventory;
GO

CREATE PROCEDURE dbo.M08944_sp_GetAllInventory
AS
BEGIN
    SET NOCOUNT ON;

    SELECT productId, warehouseId, availableQuantity, earliestDispatchDate
    FROM dbo.M08944_Inventory
    ORDER BY productId ASC, warehouseId ASC;
END
GO
