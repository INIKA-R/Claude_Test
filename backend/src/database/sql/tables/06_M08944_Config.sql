-- Phase 5 delta. Generic key/value config store so operational parameters
-- (e.g. the Priority partial-release threshold) can change without a code
-- deploy. Run sixth: no foreign key dependencies.

IF OBJECT_ID(N'dbo.M08944_Config', N'U') IS NOT NULL
    DROP TABLE dbo.M08944_Config;
GO

CREATE TABLE dbo.M08944_Config (
    configKey    VARCHAR(100)    NOT NULL,
    configValue  VARCHAR(100)    NOT NULL,
    CONSTRAINT PK_M08944_Config PRIMARY KEY (configKey)
);
GO

-- Seed row: fraction (0-1) of requested quantity that must be available
-- across WH-A/WH-B/WH-C combined for a Priority order to be released
-- (partially or fully) instead of Blocked.
INSERT INTO dbo.M08944_Config (configKey, configValue)
VALUES ('PriorityReleaseThresholdPct', '0.70');
GO
