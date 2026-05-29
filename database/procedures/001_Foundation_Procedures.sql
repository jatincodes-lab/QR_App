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

CREATE OR ALTER PROCEDURE dbo.BranchTable_Create
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER,
    @TableId UNIQUEIDENTIFIER,
    @Name NVARCHAR(80),
    @DisplayOrder INT,
    @QrToken NVARCHAR(80)
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Branches WHERE TenantId = @TenantId AND BranchId = @BranchId AND IsActive = 1)
    BEGIN
        THROW 51601, 'Active branch was not found for this tenant.', 1;
    END;

    IF EXISTS (SELECT 1 FROM dbo.BranchTables WHERE TenantId = @TenantId AND BranchId = @BranchId AND Name = @Name)
    BEGIN
        THROW 51602, 'Table name already exists for this branch.', 1;
    END;

    IF EXISTS (SELECT 1 FROM dbo.BranchTables WHERE QrToken = @QrToken)
    BEGIN
        THROW 51604, 'QR token already exists.', 1;
    END;

    INSERT INTO dbo.BranchTables (TableId, TenantId, BranchId, Name, DisplayOrder, QrToken)
    VALUES (@TableId, @TenantId, @BranchId, @Name, @DisplayOrder, @QrToken);

    SELECT
        TableId,
        TenantId,
        BranchId,
        Name,
        DisplayOrder,
        QrToken,
        IsActive,
        CreatedAtUtc,
        UpdatedAtUtc
    FROM dbo.BranchTables
    WHERE TenantId = @TenantId
      AND BranchId = @BranchId
      AND TableId = @TableId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.BranchTable_Update
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER,
    @TableId UNIQUEIDENTIFIER,
    @Name NVARCHAR(80),
    @DisplayOrder INT,
    @IsActive BIT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.BranchTables
        WHERE TenantId = @TenantId
          AND BranchId = @BranchId
          AND TableId = @TableId
    )
    BEGIN
        THROW 51603, 'Table was not found for this tenant and branch.', 1;
    END;

    IF EXISTS
    (
        SELECT 1
        FROM dbo.BranchTables
        WHERE TenantId = @TenantId
          AND BranchId = @BranchId
          AND Name = @Name
          AND TableId <> @TableId
    )
    BEGIN
        THROW 51602, 'Table name already exists for this branch.', 1;
    END;

    UPDATE dbo.BranchTables
    SET
        Name = @Name,
        DisplayOrder = @DisplayOrder,
        IsActive = @IsActive,
        UpdatedAtUtc = SYSUTCDATETIME()
    WHERE TenantId = @TenantId
      AND BranchId = @BranchId
      AND TableId = @TableId;

    SELECT
        TableId,
        TenantId,
        BranchId,
        Name,
        DisplayOrder,
        QrToken,
        IsActive,
        CreatedAtUtc,
        UpdatedAtUtc
    FROM dbo.BranchTables
    WHERE TenantId = @TenantId
      AND BranchId = @BranchId
      AND TableId = @TableId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.BranchTable_GetListByBranch
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER,
    @IncludeInactive BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        TableId,
        TenantId,
        BranchId,
        Name,
        DisplayOrder,
        QrToken,
        IsActive,
        CreatedAtUtc,
        UpdatedAtUtc
    FROM dbo.BranchTables
    WHERE TenantId = @TenantId
      AND BranchId = @BranchId
      AND (@IncludeInactive = 1 OR IsActive = 1)
    ORDER BY DisplayOrder ASC, Name ASC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.BranchTable_Deactivate
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER,
    @TableId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.BranchTables
    SET
        IsActive = 0,
        UpdatedAtUtc = SYSUTCDATETIME()
    WHERE TenantId = @TenantId
      AND BranchId = @BranchId
      AND TableId = @TableId;

    IF @@ROWCOUNT = 0
    BEGIN
        THROW 51603, 'Table was not found for this tenant and branch.', 1;
    END;
END;
GO

CREATE OR ALTER PROCEDURE dbo.BranchTable_RegenerateQrToken
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER,
    @TableId UNIQUEIDENTIFIER,
    @QrToken NVARCHAR(80)
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.BranchTables
        WHERE TenantId = @TenantId
          AND BranchId = @BranchId
          AND TableId = @TableId
    )
    BEGIN
        THROW 51603, 'Table was not found for this tenant and branch.', 1;
    END;

    IF EXISTS (SELECT 1 FROM dbo.BranchTables WHERE QrToken = @QrToken AND TableId <> @TableId)
    BEGIN
        THROW 51604, 'QR token already exists.', 1;
    END;

    UPDATE dbo.BranchTables
    SET
        QrToken = @QrToken,
        UpdatedAtUtc = SYSUTCDATETIME()
    WHERE TenantId = @TenantId
      AND BranchId = @BranchId
      AND TableId = @TableId;

    SELECT
        TableId,
        TenantId,
        BranchId,
        Name,
        DisplayOrder,
        QrToken,
        IsActive,
        CreatedAtUtc,
        UpdatedAtUtc
    FROM dbo.BranchTables
    WHERE TenantId = @TenantId
      AND BranchId = @BranchId
      AND TableId = @TableId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.PublicMenu_GetByQrToken
    @QrToken NVARCHAR(80)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        b.BranchId,
        b.Name AS BranchName,
        bt.TableId,
        bt.Name AS TableName,
        bt.QrToken,
        CAST(COALESCE(bos.EnableDirectQrOrdering, 0) AS BIT) AS EnableDirectQrOrdering,
        CAST(COALESCE(bos.RequireCustomerName, 0) AS BIT) AS RequireCustomerName,
        CAST(COALESCE(bos.RequireCustomerWhatsApp, 0) AS BIT) AS RequireCustomerWhatsApp,
        CAST(COALESCE(bos.WaiterCallEnabled, 1) AS BIT) AS WaiterCallEnabled,
        mc.MenuCategoryId,
        mc.Name AS CategoryName,
        mc.DisplayOrder AS CategoryDisplayOrder,
        mi.MenuItemId,
        mi.Name AS ItemName,
        mi.Description,
        mi.Price,
        mi.DisplayOrder AS ItemDisplayOrder
    FROM dbo.BranchTables bt
    INNER JOIN dbo.Branches b ON b.BranchId = bt.BranchId
    LEFT JOIN dbo.BranchOrderSettings bos ON bos.TenantId = bt.TenantId AND bos.BranchId = bt.BranchId
    LEFT JOIN dbo.MenuCategories mc ON mc.TenantId = bt.TenantId AND mc.BranchId = bt.BranchId AND mc.IsActive = 1
    LEFT JOIN dbo.MenuItems mi ON mi.TenantId = bt.TenantId AND mi.BranchId = bt.BranchId AND mi.MenuCategoryId = mc.MenuCategoryId AND mi.IsActive = 1 AND mi.IsAvailable = 1
    WHERE bt.QrToken = @QrToken
      AND bt.IsActive = 1
      AND b.IsActive = 1
    ORDER BY mc.DisplayOrder ASC, mc.Name ASC, mi.DisplayOrder ASC, mi.Name ASC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.PublicOrder_CreateFromQrToken
    @QrToken NVARCHAR(80),
    @OrderId UNIQUEIDENTIFIER,
    @CustomerName NVARCHAR(120) = NULL,
    @CustomerWhatsApp NVARCHAR(32) = NULL,
    @Notes NVARCHAR(500) = NULL,
    @ItemsJson NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE
        @TenantId UNIQUEIDENTIFIER,
        @BranchId UNIQUEIDENTIFIER,
        @TableId UNIQUEIDENTIFIER,
        @EnableDirectQrOrdering BIT,
        @RequireCustomerName BIT,
        @RequireCustomerWhatsApp BIT;

    SELECT
        @TenantId = bt.TenantId,
        @BranchId = bt.BranchId,
        @TableId = bt.TableId,
        @EnableDirectQrOrdering = COALESCE(bos.EnableDirectQrOrdering, 0),
        @RequireCustomerName = COALESCE(bos.RequireCustomerName, 0),
        @RequireCustomerWhatsApp = COALESCE(bos.RequireCustomerWhatsApp, 0)
    FROM dbo.BranchTables bt
    INNER JOIN dbo.Branches b ON b.TenantId = bt.TenantId AND b.BranchId = bt.BranchId
    LEFT JOIN dbo.BranchOrderSettings bos ON bos.TenantId = bt.TenantId AND bos.BranchId = bt.BranchId
    WHERE bt.QrToken = @QrToken
      AND bt.IsActive = 1
      AND b.IsActive = 1;

    IF @TableId IS NULL
    BEGIN
        THROW 51701, 'Active QR table was not found.', 1;
    END;

    IF @EnableDirectQrOrdering = 0
    BEGIN
        THROW 51702, 'Direct QR ordering is disabled for this branch.', 1;
    END;

    IF @RequireCustomerName = 1 AND NULLIF(LTRIM(RTRIM(@CustomerName)), N'') IS NULL
    BEGIN
        THROW 51703, 'Customer name is required for this branch.', 1;
    END;

    IF @RequireCustomerWhatsApp = 1 AND NULLIF(LTRIM(RTRIM(@CustomerWhatsApp)), N'') IS NULL
    BEGIN
        THROW 51704, 'Customer WhatsApp is required for this branch.', 1;
    END;

    DECLARE @RequestedItems TABLE
    (
        MenuItemId UNIQUEIDENTIFIER NOT NULL,
        Quantity INT NOT NULL
    );

    INSERT INTO @RequestedItems (MenuItemId, Quantity)
    SELECT parsed.MenuItemId, SUM(parsed.Quantity)
    FROM OPENJSON(@ItemsJson)
    WITH
    (
        MenuItemId UNIQUEIDENTIFIER '$.menuItemId',
        Quantity INT '$.quantity'
    ) parsed
    WHERE parsed.MenuItemId IS NOT NULL
      AND parsed.Quantity BETWEEN 1 AND 99
    GROUP BY parsed.MenuItemId;

    IF NOT EXISTS (SELECT 1 FROM @RequestedItems)
    BEGIN
        THROW 51705, 'At least one valid order item is required.', 1;
    END;

    IF EXISTS
    (
        SELECT 1
        FROM @RequestedItems requested
        LEFT JOIN dbo.MenuItems mi ON mi.TenantId = @TenantId
            AND mi.BranchId = @BranchId
            AND mi.MenuItemId = requested.MenuItemId
            AND mi.IsActive = 1
            AND mi.IsAvailable = 1
        WHERE mi.MenuItemId IS NULL
    )
    BEGIN
        THROW 51706, 'One or more menu items are unavailable for ordering.', 1;
    END;

    DECLARE @PricedItems TABLE
    (
        OrderItemId UNIQUEIDENTIFIER NOT NULL,
        MenuItemId UNIQUEIDENTIFIER NOT NULL,
        MenuItemName NVARCHAR(160) NOT NULL,
        UnitPrice DECIMAL(10, 2) NOT NULL,
        Quantity INT NOT NULL,
        LineTotal DECIMAL(10, 2) NOT NULL
    );

    INSERT INTO @PricedItems (OrderItemId, MenuItemId, MenuItemName, UnitPrice, Quantity, LineTotal)
    SELECT
        NEWID(),
        mi.MenuItemId,
        mi.Name,
        mi.Price,
        requested.Quantity,
        mi.Price * requested.Quantity
    FROM @RequestedItems requested
    INNER JOIN dbo.MenuItems mi ON mi.TenantId = @TenantId
        AND mi.BranchId = @BranchId
        AND mi.MenuItemId = requested.MenuItemId
        AND mi.IsActive = 1
        AND mi.IsAvailable = 1;

    DECLARE @SubtotalAmount DECIMAL(10, 2);
    SELECT @SubtotalAmount = SUM(LineTotal) FROM @PricedItems;

    BEGIN TRANSACTION;

    INSERT INTO dbo.Orders
    (
        OrderId,
        TenantId,
        BranchId,
        TableId,
        OrderStatusCode,
        CustomerName,
        CustomerWhatsApp,
        Notes,
        SubtotalAmount,
        TotalAmount
    )
    VALUES
    (
        @OrderId,
        @TenantId,
        @BranchId,
        @TableId,
        N'Placed',
        NULLIF(LTRIM(RTRIM(@CustomerName)), N''),
        NULLIF(LTRIM(RTRIM(@CustomerWhatsApp)), N''),
        NULLIF(LTRIM(RTRIM(@Notes)), N''),
        @SubtotalAmount,
        @SubtotalAmount
    );

    INSERT INTO dbo.OrderItems
    (
        OrderItemId,
        TenantId,
        BranchId,
        OrderId,
        MenuItemId,
        MenuItemName,
        UnitPrice,
        Quantity,
        LineTotal
    )
    SELECT
        OrderItemId,
        @TenantId,
        @BranchId,
        @OrderId,
        MenuItemId,
        MenuItemName,
        UnitPrice,
        Quantity,
        LineTotal
    FROM @PricedItems;

    COMMIT TRANSACTION;

    SELECT
        OrderId,
        TenantId,
        BranchId,
        TableId,
        OrderStatusCode,
        CustomerName,
        CustomerWhatsApp,
        Notes,
        SubtotalAmount,
        TotalAmount,
        CreatedAtUtc,
        UpdatedAtUtc
    FROM dbo.Orders
    WHERE OrderId = @OrderId;

    SELECT
        OrderItemId,
        OrderId,
        MenuItemId,
        MenuItemName,
        UnitPrice,
        Quantity,
        LineTotal
    FROM dbo.OrderItems
    WHERE OrderId = @OrderId
    ORDER BY CreatedAtUtc ASC, MenuItemName ASC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.PublicOrder_GetByQrToken
    @QrToken NVARCHAR(80),
    @OrderId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.Orders o
        INNER JOIN dbo.BranchTables bt ON bt.TenantId = o.TenantId
            AND bt.BranchId = o.BranchId
            AND bt.TableId = o.TableId
        INNER JOIN dbo.Branches b ON b.TenantId = o.TenantId
            AND b.BranchId = o.BranchId
        WHERE bt.QrToken = @QrToken
          AND o.OrderId = @OrderId
          AND bt.IsActive = 1
          AND b.IsActive = 1
    )
    BEGIN
        THROW 51709, 'Order was not found for this QR table.', 1;
    END;

    SELECT
        o.OrderId,
        o.TenantId,
        o.BranchId,
        o.TableId,
        o.OrderStatusCode,
        o.CustomerName,
        o.CustomerWhatsApp,
        o.Notes,
        o.SubtotalAmount,
        o.TotalAmount,
        o.CreatedAtUtc,
        o.UpdatedAtUtc
    FROM dbo.Orders o
    INNER JOIN dbo.BranchTables bt ON bt.TenantId = o.TenantId
        AND bt.BranchId = o.BranchId
        AND bt.TableId = o.TableId
    INNER JOIN dbo.Branches b ON b.TenantId = o.TenantId
        AND b.BranchId = o.BranchId
    WHERE bt.QrToken = @QrToken
      AND o.OrderId = @OrderId
      AND bt.IsActive = 1
      AND b.IsActive = 1;

    SELECT
        OrderItemId,
        OrderId,
        MenuItemId,
        MenuItemName,
        UnitPrice,
        Quantity,
        LineTotal
    FROM dbo.OrderItems
    WHERE OrderId = @OrderId
    ORDER BY CreatedAtUtc ASC, MenuItemName ASC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.AdminOrder_GetListByBranch
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER,
    @IncludeCompleted BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        o.OrderId,
        o.TenantId,
        o.BranchId,
        o.TableId,
        bt.Name AS TableName,
        o.OrderStatusCode,
        o.CustomerName,
        o.CustomerWhatsApp,
        o.Notes,
        o.SubtotalAmount,
        o.TotalAmount,
        o.CreatedAtUtc,
        o.UpdatedAtUtc
    FROM dbo.Orders o
    INNER JOIN dbo.BranchTables bt ON bt.TenantId = o.TenantId AND bt.BranchId = o.BranchId AND bt.TableId = o.TableId
    WHERE o.TenantId = @TenantId
      AND o.BranchId = @BranchId
      AND (@IncludeCompleted = 1 OR o.OrderStatusCode NOT IN (N'Completed', N'Cancelled'))
    ORDER BY o.CreatedAtUtc DESC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.AdminOrder_GetItemsByBranch
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        oi.OrderItemId,
        oi.OrderId,
        oi.MenuItemId,
        oi.MenuItemName,
        oi.UnitPrice,
        oi.Quantity,
        oi.LineTotal
    FROM dbo.OrderItems oi
    INNER JOIN dbo.Orders o ON o.TenantId = oi.TenantId AND o.BranchId = oi.BranchId AND o.OrderId = oi.OrderId
    WHERE oi.TenantId = @TenantId
      AND oi.BranchId = @BranchId
    ORDER BY oi.CreatedAtUtc ASC, oi.MenuItemName ASC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.AdminOrder_UpdateStatus
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER,
    @OrderId UNIQUEIDENTIFIER,
    @OrderStatusCode NVARCHAR(32)
AS
BEGIN
    SET NOCOUNT ON;

    IF @OrderStatusCode NOT IN (N'Placed', N'Accepted', N'Preparing', N'Ready', N'Completed', N'Cancelled')
    BEGIN
        THROW 51707, 'Order status is invalid.', 1;
    END;

    UPDATE dbo.Orders
    SET
        OrderStatusCode = @OrderStatusCode,
        UpdatedAtUtc = SYSUTCDATETIME()
    WHERE TenantId = @TenantId
      AND BranchId = @BranchId
      AND OrderId = @OrderId;

    IF @@ROWCOUNT = 0
    BEGIN
        THROW 51708, 'Order was not found for this tenant and branch.', 1;
    END;

    SELECT
        o.OrderId,
        o.TenantId,
        o.BranchId,
        o.TableId,
        bt.Name AS TableName,
        o.OrderStatusCode,
        o.CustomerName,
        o.CustomerWhatsApp,
        o.Notes,
        o.SubtotalAmount,
        o.TotalAmount,
        o.CreatedAtUtc,
        o.UpdatedAtUtc
    FROM dbo.Orders o
    INNER JOIN dbo.BranchTables bt ON bt.TenantId = o.TenantId AND bt.BranchId = o.BranchId AND bt.TableId = o.TableId
    WHERE o.TenantId = @TenantId
      AND o.BranchId = @BranchId
      AND o.OrderId = @OrderId;

    SELECT
        OrderItemId,
        OrderId,
        MenuItemId,
        MenuItemName,
        UnitPrice,
        Quantity,
        LineTotal
    FROM dbo.OrderItems
    WHERE TenantId = @TenantId
      AND BranchId = @BranchId
      AND OrderId = @OrderId
    ORDER BY CreatedAtUtc ASC, MenuItemName ASC;
END;
GO
