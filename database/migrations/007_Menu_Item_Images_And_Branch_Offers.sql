IF COL_LENGTH(N'dbo.MenuItems', N'ImageUrl') IS NULL
BEGIN
    ALTER TABLE dbo.MenuItems ADD ImageUrl NVARCHAR(1000) NULL;
END;
GO

IF COL_LENGTH(N'dbo.MenuItems', N'ImageAltText') IS NULL
BEGIN
    ALTER TABLE dbo.MenuItems ADD ImageAltText NVARCHAR(200) NULL;
END;
GO

IF OBJECT_ID(N'dbo.BranchOffers', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.BranchOffers
    (
        BranchOfferId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_BranchOffers PRIMARY KEY,
        TenantId UNIQUEIDENTIFIER NOT NULL,
        BranchId UNIQUEIDENTIFIER NOT NULL,
        Title NVARCHAR(160) NOT NULL,
        Subtitle NVARCHAR(300) NULL,
        DiscountText NVARCHAR(80) NULL,
        ImageUrl NVARCHAR(1000) NULL,
        ImageAltText NVARCHAR(200) NULL,
        DisplayOrder INT NOT NULL CONSTRAINT DF_BranchOffers_DisplayOrder DEFAULT (0),
        IsActive BIT NOT NULL CONSTRAINT DF_BranchOffers_IsActive DEFAULT (1),
        StartsAtUtc DATETIME2(3) NULL,
        EndsAtUtc DATETIME2(3) NULL,
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_BranchOffers_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
        UpdatedAtUtc DATETIME2(3) NULL,
        CONSTRAINT FK_BranchOffers_Tenants FOREIGN KEY (TenantId) REFERENCES dbo.Tenants (TenantId),
        CONSTRAINT FK_BranchOffers_Branches FOREIGN KEY (BranchId) REFERENCES dbo.Branches (BranchId),
        CONSTRAINT CK_BranchOffers_DisplayOrder CHECK (DisplayOrder >= 0),
        CONSTRAINT CK_BranchOffers_DateRange CHECK (StartsAtUtc IS NULL OR EndsAtUtc IS NULL OR StartsAtUtc <= EndsAtUtc)
    );
END;
GO

IF NOT EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_BranchOffers_TenantId_BranchId_IsActive_DisplayOrder'
      AND object_id = OBJECT_ID(N'dbo.BranchOffers')
)
BEGIN
    CREATE INDEX IX_BranchOffers_TenantId_BranchId_IsActive_DisplayOrder
    ON dbo.BranchOffers (TenantId, BranchId, IsActive, DisplayOrder)
    INCLUDE (Title, Subtitle, DiscountText, ImageUrl, ImageAltText, StartsAtUtc, EndsAtUtc);
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
    @DisplayOrder INT,
    @ImageUrl NVARCHAR(1000) = NULL,
    @ImageAltText NVARCHAR(200) = NULL
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
        DisplayOrder,
        ImageUrl,
        ImageAltText
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
        @DisplayOrder,
        @ImageUrl,
        @ImageAltText
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
        mi.UpdatedAtUtc,
        mi.ImageUrl,
        mi.ImageAltText
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
    @DisplayOrder INT,
    @ImageUrl NVARCHAR(1000) = NULL,
    @ImageAltText NVARCHAR(200) = NULL
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
        ImageUrl = @ImageUrl,
        ImageAltText = @ImageAltText,
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
        mi.UpdatedAtUtc,
        mi.ImageUrl,
        mi.ImageAltText
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
        mi.UpdatedAtUtc,
        mi.ImageUrl,
        mi.ImageAltText
    FROM dbo.MenuItems mi
    INNER JOIN dbo.MenuCategories mc ON mc.MenuCategoryId = mi.MenuCategoryId
    WHERE mi.TenantId = @TenantId
      AND mi.BranchId = @BranchId
      AND (@IncludeInactive = 1 OR mi.IsActive = 1)
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
        mc.MenuCategoryId,
        mc.Name AS CategoryName,
        mc.DisplayOrder AS CategoryDisplayOrder,
        mi.MenuItemId,
        mi.Name AS ItemName,
        mi.Description,
        mi.Price,
        mi.DisplayOrder AS ItemDisplayOrder,
        mi.ImageUrl,
        mi.ImageAltText
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
        mi.DisplayOrder AS ItemDisplayOrder,
        mi.ImageUrl,
        mi.ImageAltText
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

CREATE OR ALTER PROCEDURE dbo.BranchOffer_Create
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER,
    @BranchOfferId UNIQUEIDENTIFIER,
    @Title NVARCHAR(160),
    @Subtitle NVARCHAR(300) = NULL,
    @DiscountText NVARCHAR(80) = NULL,
    @ImageUrl NVARCHAR(1000) = NULL,
    @ImageAltText NVARCHAR(200) = NULL,
    @DisplayOrder INT,
    @StartsAtUtc DATETIME2(3) = NULL,
    @EndsAtUtc DATETIME2(3) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Branches WHERE TenantId = @TenantId AND BranchId = @BranchId AND IsActive = 1)
    BEGIN
        THROW 51401, 'Active branch was not found for this tenant.', 1;
    END;

    INSERT INTO dbo.BranchOffers
    (
        BranchOfferId,
        TenantId,
        BranchId,
        Title,
        Subtitle,
        DiscountText,
        ImageUrl,
        ImageAltText,
        DisplayOrder,
        StartsAtUtc,
        EndsAtUtc
    )
    VALUES
    (
        @BranchOfferId,
        @TenantId,
        @BranchId,
        @Title,
        @Subtitle,
        @DiscountText,
        @ImageUrl,
        @ImageAltText,
        @DisplayOrder,
        @StartsAtUtc,
        @EndsAtUtc
    );

    SELECT * FROM dbo.BranchOffers WHERE TenantId = @TenantId AND BranchId = @BranchId AND BranchOfferId = @BranchOfferId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.BranchOffer_Update
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER,
    @BranchOfferId UNIQUEIDENTIFIER,
    @Title NVARCHAR(160),
    @Subtitle NVARCHAR(300) = NULL,
    @DiscountText NVARCHAR(80) = NULL,
    @ImageUrl NVARCHAR(1000) = NULL,
    @ImageAltText NVARCHAR(200) = NULL,
    @DisplayOrder INT,
    @StartsAtUtc DATETIME2(3) = NULL,
    @EndsAtUtc DATETIME2(3) = NULL,
    @IsActive BIT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.BranchOffers
    SET
        Title = @Title,
        Subtitle = @Subtitle,
        DiscountText = @DiscountText,
        ImageUrl = @ImageUrl,
        ImageAltText = @ImageAltText,
        DisplayOrder = @DisplayOrder,
        StartsAtUtc = @StartsAtUtc,
        EndsAtUtc = @EndsAtUtc,
        IsActive = @IsActive,
        UpdatedAtUtc = SYSUTCDATETIME()
    WHERE TenantId = @TenantId
      AND BranchId = @BranchId
      AND BranchOfferId = @BranchOfferId;

    IF @@ROWCOUNT = 0
    BEGIN
        THROW 51511, 'Offer was not found for this tenant and branch.', 1;
    END;

    SELECT * FROM dbo.BranchOffers WHERE TenantId = @TenantId AND BranchId = @BranchId AND BranchOfferId = @BranchOfferId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.BranchOffer_GetListByBranch
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER,
    @IncludeInactive BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    SELECT *
    FROM dbo.BranchOffers
    WHERE TenantId = @TenantId
      AND BranchId = @BranchId
      AND (@IncludeInactive = 1 OR IsActive = 1)
    ORDER BY DisplayOrder ASC, CreatedAtUtc DESC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.BranchOffer_Deactivate
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER,
    @BranchOfferId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.BranchOffers
    SET
        IsActive = 0,
        UpdatedAtUtc = SYSUTCDATETIME()
    WHERE TenantId = @TenantId
      AND BranchId = @BranchId
      AND BranchOfferId = @BranchOfferId;

    IF @@ROWCOUNT = 0
    BEGIN
        THROW 51511, 'Offer was not found for this tenant and branch.', 1;
    END;
END;
GO

CREATE OR ALTER PROCEDURE dbo.PublicOffers_GetByQrToken
    @QrToken NVARCHAR(80)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        bo.BranchOfferId,
        bo.Title,
        bo.Subtitle,
        bo.DiscountText,
        bo.ImageUrl,
        bo.ImageAltText,
        bo.DisplayOrder
    FROM dbo.BranchTables bt
    INNER JOIN dbo.Branches b ON b.TenantId = bt.TenantId AND b.BranchId = bt.BranchId
    INNER JOIN dbo.BranchOffers bo ON bo.TenantId = bt.TenantId AND bo.BranchId = bt.BranchId
    WHERE bt.QrToken = @QrToken
      AND bt.IsActive = 1
      AND b.IsActive = 1
      AND bo.IsActive = 1
      AND (bo.StartsAtUtc IS NULL OR bo.StartsAtUtc <= SYSUTCDATETIME())
      AND (bo.EndsAtUtc IS NULL OR bo.EndsAtUtc >= SYSUTCDATETIME())
    ORDER BY bo.DisplayOrder ASC, bo.CreatedAtUtc DESC;
END;
GO
