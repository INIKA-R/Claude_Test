-- FRD §2 Allocation (only for Released), FRD §7 DB naming
-- Run fifth: FK -> M08944_Order.

IF OBJECT_ID(N'dbo.M08944_Allocation', N'U') IS NOT NULL
    DROP TABLE dbo.M08944_Allocation;
GO

CREATE TABLE dbo.M08944_Allocation (
    allocationId        INT             IDENTITY(1,1) NOT NULL,
    orderId             VARCHAR(50)     NOT NULL,
    warehouseId         VARCHAR(10)     NOT NULL,
    allocatedQuantity   INT             NOT NULL,
    CONSTRAINT PK_M08944_Allocation PRIMARY KEY (allocationId),
    CONSTRAINT FK_M08944_Allocation_Order
        FOREIGN KEY (orderId) REFERENCES dbo.M08944_Order (orderId),
    CONSTRAINT CK_M08944_Allocation_WarehouseId
        CHECK (warehouseId IN ('WH-A', 'WH-B', 'WH-C')),
    CONSTRAINT CK_M08944_Allocation_AllocatedQuantity
        CHECK (allocatedQuantity > 0)
);
GO
