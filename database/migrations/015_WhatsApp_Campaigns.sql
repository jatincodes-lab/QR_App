IF OBJECT_ID(N'dbo.WhatsAppCampaigns', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.WhatsAppCampaigns
    (
        CampaignId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_WhatsAppCampaigns PRIMARY KEY,
        RowId BIGINT IDENTITY(1,1) NOT NULL,
        TenantId UNIQUEIDENTIFIER NOT NULL,
        BranchId UNIQUEIDENTIFIER NULL,
        Name NVARCHAR(120) NOT NULL,
        TargetSegment NVARCHAR(40) NOT NULL,
        MessageText NVARCHAR(1000) NOT NULL,
        StatusCode NVARCHAR(32) NOT NULL CONSTRAINT DF_WhatsAppCampaigns_StatusCode DEFAULT (N'Queued'),
        RecipientCount INT NOT NULL CONSTRAINT DF_WhatsAppCampaigns_RecipientCount DEFAULT (0),
        SentCount INT NOT NULL CONSTRAINT DF_WhatsAppCampaigns_SentCount DEFAULT (0),
        FailedCount INT NOT NULL CONSTRAINT DF_WhatsAppCampaigns_FailedCount DEFAULT (0),
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_WhatsAppCampaigns_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
        QueuedAtUtc DATETIME2(3) NULL,
        StartedAtUtc DATETIME2(3) NULL,
        CompletedAtUtc DATETIME2(3) NULL,
        UpdatedAtUtc DATETIME2(3) NULL,
        RowVersion ROWVERSION NOT NULL,
        CONSTRAINT FK_WhatsAppCampaigns_Tenants FOREIGN KEY (TenantId) REFERENCES dbo.Tenants (TenantId),
        CONSTRAINT FK_WhatsAppCampaigns_Branches FOREIGN KEY (BranchId) REFERENCES dbo.Branches (BranchId),
        CONSTRAINT CK_WhatsAppCampaigns_TargetSegment CHECK (TargetSegment IN (N'AllOptedIn', N'RepeatCustomers', N'InactiveCustomers', N'HighValueCustomers')),
        CONSTRAINT CK_WhatsAppCampaigns_StatusCode CHECK (StatusCode IN (N'Queued', N'Sending', N'Sent', N'Failed', N'Cancelled')),
        CONSTRAINT CK_WhatsAppCampaigns_Counts CHECK (RecipientCount >= 0 AND SentCount >= 0 AND FailedCount >= 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.WhatsAppCampaignRecipients', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.WhatsAppCampaignRecipients
    (
        CampaignRecipientId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_WhatsAppCampaignRecipients PRIMARY KEY,
        RowId BIGINT IDENTITY(1,1) NOT NULL,
        CampaignId UNIQUEIDENTIFIER NOT NULL,
        TenantId UNIQUEIDENTIFIER NOT NULL,
        CustomerId UNIQUEIDENTIFIER NOT NULL,
        CustomerName NVARCHAR(120) NULL,
        WhatsAppNumber NVARCHAR(32) NOT NULL,
        StatusCode NVARCHAR(32) NOT NULL CONSTRAINT DF_WhatsAppCampaignRecipients_StatusCode DEFAULT (N'Queued'),
        ProviderMessageId NVARCHAR(120) NULL,
        ErrorMessage NVARCHAR(500) NULL,
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_WhatsAppCampaignRecipients_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
        SentAtUtc DATETIME2(3) NULL,
        FailedAtUtc DATETIME2(3) NULL,
        UpdatedAtUtc DATETIME2(3) NULL,
        RowVersion ROWVERSION NOT NULL,
        CONSTRAINT FK_WhatsAppCampaignRecipients_Campaigns FOREIGN KEY (CampaignId) REFERENCES dbo.WhatsAppCampaigns (CampaignId),
        CONSTRAINT FK_WhatsAppCampaignRecipients_Customers FOREIGN KEY (CustomerId) REFERENCES dbo.Customers (CustomerId),
        CONSTRAINT CK_WhatsAppCampaignRecipients_StatusCode CHECK (StatusCode IN (N'Queued', N'Sending', N'Sent', N'Failed', N'Skipped'))
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_WhatsAppCampaigns_TenantId_CreatedAtUtc' AND object_id = OBJECT_ID(N'dbo.WhatsAppCampaigns'))
BEGIN
    CREATE INDEX IX_WhatsAppCampaigns_TenantId_CreatedAtUtc
    ON dbo.WhatsAppCampaigns (TenantId, CreatedAtUtc DESC);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_WhatsAppCampaigns_TenantId_BranchId_StatusCode' AND object_id = OBJECT_ID(N'dbo.WhatsAppCampaigns'))
BEGIN
    CREATE INDEX IX_WhatsAppCampaigns_TenantId_BranchId_StatusCode
    ON dbo.WhatsAppCampaigns (TenantId, BranchId, StatusCode);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_WhatsAppCampaignRecipients_CampaignId_StatusCode' AND object_id = OBJECT_ID(N'dbo.WhatsAppCampaignRecipients'))
BEGIN
    CREATE INDEX IX_WhatsAppCampaignRecipients_CampaignId_StatusCode
    ON dbo.WhatsAppCampaignRecipients (CampaignId, StatusCode);
END;
GO

CREATE OR ALTER PROCEDURE dbo.WhatsAppCampaign_PreviewRecipients
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER = NULL,
    @TargetSegment NVARCHAR(40)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @CleanTargetSegment NVARCHAR(40) = NULLIF(LTRIM(RTRIM(@TargetSegment)), N'');

    IF @BranchId IS NOT NULL AND NOT EXISTS
    (
        SELECT 1
        FROM dbo.Branches
        WHERE TenantId = @TenantId
          AND BranchId = @BranchId
          AND IsActive = 1
    )
    BEGIN
        THROW 51021, 'Branch was not found for this tenant.', 1;
    END;

    IF @CleanTargetSegment NOT IN (N'AllOptedIn', N'RepeatCustomers', N'InactiveCustomers', N'HighValueCustomers')
    BEGIN
        THROW 51070, 'Campaign target segment is invalid.', 1;
    END;

    SELECT COUNT(1) AS RecipientCount
    FROM dbo.Customers c
    WHERE c.TenantId = @TenantId
      AND c.MarketingConsent = 1
      AND NULLIF(LTRIM(RTRIM(c.WhatsAppNumber)), N'') IS NOT NULL
      AND (@BranchId IS NULL OR c.LastBranchId = @BranchId OR c.FirstBranchId = @BranchId)
      AND
      (
          @CleanTargetSegment = N'AllOptedIn'
          OR (@CleanTargetSegment = N'RepeatCustomers' AND c.VisitCount >= 2)
          OR (@CleanTargetSegment = N'InactiveCustomers' AND c.LastVisitAtUtc < DATEADD(DAY, -30, SYSUTCDATETIME()))
          OR (@CleanTargetSegment = N'HighValueCustomers' AND c.TotalOrderValue >= 1000)
      );
END;
GO

CREATE OR ALTER PROCEDURE dbo.WhatsAppCampaign_Create
    @TenantId UNIQUEIDENTIFIER,
    @CampaignId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER = NULL,
    @Name NVARCHAR(120),
    @TargetSegment NVARCHAR(40),
    @MessageText NVARCHAR(1000)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @CleanName NVARCHAR(120) = NULLIF(LTRIM(RTRIM(@Name)), N'');
    DECLARE @CleanTargetSegment NVARCHAR(40) = NULLIF(LTRIM(RTRIM(@TargetSegment)), N'');
    DECLARE @CleanMessageText NVARCHAR(1000) = NULLIF(LTRIM(RTRIM(@MessageText)), N'');
    DECLARE @NowUtc DATETIME2(3) = SYSUTCDATETIME();

    IF @CleanName IS NULL
    BEGIN
        THROW 51071, 'Campaign name is required.', 1;
    END;

    IF @CleanMessageText IS NULL
    BEGIN
        THROW 51072, 'Campaign message is required.', 1;
    END;

    IF @CleanTargetSegment NOT IN (N'AllOptedIn', N'RepeatCustomers', N'InactiveCustomers', N'HighValueCustomers')
    BEGIN
        THROW 51070, 'Campaign target segment is invalid.', 1;
    END;

    IF @BranchId IS NOT NULL AND NOT EXISTS
    (
        SELECT 1
        FROM dbo.Branches
        WHERE TenantId = @TenantId
          AND BranchId = @BranchId
          AND IsActive = 1
    )
    BEGIN
        THROW 51021, 'Branch was not found for this tenant.', 1;
    END;

    BEGIN TRANSACTION;

    INSERT INTO dbo.WhatsAppCampaigns
    (
        CampaignId,
        TenantId,
        BranchId,
        Name,
        TargetSegment,
        MessageText,
        StatusCode,
        QueuedAtUtc,
        CreatedAtUtc
    )
    VALUES
    (
        @CampaignId,
        @TenantId,
        @BranchId,
        @CleanName,
        @CleanTargetSegment,
        @CleanMessageText,
        N'Queued',
        @NowUtc,
        @NowUtc
    );

    INSERT INTO dbo.WhatsAppCampaignRecipients
    (
        CampaignRecipientId,
        CampaignId,
        TenantId,
        CustomerId,
        CustomerName,
        WhatsAppNumber,
        StatusCode,
        CreatedAtUtc
    )
    SELECT
        NEWID(),
        @CampaignId,
        c.TenantId,
        c.CustomerId,
        c.Name,
        c.WhatsAppNumber,
        N'Queued',
        @NowUtc
    FROM dbo.Customers c
    WHERE c.TenantId = @TenantId
      AND c.MarketingConsent = 1
      AND NULLIF(LTRIM(RTRIM(c.WhatsAppNumber)), N'') IS NOT NULL
      AND (@BranchId IS NULL OR c.LastBranchId = @BranchId OR c.FirstBranchId = @BranchId)
      AND
      (
          @CleanTargetSegment = N'AllOptedIn'
          OR (@CleanTargetSegment = N'RepeatCustomers' AND c.VisitCount >= 2)
          OR (@CleanTargetSegment = N'InactiveCustomers' AND c.LastVisitAtUtc < DATEADD(DAY, -30, @NowUtc))
          OR (@CleanTargetSegment = N'HighValueCustomers' AND c.TotalOrderValue >= 1000)
      );

    UPDATE dbo.WhatsAppCampaigns
    SET RecipientCount =
        (
            SELECT COUNT(1)
            FROM dbo.WhatsAppCampaignRecipients
            WHERE CampaignId = @CampaignId
        ),
        UpdatedAtUtc = @NowUtc
    WHERE CampaignId = @CampaignId;

    COMMIT TRANSACTION;

    EXEC dbo.WhatsAppCampaign_GetById @TenantId = @TenantId, @CampaignId = @CampaignId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.WhatsAppCampaign_GetById
    @TenantId UNIQUEIDENTIFIER,
    @CampaignId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        c.CampaignId,
        c.TenantId,
        c.BranchId,
        b.Name AS BranchName,
        c.Name,
        c.TargetSegment,
        c.MessageText,
        c.StatusCode,
        c.RecipientCount,
        c.SentCount,
        c.FailedCount,
        c.CreatedAtUtc,
        c.QueuedAtUtc,
        c.StartedAtUtc,
        c.CompletedAtUtc,
        c.UpdatedAtUtc
    FROM dbo.WhatsAppCampaigns c
    LEFT JOIN dbo.Branches b ON b.TenantId = c.TenantId AND b.BranchId = c.BranchId
    WHERE c.TenantId = @TenantId
      AND c.CampaignId = @CampaignId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.WhatsAppCampaign_GetList
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP (100)
        c.CampaignId,
        c.TenantId,
        c.BranchId,
        b.Name AS BranchName,
        c.Name,
        c.TargetSegment,
        c.MessageText,
        c.StatusCode,
        c.RecipientCount,
        c.SentCount,
        c.FailedCount,
        c.CreatedAtUtc,
        c.QueuedAtUtc,
        c.StartedAtUtc,
        c.CompletedAtUtc,
        c.UpdatedAtUtc
    FROM dbo.WhatsAppCampaigns c
    LEFT JOIN dbo.Branches b ON b.TenantId = c.TenantId AND b.BranchId = c.BranchId
    WHERE c.TenantId = @TenantId
      AND (@BranchId IS NULL OR c.BranchId = @BranchId)
    ORDER BY c.CreatedAtUtc DESC;
END;
GO
