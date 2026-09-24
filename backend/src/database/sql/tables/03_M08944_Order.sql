-- FRD §2 Order, FRD §7 DB naming
-- Run third: FK -> M08944_Customer.

IF OBJECT_ID(N'dbo.M08944_Order', N'U') IS NOT NULL
    DROP TABLE dbo.M08944_Order;
GO

CREATE TABLE dbo.M08944_Order (
    orderId                 VARCHAR(50)     NOT NULL,
    customerId              VARCHAR(50)     NOT NULL,
    customerType            VARCHAR(20)     NOT NULL,
    productId               VARCHAR(50)     NOT NULL,
    quantity                INT             NOT NULL,
    promisedDeliveryDate    DATE            NOT NULL,
    CONSTRAINT PK_M08944_Order PRIMARY KEY (orderId),
    CONSTRAINT FK_M08944_Order_Customer
        FOREIGN KEY (customerId) REFERENCES dbo.M08944_Customer (customerId),
    CONSTRAINT CK_M08944_Order_CustomerType
        CHECK (customerType IN ('Standard', 'Priority')),
    CONSTRAINT CK_M08944_Order_Quantity
        CHECK (quantity > 0)
);
GO
