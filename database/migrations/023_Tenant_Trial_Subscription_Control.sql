IF COL_LENGTH(N'dbo.Tenants', N'PlanCode') IS NULL
BEGIN
    ALTER TABLE dbo.Tenants ADD PlanCode NVARCHAR(40) NULL;
END;
GO

IF COL_LENGTH(N'dbo.Tenants', N'TrialStartAtUtc') IS NULL
BEGIN
    ALTER TABLE dbo.Tenants ADD TrialStartAtUtc DATETIME2(3) NULL;
END;
GO

IF COL_LENGTH(N'dbo.Tenants', N'TrialEndAtUtc') IS NULL
BEGIN
    ALTER TABLE dbo.Tenants ADD TrialEndAtUtc DATETIME2(3) NULL;
END;
GO

IF COL_LENGTH(N'dbo.Tenants', N'SubscriptionStatusCode') IS NULL
BEGIN
    ALTER TABLE dbo.Tenants ADD SubscriptionStatusCode NVARCHAR(32) NULL;
END;
GO

IF COL_LENGTH(N'dbo.Tenants', N'AccountStatusCode') IS NULL
BEGIN
    ALTER TABLE dbo.Tenants ADD AccountStatusCode NVARCHAR(32) NULL;
END;
GO

IF COL_LENGTH(N'dbo.Tenants', N'SubscriptionUpdatedAtUtc') IS NULL
BEGIN
    ALTER TABLE dbo.Tenants ADD SubscriptionUpdatedAtUtc DATETIME2(3) NULL;
END;
GO

IF COL_LENGTH(N'dbo.Tenants', N'SubscriptionNotes') IS NULL
BEGIN
    ALTER TABLE dbo.Tenants ADD SubscriptionNotes NVARCHAR(500) NULL;
END;
GO

UPDATE dbo.Tenants
SET
    PlanCode = COALESCE(PlanCode, N'manual'),
    TrialStartAtUtc = COALESCE(TrialStartAtUtc, CreatedAtUtc),
    SubscriptionStatusCode = COALESCE(SubscriptionStatusCode, N'ManualActive'),
    AccountStatusCode = COALESCE(AccountStatusCode, CASE WHEN IsActive = 1 THEN N'Active' ELSE N'Inactive' END),
    SubscriptionUpdatedAtUtc = COALESCE(SubscriptionUpdatedAtUtc, SYSUTCDATETIME())
WHERE PlanCode IS NULL
   OR SubscriptionStatusCode IS NULL
   OR AccountStatusCode IS NULL
   OR SubscriptionUpdatedAtUtc IS NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_Tenants_SubscriptionStatusCode')
BEGIN
    ALTER TABLE dbo.Tenants ADD CONSTRAINT CK_Tenants_SubscriptionStatusCode CHECK (SubscriptionStatusCode IN (N'Trialing', N'Active', N'ManualActive', N'PastDue', N'Suspended', N'Cancelled', N'Expired'));
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_Tenants_AccountStatusCode')
BEGIN
    ALTER TABLE dbo.Tenants ADD CONSTRAINT CK_Tenants_AccountStatusCode CHECK (AccountStatusCode IN (N'Active', N'Inactive'));
END;
GO

CREATE OR ALTER PROCEDURE dbo.TenantAccess_GetByTenantId
    @TenantId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        TenantId,
        COALESCE(PlanCode, N'trial') AS PlanCode,
        TrialStartAtUtc,
        TrialEndAtUtc,
        COALESCE(SubscriptionStatusCode, N'Trialing') AS SubscriptionStatusCode,
        COALESCE(AccountStatusCode, CASE WHEN IsActive = 1 THEN N'Active' ELSE N'Inactive' END) AS AccountStatusCode,
        IsActive AS IsTenantActive
    FROM dbo.Tenants
    WHERE TenantId = @TenantId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.TenantAccess_GetByQrToken
    @QrToken NVARCHAR(80)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP (1)
        t.TenantId,
        COALESCE(t.PlanCode, N'trial') AS PlanCode,
        t.TrialStartAtUtc,
        t.TrialEndAtUtc,
        COALESCE(t.SubscriptionStatusCode, N'Trialing') AS SubscriptionStatusCode,
        COALESCE(t.AccountStatusCode, CASE WHEN t.IsActive = 1 THEN N'Active' ELSE N'Inactive' END) AS AccountStatusCode,
        t.IsActive AS IsTenantActive
    FROM dbo.BranchTables bt
    INNER JOIN dbo.Tenants t ON t.TenantId = bt.TenantId
    WHERE bt.QrToken = @QrToken
      AND bt.IsActive = 1;
END;
GO

CREATE OR ALTER PROCEDURE dbo.TenantSubscription_UpdateManual
    @TenantId UNIQUEIDENTIFIER,
    @PlanCode NVARCHAR(40),
    @SubscriptionStatusCode NVARCHAR(32),
    @AccountStatusCode NVARCHAR(32),
    @TrialEndAtUtc DATETIME2(3) = NULL,
    @SubscriptionNotes NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @SubscriptionStatusCode NOT IN (N'Trialing', N'Active', N'ManualActive', N'PastDue', N'Suspended', N'Cancelled', N'Expired')
    BEGIN
        THROW 51801, 'Subscription status is invalid.', 1;
    END;

    IF @AccountStatusCode NOT IN (N'Active', N'Inactive')
    BEGIN
        THROW 51802, 'Account status is invalid.', 1;
    END;

    UPDATE dbo.Tenants
    SET
        PlanCode = NULLIF(LTRIM(RTRIM(@PlanCode)), N''),
        SubscriptionStatusCode = @SubscriptionStatusCode,
        AccountStatusCode = @AccountStatusCode,
        TrialEndAtUtc = @TrialEndAtUtc,
        SubscriptionNotes = NULLIF(LTRIM(RTRIM(@SubscriptionNotes)), N''),
        SubscriptionUpdatedAtUtc = SYSUTCDATETIME(),
        IsActive = CASE WHEN @AccountStatusCode = N'Active' THEN 1 ELSE 0 END,
        UpdatedAtUtc = SYSUTCDATETIME()
    WHERE TenantId = @TenantId;

    IF @@ROWCOUNT = 0
    BEGIN
        THROW 51803, 'Tenant was not found.', 1;
    END;

    EXEC dbo.TenantAccess_GetByTenantId @TenantId = @TenantId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.Auth_RegisterTenantOwner
    @TenantId UNIQUEIDENTIFIER,
    @UserId UNIQUEIDENTIFIER,
    @TenantUserId UNIQUEIDENTIFIER,
    @TenantName NVARCHAR(160),
    @TenantSlug NVARCHAR(120),
    @OwnerEmail NVARCHAR(256),
    @OwnerDisplayName NVARCHAR(160),
    @PasswordHash NVARCHAR(512)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF EXISTS (SELECT 1 FROM dbo.Tenants WHERE Slug = @TenantSlug)
    BEGIN
        THROW 51001, 'Tenant slug already exists.', 1;
    END;

    IF EXISTS (SELECT 1 FROM dbo.Tenants WHERE OwnerEmail = @OwnerEmail)
    BEGIN
        THROW 51002, 'Tenant owner email already exists.', 1;
    END;

    IF EXISTS (SELECT 1 FROM dbo.Users WHERE Email = @OwnerEmail)
    BEGIN
        THROW 51301, 'User email already exists.', 1;
    END;

    DECLARE @NowUtc DATETIME2(3) = SYSUTCDATETIME();

    BEGIN TRANSACTION;

    INSERT INTO dbo.Tenants
    (
        TenantId,
        Name,
        Slug,
        OwnerEmail,
        PlanCode,
        TrialStartAtUtc,
        TrialEndAtUtc,
        SubscriptionStatusCode,
        AccountStatusCode,
        SubscriptionUpdatedAtUtc
    )
    VALUES
    (
        @TenantId,
        @TenantName,
        @TenantSlug,
        @OwnerEmail,
        N'trial',
        @NowUtc,
        DATEADD(DAY, 7, @NowUtc),
        N'Trialing',
        N'Active',
        @NowUtc
    );

    INSERT INTO dbo.Users (UserId, Email, DisplayName, PasswordHash)
    VALUES (@UserId, @OwnerEmail, @OwnerDisplayName, @PasswordHash);

    INSERT INTO dbo.TenantUsers (TenantUserId, TenantId, UserId, RoleCode)
    VALUES (@TenantUserId, @TenantId, @UserId, N'owner');

    COMMIT TRANSACTION;

    SELECT
        u.UserId,
        u.Email,
        u.DisplayName,
        t.TenantId,
        t.Name AS TenantName,
        t.Slug AS TenantSlug,
        tu.RoleCode,
        CAST(NULL AS UNIQUEIDENTIFIER) AS BranchId,
        t.PlanCode,
        t.TrialStartAtUtc,
        t.TrialEndAtUtc,
        t.SubscriptionStatusCode,
        t.AccountStatusCode,
        t.IsActive AS IsTenantActive
    FROM dbo.Users u
    INNER JOIN dbo.TenantUsers tu ON tu.UserId = u.UserId
    INNER JOIN dbo.Tenants t ON t.TenantId = tu.TenantId
    WHERE u.UserId = @UserId
      AND t.TenantId = @TenantId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.Auth_GetUserByEmail
    @Email NVARCHAR(256)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP (1)
        u.UserId,
        u.Email,
        u.DisplayName,
        u.PasswordHash,
        t.TenantId,
        t.Name AS TenantName,
        t.Slug AS TenantSlug,
        tu.RoleCode,
        tu.BranchId,
        COALESCE(t.PlanCode, N'trial') AS PlanCode,
        t.TrialStartAtUtc,
        t.TrialEndAtUtc,
        COALESCE(t.SubscriptionStatusCode, N'Trialing') AS SubscriptionStatusCode,
        COALESCE(t.AccountStatusCode, CASE WHEN t.IsActive = 1 THEN N'Active' ELSE N'Inactive' END) AS AccountStatusCode,
        t.IsActive AS IsTenantActive
    FROM dbo.Users u
    INNER JOIN dbo.TenantUsers tu ON tu.UserId = u.UserId
    INNER JOIN dbo.Tenants t ON t.TenantId = tu.TenantId
    WHERE u.Email = @Email
      AND u.IsActive = 1
      AND tu.IsActive = 1
    ORDER BY tu.CreatedAtUtc ASC;
END;
GO
