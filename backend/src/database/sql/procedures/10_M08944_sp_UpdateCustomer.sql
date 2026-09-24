-- Phase 2: Customer CRUD.

IF OBJECT_ID(N'dbo.M08944_sp_UpdateCustomer', N'P') IS NOT NULL
    DROP PROCEDURE dbo.M08944_sp_UpdateCustomer;
GO

CREATE PROCEDURE dbo.M08944_sp_UpdateCustomer
    @customerId         VARCHAR(50),
    @eligibilityStatus  VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.M08944_Customer
    SET eligibilityStatus = @eligibilityStatus
    WHERE customerId = @customerId;
END
GO
