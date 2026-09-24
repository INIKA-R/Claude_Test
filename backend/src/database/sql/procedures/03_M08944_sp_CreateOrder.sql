-- FRD §7. Pure data access.

IF OBJECT_ID(N'dbo.M08944_sp_CreateOrder', N'P') IS NOT NULL
    DROP PROCEDURE dbo.M08944_sp_CreateOrder;
GO

CREATE PROCEDURE dbo.M08944_sp_CreateOrder
    @orderId               VARCHAR(50),
    @customerId            VARCHAR(50),
    @customerType          VARCHAR(20),
    @productId             VARCHAR(50),
    @quantity              INT,
    @promisedDeliveryDate  DATE
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.M08944_Order
        (orderId, customerId, customerType, productId, quantity, promisedDeliveryDate)
    VALUES
        (@orderId, @customerId, @customerType, @productId, @quantity, @promisedDeliveryDate);
END
GO
