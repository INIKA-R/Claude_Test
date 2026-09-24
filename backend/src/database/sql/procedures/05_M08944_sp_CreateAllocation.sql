-- FRD §7. Pure data access — only called for Released orders (FRD §3.6).

IF OBJECT_ID(N'dbo.M08944_sp_CreateAllocation', N'P') IS NOT NULL
    DROP PROCEDURE dbo.M08944_sp_CreateAllocation;
GO

CREATE PROCEDURE dbo.M08944_sp_CreateAllocation
    @orderId            VARCHAR(50),
    @warehouseId        VARCHAR(10),
    @allocatedQuantity  INT
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.M08944_Allocation (orderId, warehouseId, allocatedQuantity)
    VALUES (@orderId, @warehouseId, @allocatedQuantity);
END
GO
