IF COL_LENGTH(N'dbo.Branches', N'LogoUrl') IS NULL
BEGIN
    ALTER TABLE dbo.Branches ADD LogoUrl NVARCHAR(1000) NULL;
END;
GO

IF COL_LENGTH(N'dbo.Branches', N'LogoPublicId') IS NULL
BEGIN
    ALTER TABLE dbo.Branches ADD LogoPublicId NVARCHAR(300) NULL;
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
    @CountryCode CHAR(2) = 'IN',
    @LogoUrl NVARCHAR(1000) = NULL,
    @LogoPublicId NVARCHAR(300) = NULL
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
        BranchId, TenantId, Name, PhoneNumber, AddressLine1, AddressLine2, City, State, PostalCode, CountryCode, LogoUrl, LogoPublicId
    )
    VALUES
    (
        @BranchId, @TenantId, @Name, @PhoneNumber, @AddressLine1, @AddressLine2, @City, @State, @PostalCode, @CountryCode, @LogoUrl, @LogoPublicId
    );

    EXEC dbo.Branch_GetById @TenantId = @TenantId, @BranchId = @BranchId;
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
    @LogoUrl NVARCHAR(1000) = NULL,
    @LogoPublicId NVARCHAR(300) = NULL,
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
        LogoUrl = @LogoUrl,
        LogoPublicId = @LogoPublicId,
        IsActive = @IsActive,
        UpdatedAtUtc = SYSUTCDATETIME()
    WHERE TenantId = @TenantId
      AND BranchId = @BranchId;

    EXEC dbo.Branch_GetById @TenantId = @TenantId, @BranchId = @BranchId;
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
        LogoUrl,
        LogoPublicId,
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
        LogoUrl,
        LogoPublicId,
        IsActive,
        CreatedAtUtc,
        UpdatedAtUtc
    FROM dbo.Branches
    WHERE TenantId = @TenantId
      AND (@IncludeInactive = 1 OR IsActive = 1)
    ORDER BY CreatedAtUtc DESC;
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
        b.LogoUrl AS BranchLogoUrl,
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
        mi.DisplayOrder AS ItemDisplayOrder,
        mi.ImageUrl,
        mi.ImageAltText,
        JSON_QUERY(COALESCE((
            SELECT v.MenuItemVariantId AS menuItemVariantId, v.Name AS name, v.Price AS price, v.DisplayOrder AS displayOrder
            FROM dbo.MenuItemVariants v
            WHERE v.TenantId = mi.TenantId
              AND v.BranchId = mi.BranchId
              AND v.MenuItemId = mi.MenuItemId
              AND v.IsActive = 1
              AND v.IsAvailable = 1
            ORDER BY v.DisplayOrder ASC, v.Name ASC
            FOR JSON PATH
        ), N'[]')) AS VariantsJson
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

CREATE OR ALTER PROCEDURE dbo.PublicMenu_GetByBranch
    @BranchId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        b.BranchId,
        b.Name AS BranchName,
        b.LogoUrl AS BranchLogoUrl,
        mc.MenuCategoryId,
        mc.Name AS CategoryName,
        mc.DisplayOrder AS CategoryDisplayOrder,
        mi.MenuItemId,
        mi.Name AS ItemName,
        mi.Description,
        mi.Price,
        mi.DisplayOrder AS ItemDisplayOrder,
        mi.ImageUrl,
        mi.ImageAltText,
        JSON_QUERY(COALESCE((
            SELECT v.MenuItemVariantId AS menuItemVariantId, v.Name AS name, v.Price AS price, v.DisplayOrder AS displayOrder
            FROM dbo.MenuItemVariants v
            WHERE v.TenantId = mi.TenantId
              AND v.BranchId = mi.BranchId
              AND v.MenuItemId = mi.MenuItemId
              AND v.IsActive = 1
              AND v.IsAvailable = 1
            ORDER BY v.DisplayOrder ASC, v.Name ASC
            FOR JSON PATH
        ), N'[]')) AS VariantsJson
    FROM dbo.Branches b
    INNER JOIN dbo.MenuCategories mc ON mc.BranchId = b.BranchId AND mc.IsActive = 1
    INNER JOIN dbo.MenuItems mi ON mi.BranchId = b.BranchId AND mi.MenuCategoryId = mc.MenuCategoryId AND mi.IsActive = 1 AND mi.IsAvailable = 1
    WHERE b.BranchId = @BranchId
      AND b.IsActive = 1
    ORDER BY mc.DisplayOrder ASC, mc.Name ASC, mi.DisplayOrder ASC, mi.Name ASC;
END;
GO
