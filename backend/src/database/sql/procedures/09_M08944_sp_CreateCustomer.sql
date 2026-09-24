-- Phase 2: Customer CRUD.

IF OBJECT_ID(N'dbo.M08944_sp_CreateCustomer', N'P') IS NOT NULL
    DROP PROCEDURE dbo.M08944_sp_CreateCustomer;
GO

CREATE PROCEDURE dbo.M08944_sp_CreateCustomer
    @customerId         VARCHAR(50),
    @eligibilityStatus  VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.M08944_Customer (customerId, eligibilityStatus)
    VALUES (@customerId, @eligibilityStatus);
END
GO
