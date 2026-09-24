-- Phase 8 delta (CHANGE2). Pure data access — applies the new
-- remainingQuantity/status decided by the service layer after allocating
-- newly available inventory against this backorder (never more than its
-- remaining amount; remainingQuantity = 0 always pairs with status =
-- 'Closed', kept as two separate params rather than derived here since the
-- business rule belongs in the service layer, not in SQL).

IF OBJECT_ID(N'dbo.M08944_sp_UpdateBackorder', N'P') IS NOT NULL
    DROP PROCEDURE dbo.M08944_sp_UpdateBackorder;
GO

CREATE PROCEDURE dbo.M08944_sp_UpdateBackorder
    @orderId            VARCHAR(50),
    @remainingQuantity  INT,
    @status             VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.M08944_Backorder
    SET remainingQuantity = @remainingQuantity,
        status = @status
    WHERE orderId = @orderId;
END
GO
