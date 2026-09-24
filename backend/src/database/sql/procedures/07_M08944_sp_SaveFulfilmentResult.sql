-- FRD §7. Persists the fulfilment decision (FRD §3.6-3.7). Pure data access.

IF OBJECT_ID(N'dbo.M08944_sp_SaveFulfilmentResult', N'P') IS NOT NULL
    DROP PROCEDURE dbo.M08944_sp_SaveFulfilmentResult;
GO

CREATE PROCEDURE dbo.M08944_sp_SaveFulfilmentResult
    @orderId              VARCHAR(50),
    @status               VARCHAR(20),
    @reason               VARCHAR(200) = NULL,
    @releasedQuantity     INT,
    @backorderedQuantity  INT
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.M08944_FulfilmentResult
        (orderId, status, reason, releasedQuantity, backorderedQuantity, evaluatedAt)
    VALUES
        (@orderId, @status, @reason, @releasedQuantity, @backorderedQuantity, SYSUTCDATETIME());
END
GO
