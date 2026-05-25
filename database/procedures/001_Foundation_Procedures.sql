CREATE OR ALTER PROCEDURE dbo.Tenant_Create
    @TenantId UNIQUEIDENTIFIER,
    @Name NVARCHAR(160),
    @Slug NVARCHAR(120),
    @OwnerEmail NVARCHAR(256)
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM dbo.Tenants WHERE Slug = @Slug)
    BEGIN
        THROW 51001, 'Tenant slug already exists.', 1;
    END;

    IF EXISTS (SELECT 1 FROM dbo.Tenants WHERE OwnerEmail = @OwnerEmail)
    BEGIN
        THROW 51002, 'Tenant owner email already exists.', 1;
    END;

    INSERT INTO dbo.Tenants (TenantId, Name, Slug, OwnerEmail)
    VALUES (@TenantId, @Name, @Slug, @OwnerEmail);

    SELECT TenantId, Name, Slug, OwnerEmail, IsActive, CreatedAtUtc, UpdatedAtUtc
    FROM dbo.Tenants
    WHERE TenantId = @TenantId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.Tenant_GetById
    @TenantId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TenantId, Name, Slug, OwnerEmail, IsActive, CreatedAtUtc, UpdatedAtUtc
    FROM dbo.Tenants
    WHERE TenantId = @TenantId;
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

    BEGIN TRANSACTION;

    INSERT INTO dbo.Tenants (TenantId, Name, Slug, OwnerEmail)
    VALUES (@TenantId, @TenantName, @TenantSlug, @OwnerEmail);

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
        tu.RoleCode
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
        tu.RoleCode
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

CREATE OR ALTER PROCEDURE dbo.Branch_Create
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER,
    @Name NVARCHAR(160),
    @PhoneNumber NVARCHAR(32) = NULL,
    @AddressLine1 NVARCHAR(220) = NULL,
    @AddressLine2 NVARCHAR(220) = NULL,
    @City NVARCHAR(120) = NULL,
    @State NVARCHAR(120) = NULL,
    @PostalCode NVARCHAR(32) = NULL,
    @CountryCode CHAR(2) = 'IN'
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Tenants WHERE TenantId = @TenantId AND IsActive = 1)
    BEGIN
        THROW 51101, 'Active tenant was not found.', 1;
    END;

    IF EXISTS (SELECT 1 FROM dbo.Branches WHERE TenantId = @TenantId AND Name = @Name)
    BEGIN
        THROW 51102, 'Branch name already exists for this tenant.', 1;
    END;

    INSERT INTO dbo.Branches
    (
        BranchId,
        TenantId,
        Name,
        PhoneNumber,
        AddressLine1,
        AddressLine2,
        City,
        State,
        PostalCode,
        CountryCode
    )
    VALUES
    (
        @BranchId,
        @TenantId,
        @Name,
        @PhoneNumber,
        @AddressLine1,
        @AddressLine2,
        @City,
        @State,
        @PostalCode,
        @CountryCode
    );

    SELECT
        BranchId,
        TenantId,
        Name,
        PhoneNumber,
        AddressLine1,
        AddressLine2,
        City,
        State,
        PostalCode,
        CountryCode,
        IsActive,
        CreatedAtUtc,
        UpdatedAtUtc
    FROM dbo.Branches
    WHERE TenantId = @TenantId
      AND BranchId = @BranchId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.Branch_Update
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER,
    @Name NVARCHAR(160),
    @PhoneNumber NVARCHAR(32) = NULL,
    @AddressLine1 NVARCHAR(220) = NULL,
    @AddressLine2 NVARCHAR(220) = NULL,
    @City NVARCHAR(120) = NULL,
    @State NVARCHAR(120) = NULL,
    @PostalCode NVARCHAR(32) = NULL,
    @CountryCode CHAR(2) = 'IN',
    @IsActive BIT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Branches WHERE TenantId = @TenantId AND BranchId = @BranchId)
    BEGIN
        THROW 51103, 'Branch was not found for this tenant.', 1;
    END;

    IF EXISTS
    (
        SELECT 1
        FROM dbo.Branches
        WHERE TenantId = @TenantId
          AND Name = @Name
          AND BranchId <> @BranchId
    )
    BEGIN
        THROW 51102, 'Branch name already exists for this tenant.', 1;
    END;

    UPDATE dbo.Branches
    SET
        Name = @Name,
        PhoneNumber = @PhoneNumber,
        AddressLine1 = @AddressLine1,
        AddressLine2 = @AddressLine2,
        City = @City,
        State = @State,
        PostalCode = @PostalCode,
        CountryCode = @CountryCode,
        IsActive = @IsActive,
        UpdatedAtUtc = SYSUTCDATETIME()
    WHERE TenantId = @TenantId
      AND BranchId = @BranchId;

    SELECT
        BranchId,
        TenantId,
        Name,
        PhoneNumber,
        AddressLine1,
        AddressLine2,
        City,
        State,
        PostalCode,
        CountryCode,
        IsActive,
        CreatedAtUtc,
        UpdatedAtUtc
    FROM dbo.Branches
    WHERE TenantId = @TenantId
      AND BranchId = @BranchId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.Branch_GetById
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        BranchId,
        TenantId,
        Name,
        PhoneNumber,
        AddressLine1,
        AddressLine2,
        City,
        State,
        PostalCode,
        CountryCode,
        IsActive,
        CreatedAtUtc,
        UpdatedAtUtc
    FROM dbo.Branches
    WHERE TenantId = @TenantId
      AND BranchId = @BranchId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.Branch_GetListByTenant
    @TenantId UNIQUEIDENTIFIER,
    @IncludeInactive BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        BranchId,
        TenantId,
        Name,
        PhoneNumber,
        City,
        CountryCode,
        IsActive,
        CreatedAtUtc,
        UpdatedAtUtc
    FROM dbo.Branches
    WHERE TenantId = @TenantId
      AND (@IncludeInactive = 1 OR IsActive = 1)
    ORDER BY CreatedAtUtc DESC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.Branch_Deactivate
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.Branches
    SET
        IsActive = 0,
        UpdatedAtUtc = SYSUTCDATETIME()
    WHERE TenantId = @TenantId
      AND BranchId = @BranchId;

    IF @@ROWCOUNT = 0
    BEGIN
        THROW 51103, 'Branch was not found for this tenant.', 1;
    END;
END;
GO

CREATE OR ALTER PROCEDURE dbo.BranchOrderSettings_Create
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER,
    @BranchOrderSettingsId UNIQUEIDENTIFIER,
    @EnableDirectQrOrdering BIT,
    @RequireCustomerName BIT,
    @RequireCustomerWhatsApp BIT,
    @WaiterCallEnabled BIT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Branches WHERE TenantId = @TenantId AND BranchId = @BranchId AND IsActive = 1)
    BEGIN
        THROW 51201, 'Active branch was not found for this tenant.', 1;
    END;

    IF EXISTS (SELECT 1 FROM dbo.BranchOrderSettings WHERE TenantId = @TenantId AND BranchId = @BranchId)
    BEGIN
        THROW 51202, 'Branch order settings already exist.', 1;
    END;

    INSERT INTO dbo.BranchOrderSettings
    (
        BranchOrderSettingsId,
        TenantId,
        BranchId,
        EnableDirectQrOrdering,
        RequireCustomerName,
        RequireCustomerWhatsApp,
        WaiterCallEnabled
    )
    VALUES
    (
        @BranchOrderSettingsId,
        @TenantId,
        @BranchId,
        @EnableDirectQrOrdering,
        @RequireCustomerName,
        @RequireCustomerWhatsApp,
        @WaiterCallEnabled
    );

    SELECT
        BranchOrderSettingsId,
        TenantId,
        BranchId,
        EnableDirectQrOrdering,
        RequireCustomerName,
        RequireCustomerWhatsApp,
        WaiterCallEnabled,
        CreatedAtUtc,
        UpdatedAtUtc
    FROM dbo.BranchOrderSettings
    WHERE TenantId = @TenantId
      AND BranchId = @BranchId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.BranchOrderSettings_Update
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER,
    @EnableDirectQrOrdering BIT,
    @RequireCustomerName BIT,
    @RequireCustomerWhatsApp BIT,
    @WaiterCallEnabled BIT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.BranchOrderSettings
    SET
        EnableDirectQrOrdering = @EnableDirectQrOrdering,
        RequireCustomerName = @RequireCustomerName,
        RequireCustomerWhatsApp = @RequireCustomerWhatsApp,
        WaiterCallEnabled = @WaiterCallEnabled,
        UpdatedAtUtc = SYSUTCDATETIME()
    WHERE TenantId = @TenantId
      AND BranchId = @BranchId;

    IF @@ROWCOUNT = 0
    BEGIN
        THROW 51203, 'Branch order settings were not found for this tenant and branch.', 1;
    END;

    SELECT
        BranchOrderSettingsId,
        TenantId,
        BranchId,
        EnableDirectQrOrdering,
        RequireCustomerName,
        RequireCustomerWhatsApp,
        WaiterCallEnabled,
        CreatedAtUtc,
        UpdatedAtUtc
    FROM dbo.BranchOrderSettings
    WHERE TenantId = @TenantId
      AND BranchId = @BranchId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.BranchOrderSettings_GetByBranch
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        BranchOrderSettingsId,
        TenantId,
        BranchId,
        EnableDirectQrOrdering,
        RequireCustomerName,
        RequireCustomerWhatsApp,
        WaiterCallEnabled,
        CreatedAtUtc,
        UpdatedAtUtc
    FROM dbo.BranchOrderSettings
    WHERE TenantId = @TenantId
      AND BranchId = @BranchId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.MenuCategory_Create
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER,
    @MenuCategoryId UNIQUEIDENTIFIER,
    @Name NVARCHAR(120),
    @DisplayOrder INT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Branches WHERE TenantId = @TenantId AND BranchId = @BranchId AND IsActive = 1)
    BEGIN
        THROW 51401, 'Active branch was not found for this tenant.', 1;
    END;

    IF EXISTS (SELECT 1 FROM dbo.MenuCategories WHERE TenantId = @TenantId AND BranchId = @BranchId AND Name = @Name)
    BEGIN
        THROW 51402, 'Menu category name already exists for this branch.', 1;
    END;

    INSERT INTO dbo.MenuCategories (MenuCategoryId, TenantId, BranchId, Name, DisplayOrder)
    VALUES (@MenuCategoryId, @TenantId, @BranchId, @Name, @DisplayOrder);

    SELECT
        MenuCategoryId,
        TenantId,
        BranchId,
        Name,
        DisplayOrder,
        IsActive,
        CreatedAtUtc,
        UpdatedAtUtc
    FROM dbo.MenuCategories
    WHERE TenantId = @TenantId
      AND BranchId = @BranchId
      AND MenuCategoryId = @MenuCategoryId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.MenuCategory_Update
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER,
    @MenuCategoryId UNIQUEIDENTIFIER,
    @Name NVARCHAR(120),
    @DisplayOrder INT,
    @IsActive BIT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.MenuCategories
        WHERE TenantId = @TenantId
          AND BranchId = @BranchId
          AND MenuCategoryId = @MenuCategoryId
    )
    BEGIN
        THROW 51403, 'Menu category was not found for this tenant and branch.', 1;
    END;

    IF EXISTS
    (
        SELECT 1
        FROM dbo.MenuCategories
        WHERE TenantId = @TenantId
          AND BranchId = @BranchId
          AND Name = @Name
          AND MenuCategoryId <> @MenuCategoryId
    )
    BEGIN
        THROW 51402, 'Menu category name already exists for this branch.', 1;
    END;

    UPDATE dbo.MenuCategories
    SET
        Name = @Name,
        DisplayOrder = @DisplayOrder,
        IsActive = @IsActive,
        UpdatedAtUtc = SYSUTCDATETIME()
    WHERE TenantId = @TenantId
      AND BranchId = @BranchId
      AND MenuCategoryId = @MenuCategoryId;

    SELECT
        MenuCategoryId,
        TenantId,
        BranchId,
        Name,
        DisplayOrder,
        IsActive,
        CreatedAtUtc,
        UpdatedAtUtc
    FROM dbo.MenuCategories
    WHERE TenantId = @TenantId
      AND BranchId = @BranchId
      AND MenuCategoryId = @MenuCategoryId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.MenuCategory_GetListByBranch
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER,
    @IncludeInactive BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        MenuCategoryId,
        TenantId,
        BranchId,
        Name,
        DisplayOrder,
        IsActive,
        CreatedAtUtc,
        UpdatedAtUtc
    FROM dbo.MenuCategories
    WHERE TenantId = @TenantId
      AND BranchId = @BranchId
      AND (@IncludeInactive = 1 OR IsActive = 1)
    ORDER BY DisplayOrder ASC, Name ASC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.MenuCategory_Deactivate
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER,
    @MenuCategoryId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.MenuCategories
    SET
        IsActive = 0,
        UpdatedAtUtc = SYSUTCDATETIME()
    WHERE TenantId = @TenantId
      AND BranchId = @BranchId
      AND MenuCategoryId = @MenuCategoryId;

    IF @@ROWCOUNT = 0
    BEGIN
        THROW 51403, 'Menu category was not found for this tenant and branch.', 1;
    END;
END;
GO

CREATE OR ALTER PROCEDURE dbo.MenuItem_Create
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER,
    @MenuCategoryId UNIQUEIDENTIFIER,
    @MenuItemId UNIQUEIDENTIFIER,
    @Name NVARCHAR(160),
    @Description NVARCHAR(1000) = NULL,
    @Price DECIMAL(10, 2),
    @IsAvailable BIT,
    @DisplayOrder INT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Branches WHERE TenantId = @TenantId AND BranchId = @BranchId AND IsActive = 1)
    BEGIN
        THROW 51401, 'Active branch was not found for this tenant.', 1;
    END;

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.MenuCategories
        WHERE TenantId = @TenantId
          AND BranchId = @BranchId
          AND MenuCategoryId = @MenuCategoryId
          AND IsActive = 1
    )
    BEGIN
        THROW 51501, 'Active menu category was not found for this tenant and branch.', 1;
    END;

    IF EXISTS
    (
        SELECT 1
        FROM dbo.MenuItems
        WHERE TenantId = @TenantId
          AND BranchId = @BranchId
          AND MenuCategoryId = @MenuCategoryId
          AND Name = @Name
    )
    BEGIN
        THROW 51502, 'Menu item name already exists for this category.', 1;
    END;

    INSERT INTO dbo.MenuItems
    (
        MenuItemId,
        TenantId,
        BranchId,
        MenuCategoryId,
        Name,
        Description,
        Price,
        IsAvailable,
        DisplayOrder
    )
    VALUES
    (
        @MenuItemId,
        @TenantId,
        @BranchId,
        @MenuCategoryId,
        @Name,
        @Description,
        @Price,
        @IsAvailable,
        @DisplayOrder
    );

    SELECT
        mi.MenuItemId,
        mi.TenantId,
        mi.BranchId,
        mi.MenuCategoryId,
        mc.Name AS CategoryName,
        mi.Name,
        mi.Description,
        mi.Price,
        mi.IsAvailable,
        mi.IsActive,
        mi.DisplayOrder,
        mi.CreatedAtUtc,
        mi.UpdatedAtUtc
    FROM dbo.MenuItems mi
    INNER JOIN dbo.MenuCategories mc ON mc.MenuCategoryId = mi.MenuCategoryId
    WHERE mi.TenantId = @TenantId
      AND mi.BranchId = @BranchId
      AND mi.MenuItemId = @MenuItemId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.MenuItem_Update
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER,
    @MenuItemId UNIQUEIDENTIFIER,
    @MenuCategoryId UNIQUEIDENTIFIER,
    @Name NVARCHAR(160),
    @Description NVARCHAR(1000) = NULL,
    @Price DECIMAL(10, 2),
    @IsAvailable BIT,
    @IsActive BIT,
    @DisplayOrder INT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.MenuItems
        WHERE TenantId = @TenantId
          AND BranchId = @BranchId
          AND MenuItemId = @MenuItemId
    )
    BEGIN
        THROW 51503, 'Menu item was not found for this tenant and branch.', 1;
    END;

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.MenuCategories
        WHERE TenantId = @TenantId
          AND BranchId = @BranchId
          AND MenuCategoryId = @MenuCategoryId
          AND IsActive = 1
    )
    BEGIN
        THROW 51501, 'Active menu category was not found for this tenant and branch.', 1;
    END;

    IF EXISTS
    (
        SELECT 1
        FROM dbo.MenuItems
        WHERE TenantId = @TenantId
          AND BranchId = @BranchId
          AND MenuCategoryId = @MenuCategoryId
          AND Name = @Name
          AND MenuItemId <> @MenuItemId
    )
    BEGIN
        THROW 51502, 'Menu item name already exists for this category.', 1;
    END;

    UPDATE dbo.MenuItems
    SET
        MenuCategoryId = @MenuCategoryId,
        Name = @Name,
        Description = @Description,
        Price = @Price,
        IsAvailable = @IsAvailable,
        IsActive = @IsActive,
        DisplayOrder = @DisplayOrder,
        UpdatedAtUtc = SYSUTCDATETIME()
    WHERE TenantId = @TenantId
      AND BranchId = @BranchId
      AND MenuItemId = @MenuItemId;

    SELECT
        mi.MenuItemId,
        mi.TenantId,
        mi.BranchId,
        mi.MenuCategoryId,
        mc.Name AS CategoryName,
        mi.Name,
        mi.Description,
        mi.Price,
        mi.IsAvailable,
        mi.IsActive,
        mi.DisplayOrder,
        mi.CreatedAtUtc,
        mi.UpdatedAtUtc
    FROM dbo.MenuItems mi
    INNER JOIN dbo.MenuCategories mc ON mc.MenuCategoryId = mi.MenuCategoryId
    WHERE mi.TenantId = @TenantId
      AND mi.BranchId = @BranchId
      AND mi.MenuItemId = @MenuItemId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.MenuItem_GetListByBranch
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER,
    @IncludeInactive BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        mi.MenuItemId,
        mi.TenantId,
        mi.BranchId,
        mi.MenuCategoryId,
        mc.Name AS CategoryName,
        mi.Name,
        mi.Description,
        mi.Price,
        mi.IsAvailable,
        mi.IsActive,
        mi.DisplayOrder,
        mi.CreatedAtUtc,
        mi.UpdatedAtUtc
    FROM dbo.MenuItems mi
    INNER JOIN dbo.MenuCategories mc ON mc.MenuCategoryId = mi.MenuCategoryId
    WHERE mi.TenantId = @TenantId
      AND mi.BranchId = @BranchId
      AND (@IncludeInactive = 1 OR mi.IsActive = 1)
    ORDER BY mc.DisplayOrder ASC, mc.Name ASC, mi.DisplayOrder ASC, mi.Name ASC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.MenuItem_Deactivate
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER,
    @MenuItemId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.MenuItems
    SET
        IsActive = 0,
        UpdatedAtUtc = SYSUTCDATETIME()
    WHERE TenantId = @TenantId
      AND BranchId = @BranchId
      AND MenuItemId = @MenuItemId;

    IF @@ROWCOUNT = 0
    BEGIN
        THROW 51503, 'Menu item was not found for this tenant and branch.', 1;
    END;
END;
GO

CREATE OR ALTER PROCEDURE dbo.PublicMenu_GetByBranch
    @BranchId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        b.BranchId,
        b.Name AS BranchName,
        mc.MenuCategoryId,
        mc.Name AS CategoryName,
        mc.DisplayOrder AS CategoryDisplayOrder,
        mi.MenuItemId,
        mi.Name AS ItemName,
        mi.Description,
        mi.Price,
        mi.DisplayOrder AS ItemDisplayOrder
    FROM dbo.Branches b
    INNER JOIN dbo.MenuCategories mc ON mc.BranchId = b.BranchId
    INNER JOIN dbo.MenuItems mi ON mi.MenuCategoryId = mc.MenuCategoryId
    WHERE b.BranchId = @BranchId
      AND b.IsActive = 1
      AND mc.IsActive = 1
      AND mi.IsActive = 1
      AND mi.IsAvailable = 1
    ORDER BY mc.DisplayOrder ASC, mc.Name ASC, mi.DisplayOrder ASC, mi.Name ASC;
END;
GO
