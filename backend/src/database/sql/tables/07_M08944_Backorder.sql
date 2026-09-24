-- Phase 5 delta. Holds the unfulfilled balance when a Priority order is
-- PartiallyReleased. At most one backorder per order (mirrors the 1:1
-- M08944_FulfilmentResult pattern, not the 1:many M08944_Allocation one).
-- Run seventh: FK -> M08944_Order.

IF OBJECT_ID(N'dbo.M08944_Backorder', N'U') IS NOT NULL
    DROP TABLE dbo.M08944_Backorder;
GO

CREATE TABLE dbo.M08944_Backorder (
    orderId              VARCHAR(50)     NOT NULL,
    backorderedQuantity  INT             NOT NULL,
    status               VARCHAR(20)     NOT NULL DEFAULT 'Open',
    CONSTRAINT PK_M08944_Backorder PRIMARY KEY (orderId),
    CONSTRAINT FK_M08944_Backorder_Order
        FOREIGN KEY (orderId) REFERENCES dbo.M08944_Order (orderId),
    CONSTRAINT CK_M08944_Backorder_BackorderedQuantity
        CHECK (backorderedQuantity > 0)
);
GO
