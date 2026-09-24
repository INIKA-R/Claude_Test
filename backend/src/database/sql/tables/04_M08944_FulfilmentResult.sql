-- FRD §2 FulfilmentResult (derived, persisted), FRD §7 DB naming
-- Run fourth: FK -> M08944_Order.

IF OBJECT_ID(N'dbo.M08944_FulfilmentResult', N'U') IS NOT NULL
    DROP TABLE dbo.M08944_FulfilmentResult;
GO

CREATE TABLE dbo.M08944_FulfilmentResult (
    orderId             VARCHAR(50)     NOT NULL,
    status              VARCHAR(20)     NOT NULL,
    reason              VARCHAR(200)    NULL,
    releasedQuantity    INT             NOT NULL,
    backorderedQuantity INT             NOT NULL,
    evaluatedAt         DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_M08944_FulfilmentResult PRIMARY KEY (orderId),
    CONSTRAINT FK_M08944_FulfilmentResult_Order
        FOREIGN KEY (orderId) REFERENCES dbo.M08944_Order (orderId),
    CONSTRAINT CK_M08944_FulfilmentResult_Status
        CHECK (status IN ('Released', 'PartiallyReleased', 'Blocked')),
    CONSTRAINT CK_M08944_FulfilmentResult_ReasonRequiredIfBlocked
        CHECK (status <> 'Blocked' OR reason IS NOT NULL)
);
GO
