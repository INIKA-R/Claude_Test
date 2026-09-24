-- FRD §2 Customer, FRD §7 DB naming
-- Run first: no foreign key dependencies.

IF OBJECT_ID(N'dbo.M08944_Customer', N'U') IS NOT NULL
    DROP TABLE dbo.M08944_Customer;
GO

CREATE TABLE dbo.M08944_Customer (
    customerId          VARCHAR(50)     NOT NULL,
    eligibilityStatus   VARCHAR(20)     NOT NULL,
    CONSTRAINT PK_M08944_Customer PRIMARY KEY (customerId),
    CONSTRAINT CK_M08944_Customer_EligibilityStatus
        CHECK (eligibilityStatus IN ('Eligible', 'CreditHold', 'Unknown'))
);
GO
