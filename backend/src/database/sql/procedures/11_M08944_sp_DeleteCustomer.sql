-- Phase 2: Customer CRUD.

IF OBJECT_ID(N'dbo.M08944_sp_DeleteCustomer', N'P') IS NOT NULL
    DROP PROCEDURE dbo.M08944_sp_DeleteCustomer;
GO

CREATE PROCEDURE dbo.M08944_sp_DeleteCustomer
    @customerId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM dbo.M08944_Customer
    WHERE customerId = @customerId;
END
GO
