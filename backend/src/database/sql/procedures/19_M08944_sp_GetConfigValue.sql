-- Phase 5 delta. Generic config read (e.g. configKey =
-- 'PriorityReleaseThresholdPct') so the service layer can pick up a changed
-- threshold without a code change or redeploy.

IF OBJECT_ID(N'dbo.M08944_sp_GetConfigValue', N'P') IS NOT NULL
    DROP PROCEDURE dbo.M08944_sp_GetConfigValue;
GO

CREATE PROCEDURE dbo.M08944_sp_GetConfigValue
    @configKey VARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT configKey, configValue
    FROM dbo.M08944_Config
    WHERE configKey = @configKey;
END
GO
