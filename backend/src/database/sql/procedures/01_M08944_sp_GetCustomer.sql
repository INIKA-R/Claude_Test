-- FRD §7. Pure data access — no business rules (eligibility gating lives in the service layer).

IF OBJECT_ID(N'dbo.M08944_sp_GetCustomer', N'P') IS NOT NULL
    DROP PROCEDURE dbo.M08944_sp_GetCustomer;
GO

CREATE PROCEDURE dbo.M08944_sp_GetCustomer
    @customerId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT customerId, eligibilityStatus
    FROM dbo.M08944_Customer
    WHERE customerId = @customerId;
END
GO
