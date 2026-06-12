CREATE OR ALTER PROCEDURE dbo.TenantSubscription_GetByTenantId
    @TenantId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        TenantId,
        Name,
        Slug,
        OwnerEmail,
        COALESCE(PlanCode, N'trial') AS PlanCode,
        TrialStartAtUtc,
        TrialEndAtUtc,
        COALESCE(SubscriptionStatusCode, N'Trialing') AS SubscriptionStatusCode,
        COALESCE(AccountStatusCode, CASE WHEN IsActive = 1 THEN N'Active' ELSE N'Inactive' END) AS AccountStatusCode,
        IsActive AS IsTenantActive,
        SubscriptionUpdatedAtUtc,
        SubscriptionNotes
    FROM dbo.Tenants
    WHERE TenantId = @TenantId;
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

    DECLARE @CleanPlanCode NVARCHAR(40) = NULLIF(LOWER(LTRIM(RTRIM(@PlanCode))), N'');
    DECLARE @CleanNotes NVARCHAR(500) = NULLIF(LTRIM(RTRIM(@SubscriptionNotes)), N'');

    IF @CleanPlanCode IS NULL OR LEN(@CleanPlanCode) < 2
    BEGIN
        THROW 51901, 'Plan code is invalid.', 1;
    END;

    IF @SubscriptionStatusCode NOT IN (N'Trialing', N'Active', N'ManualActive', N'PastDue', N'Suspended', N'Cancelled', N'Expired')
    BEGIN
        THROW 51902, 'Subscription status is invalid.', 1;
    END;

    IF @AccountStatusCode NOT IN (N'Active', N'Inactive')
    BEGIN
        THROW 51903, 'Account status is invalid.', 1;
    END;

    IF @SubscriptionStatusCode = N'Trialing' AND @TrialEndAtUtc IS NULL
    BEGIN
        THROW 51904, 'Trial end date is required for trialing tenants.', 1;
    END;

    UPDATE dbo.Tenants
    SET
        PlanCode = @CleanPlanCode,
        TrialEndAtUtc = @TrialEndAtUtc,
        SubscriptionStatusCode = @SubscriptionStatusCode,
        AccountStatusCode = @AccountStatusCode,
        SubscriptionNotes = @CleanNotes,
        SubscriptionUpdatedAtUtc = SYSUTCDATETIME(),
        IsActive = CASE WHEN @AccountStatusCode = N'Active' THEN 1 ELSE 0 END,
        UpdatedAtUtc = SYSUTCDATETIME()
    WHERE TenantId = @TenantId;

    IF @@ROWCOUNT = 0
    BEGIN
        THROW 51905, 'Tenant was not found.', 1;
    END;

    EXEC dbo.TenantSubscription_GetByTenantId @TenantId = @TenantId;
END;
GO
