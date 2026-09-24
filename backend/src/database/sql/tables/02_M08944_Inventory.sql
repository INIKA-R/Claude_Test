-- FRD §2 Inventory, FRD §7 DB naming
-- Run second: no foreign key dependencies.

IF OBJECT_ID(N'dbo.M08944_Inventory', N'U') IS NOT NULL
    DROP TABLE dbo.M08944_Inventory;
GO

CREATE TABLE dbo.M08944_Inventory (
    productId              VARCHAR(50)     NOT NULL,
    warehouseId            VARCHAR(10)     NOT NULL,
    availableQuantity      INT             NOT NULL,
    earliestDispatchDate   DATE            NOT NULL,
    CONSTRAINT PK_M08944_Inventory PRIMARY KEY (productId, warehouseId),
    CONSTRAINT CK_M08944_Inventory_WarehouseId
        CHECK (warehouseId IN ('WH-A', 'WH-B', 'WH-C')),
    CONSTRAINT CK_M08944_Inventory_AvailableQuantity
        CHECK (availableQuantity >= 0)
);
GO
