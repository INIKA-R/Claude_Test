-- Phase 5 delta. Pure data access — only called for PartiallyReleased
-- Priority orders (Business Change: partial fulfilment).

IF OBJECT_ID(N'dbo.M08944_sp_CreateBackorder', N'P') IS NOT NULL
    DROP PROCEDURE dbo.M08944_sp_CreateBackorder;
GO

CREATE PROCEDURE dbo.M08944_sp_CreateBackorder
    @orderId              VARCHAR(50),
    @backorderedQuantity  INT
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.M08944_Backorder (orderId, backorderedQuantity, status)
    VALUES (@orderId, @backorderedQuantity, 'Open');
END
GO
