IF COL_LENGTH(N'dbo.TenantUsers', N'BranchId') IS NULL
BEGIN
    ALTER TABLE dbo.TenantUsers ADD BranchId UNIQUEIDENTIFIER NULL;
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_TenantUsers_Branches')
BEGIN
    ALTER TABLE dbo.TenantUsers
    ADD CONSTRAINT FK_TenantUsers_Branches FOREIGN KEY (BranchId) REFERENCES dbo.Branches (BranchId);
END;
GO

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_TenantUsers_RoleCode')
BEGIN
    ALTER TABLE dbo.TenantUsers DROP CONSTRAINT CK_TenantUsers_RoleCode;
END;
GO

ALTER TABLE dbo.TenantUsers
ADD CONSTRAINT CK_TenantUsers_RoleCode CHECK (RoleCode IN (N'owner', N'admin', N'manager', N'kitchen', N'waiter', N'staff'));
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_TenantUsers_TenantId_BranchId_RoleCode' AND object_id = OBJECT_ID(N'dbo.TenantUsers'))
BEGIN
    CREATE INDEX IX_TenantUsers_TenantId_BranchId_RoleCode
    ON dbo.TenantUsers (TenantId, BranchId, RoleCode)
    INCLUDE (UserId, IsActive);
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
        tu.BranchId
    FROM dbo.Users u
    INNER JOIN dbo.TenantUsers tu ON tu.UserId = u.UserId
    INNER JOIN dbo.Tenants t ON t.TenantId = tu.TenantId
    WHERE u.Email = @Email
      AND u.IsActive = 1
      AND tu.IsActive = 1
      AND t.IsActive = 1
    ORDER BY tu.CreatedAtUtc ASC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.StaffUser_GetById
    @TenantId UNIQUEIDENTIFIER,
    @UserId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        u.UserId,
        tu.TenantUserId,
        tu.TenantId,
        tu.BranchId,
        b.Name AS BranchName,
        u.Email,
        u.DisplayName,
        tu.RoleCode,
        u.IsActive,
        tu.IsActive AS TenantUserIsActive,
        u.CreatedAtUtc,
        u.UpdatedAtUtc
    FROM dbo.TenantUsers tu
    INNER JOIN dbo.Users u ON u.UserId = tu.UserId
    LEFT JOIN dbo.Branches b ON b.TenantId = tu.TenantId AND b.BranchId = tu.BranchId
    WHERE tu.TenantId = @TenantId
      AND tu.UserId = @UserId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.StaffUser_GetList
    @TenantId UNIQUEIDENTIFIER,
    @IncludeInactive BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        u.UserId,
        tu.TenantUserId,
        tu.TenantId,
        tu.BranchId,
        b.Name AS BranchName,
        u.Email,
        u.DisplayName,
        tu.RoleCode,
        u.IsActive,
        tu.IsActive AS TenantUserIsActive,
        u.CreatedAtUtc,
        u.UpdatedAtUtc
    FROM dbo.TenantUsers tu
    INNER JOIN dbo.Users u ON u.UserId = tu.UserId
    LEFT JOIN dbo.Branches b ON b.TenantId = tu.TenantId AND b.BranchId = tu.BranchId
    WHERE tu.TenantId = @TenantId
      AND (@IncludeInactive = 1 OR (u.IsActive = 1 AND tu.IsActive = 1))
    ORDER BY
        CASE tu.RoleCode WHEN N'owner' THEN 0 WHEN N'admin' THEN 1 WHEN N'manager' THEN 2 WHEN N'kitchen' THEN 3 WHEN N'waiter' THEN 4 ELSE 5 END,
        u.DisplayName ASC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.StaffUser_Create
    @TenantId UNIQUEIDENTIFIER,
    @UserId UNIQUEIDENTIFIER,
    @TenantUserId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER = NULL,
    @Email NVARCHAR(256),
    @DisplayName NVARCHAR(160),
    @PasswordHash NVARCHAR(512),
    @RoleCode NVARCHAR(40)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @CleanEmail NVARCHAR(256) = LOWER(NULLIF(LTRIM(RTRIM(@Email)), N''));
    DECLARE @CleanDisplayName NVARCHAR(160) = NULLIF(LTRIM(RTRIM(@DisplayName)), N'');
    DECLARE @CleanRoleCode NVARCHAR(40) = LOWER(NULLIF(LTRIM(RTRIM(@RoleCode)), N''));

    IF @CleanRoleCode NOT IN (N'admin', N'manager', N'kitchen', N'waiter', N'staff')
    BEGIN
        THROW 51080, 'Staff role is invalid.', 1;
    END;

    IF @BranchId IS NOT NULL AND NOT EXISTS
    (
        SELECT 1 FROM dbo.Branches WHERE TenantId = @TenantId AND BranchId = @BranchId AND IsActive = 1
    )
    BEGIN
        THROW 51021, 'Branch was not found for this tenant.', 1;
    END;

    IF EXISTS (SELECT 1 FROM dbo.Users WHERE Email = @CleanEmail)
    BEGIN
        THROW 51301, 'User email already exists.', 1;
    END;

    BEGIN TRANSACTION;

    INSERT INTO dbo.Users (UserId, Email, DisplayName, PasswordHash)
    VALUES (@UserId, @CleanEmail, @CleanDisplayName, @PasswordHash);

    INSERT INTO dbo.TenantUsers (TenantUserId, TenantId, UserId, BranchId, RoleCode)
    VALUES (@TenantUserId, @TenantId, @UserId, @BranchId, @CleanRoleCode);

    COMMIT TRANSACTION;

    EXEC dbo.StaffUser_GetById @TenantId = @TenantId, @UserId = @UserId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.StaffUser_Update
    @TenantId UNIQUEIDENTIFIER,
    @UserId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER = NULL,
    @DisplayName NVARCHAR(160),
    @RoleCode NVARCHAR(40),
    @IsActive BIT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @CleanDisplayName NVARCHAR(160) = NULLIF(LTRIM(RTRIM(@DisplayName)), N'');
    DECLARE @CleanRoleCode NVARCHAR(40) = LOWER(NULLIF(LTRIM(RTRIM(@RoleCode)), N''));
    DECLARE @NowUtc DATETIME2(3) = SYSUTCDATETIME();

    IF @CleanRoleCode NOT IN (N'admin', N'manager', N'kitchen', N'waiter', N'staff')
    BEGIN
        THROW 51080, 'Staff role is invalid.', 1;
    END;

    IF @BranchId IS NOT NULL AND NOT EXISTS
    (
        SELECT 1 FROM dbo.Branches WHERE TenantId = @TenantId AND BranchId = @BranchId AND IsActive = 1
    )
    BEGIN
        THROW 51021, 'Branch was not found for this tenant.', 1;
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.TenantUsers WHERE TenantId = @TenantId AND UserId = @UserId)
    BEGIN
        THROW 51304, 'Staff user was not found.', 1;
    END;

    IF EXISTS (SELECT 1 FROM dbo.TenantUsers WHERE TenantId = @TenantId AND UserId = @UserId AND RoleCode = N'owner')
    BEGIN
        THROW 51305, 'Owner account cannot be edited from staff management.', 1;
    END;

    BEGIN TRANSACTION;

    UPDATE dbo.Users
    SET DisplayName = @CleanDisplayName,
        IsActive = @IsActive,
        UpdatedAtUtc = @NowUtc
    WHERE UserId = @UserId;

    UPDATE dbo.TenantUsers
    SET BranchId = @BranchId,
        RoleCode = @CleanRoleCode,
        IsActive = @IsActive,
        UpdatedAtUtc = @NowUtc
    WHERE TenantId = @TenantId
      AND UserId = @UserId;

    COMMIT TRANSACTION;

    EXEC dbo.StaffUser_GetById @TenantId = @TenantId, @UserId = @UserId;
END;
GO
