-- Phase 2: Customer CRUD (not in FRD §7's indicative list, added for the CRUD API).

IF OBJECT_ID(N'dbo.M08944_sp_GetAllCustomers', N'P') IS NOT NULL
    DROP PROCEDURE dbo.M08944_sp_GetAllCustomers;
GO

CREATE PROCEDURE dbo.M08944_sp_GetAllCustomers
AS
BEGIN
    SET NOCOUNT ON;

    SELECT customerId, eligibilityStatus
    FROM dbo.M08944_Customer
    ORDER BY customerId ASC;
END
GO
