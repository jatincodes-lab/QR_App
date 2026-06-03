IF OBJECT_ID(N'dbo.MenuItemVariants', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.MenuItemVariants
    (
        MenuItemVariantId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_MenuItemVariants PRIMARY KEY,
        TenantId UNIQUEIDENTIFIER NOT NULL,
        BranchId UNIQUEIDENTIFIER NOT NULL,
        MenuItemId UNIQUEIDENTIFIER NOT NULL,
        Name NVARCHAR(80) NOT NULL,
        Price DECIMAL(10, 2) NOT NULL,
        IsAvailable BIT NOT NULL CONSTRAINT DF_MenuItemVariants_IsAvailable DEFAULT (1),
        IsActive BIT NOT NULL CONSTRAINT DF_MenuItemVariants_IsActive DEFAULT (1),
        DisplayOrder INT NOT NULL CONSTRAINT DF_MenuItemVariants_DisplayOrder DEFAULT (0),
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_MenuItemVariants_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
        UpdatedAtUtc DATETIME2(3) NULL,
        CONSTRAINT FK_MenuItemVariants_Tenants FOREIGN KEY (TenantId) REFERENCES dbo.Tenants (TenantId),
        CONSTRAINT FK_MenuItemVariants_Branches FOREIGN KEY (BranchId) REFERENCES dbo.Branches (BranchId),
        CONSTRAINT FK_MenuItemVariants_MenuItems FOREIGN KEY (MenuItemId) REFERENCES dbo.MenuItems (MenuItemId),
        CONSTRAINT CK_MenuItemVariants_Price CHECK (Price >= 0),
        CONSTRAINT CK_MenuItemVariants_DisplayOrder CHECK (DisplayOrder >= 0)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_MenuItemVariants_MenuItemId_IsActive_DisplayOrder' AND object_id = OBJECT_ID(N'dbo.MenuItemVariants'))
BEGIN
    CREATE INDEX IX_MenuItemVariants_MenuItemId_IsActive_DisplayOrder
    ON dbo.MenuItemVariants (MenuItemId, IsActive, DisplayOrder)
    INCLUDE (Name, Price, IsAvailable);
END;
GO

IF COL_LENGTH(N'dbo.OrderItems', N'MenuItemVariantId') IS NULL
BEGIN
    ALTER TABLE dbo.OrderItems ADD MenuItemVariantId UNIQUEIDENTIFIER NULL;
END;
GO

IF COL_LENGTH(N'dbo.OrderItems', N'VariantName') IS NULL
BEGIN
    ALTER TABLE dbo.OrderItems ADD VariantName NVARCHAR(80) NULL;
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
    @ImageAltText NVARCHAR(200) = NULL,
    @VariantsJson NVARCHAR(MAX) = N'[]'
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Branches WHERE TenantId = @TenantId AND BranchId = @BranchId AND IsActive = 1)
    BEGIN
        THROW 51401, 'Active branch was not found for this tenant.', 1;
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.MenuCategories WHERE TenantId = @TenantId AND BranchId = @BranchId AND MenuCategoryId = @MenuCategoryId AND IsActive = 1)
    BEGIN
        THROW 51501, 'Active menu category was not found for this tenant and branch.', 1;
    END;

    IF EXISTS (SELECT 1 FROM dbo.MenuItems WHERE TenantId = @TenantId AND BranchId = @BranchId AND MenuCategoryId = @MenuCategoryId AND Name = @Name)
    BEGIN
        THROW 51502, 'Menu item name already exists for this category.', 1;
    END;

    BEGIN TRANSACTION;

    INSERT INTO dbo.MenuItems (MenuItemId, TenantId, BranchId, MenuCategoryId, Name, Description, Price, IsAvailable, DisplayOrder, ImageUrl, ImageAltText)
    VALUES (@MenuItemId, @TenantId, @BranchId, @MenuCategoryId, @Name, @Description, @Price, @IsAvailable, @DisplayOrder, @ImageUrl, @ImageAltText);

    INSERT INTO dbo.MenuItemVariants (MenuItemVariantId, TenantId, BranchId, MenuItemId, Name, Price, IsAvailable, DisplayOrder)
    SELECT COALESCE(parsed.MenuItemVariantId, NEWID()), @TenantId, @BranchId, @MenuItemId, parsed.Name, parsed.Price, parsed.IsAvailable, parsed.DisplayOrder
    FROM OPENJSON(COALESCE(@VariantsJson, N'[]'))
    WITH
    (
        MenuItemVariantId UNIQUEIDENTIFIER '$.menuItemVariantId',
        Name NVARCHAR(80) '$.name',
        Price DECIMAL(10, 2) '$.price',
        IsAvailable BIT '$.isAvailable',
        DisplayOrder INT '$.displayOrder'
    ) parsed
    WHERE NULLIF(LTRIM(RTRIM(parsed.Name)), N'') IS NOT NULL;

    COMMIT TRANSACTION;

    EXEC dbo.MenuItem_GetOne @TenantId = @TenantId, @BranchId = @BranchId, @MenuItemId = @MenuItemId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.MenuItem_GetOne
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER,
    @MenuItemId UNIQUEIDENTIFIER
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
        mi.ImageAltText,
        JSON_QUERY(COALESCE((
            SELECT
                v.MenuItemVariantId AS menuItemVariantId,
                v.MenuItemId AS menuItemId,
                v.Name AS name,
                v.Price AS price,
                v.IsAvailable AS isAvailable,
                v.IsActive AS isActive,
                v.DisplayOrder AS displayOrder
            FROM dbo.MenuItemVariants v
            WHERE v.TenantId = mi.TenantId
              AND v.BranchId = mi.BranchId
              AND v.MenuItemId = mi.MenuItemId
              AND v.IsActive = 1
            ORDER BY v.DisplayOrder ASC, v.Name ASC
            FOR JSON PATH
        ), N'[]')) AS VariantsJson
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
    @ImageAltText NVARCHAR(200) = NULL,
    @VariantsJson NVARCHAR(MAX) = N'[]'
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.MenuItems WHERE TenantId = @TenantId AND BranchId = @BranchId AND MenuItemId = @MenuItemId)
    BEGIN
        THROW 51503, 'Menu item was not found for this tenant and branch.', 1;
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.MenuCategories WHERE TenantId = @TenantId AND BranchId = @BranchId AND MenuCategoryId = @MenuCategoryId AND IsActive = 1)
    BEGIN
        THROW 51501, 'Active menu category was not found for this tenant and branch.', 1;
    END;

    IF EXISTS (SELECT 1 FROM dbo.MenuItems WHERE TenantId = @TenantId AND BranchId = @BranchId AND MenuCategoryId = @MenuCategoryId AND Name = @Name AND MenuItemId <> @MenuItemId)
    BEGIN
        THROW 51502, 'Menu item name already exists for this category.', 1;
    END;

    DECLARE @RequestedVariants TABLE
    (
        MenuItemVariantId UNIQUEIDENTIFIER NULL,
        Name NVARCHAR(80) NOT NULL,
        Price DECIMAL(10, 2) NOT NULL,
        IsAvailable BIT NOT NULL,
        DisplayOrder INT NOT NULL
    );

    INSERT INTO @RequestedVariants (MenuItemVariantId, Name, Price, IsAvailable, DisplayOrder)
    SELECT parsed.MenuItemVariantId, parsed.Name, parsed.Price, parsed.IsAvailable, parsed.DisplayOrder
    FROM OPENJSON(COALESCE(@VariantsJson, N'[]'))
    WITH
    (
        MenuItemVariantId UNIQUEIDENTIFIER '$.menuItemVariantId',
        Name NVARCHAR(80) '$.name',
        Price DECIMAL(10, 2) '$.price',
        IsAvailable BIT '$.isAvailable',
        DisplayOrder INT '$.displayOrder'
    ) parsed
    WHERE NULLIF(LTRIM(RTRIM(parsed.Name)), N'') IS NOT NULL;

    BEGIN TRANSACTION;

    UPDATE dbo.MenuItems
    SET MenuCategoryId = @MenuCategoryId,
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

    UPDATE existing
    SET IsActive = 0,
        UpdatedAtUtc = SYSUTCDATETIME()
    FROM dbo.MenuItemVariants existing
    WHERE existing.TenantId = @TenantId
      AND existing.BranchId = @BranchId
      AND existing.MenuItemId = @MenuItemId
      AND NOT EXISTS
      (
          SELECT 1
          FROM @RequestedVariants requested
          WHERE requested.MenuItemVariantId = existing.MenuItemVariantId
      );

    UPDATE existing
    SET Name = requested.Name,
        Price = requested.Price,
        IsAvailable = requested.IsAvailable,
        IsActive = 1,
        DisplayOrder = requested.DisplayOrder,
        UpdatedAtUtc = SYSUTCDATETIME()
    FROM dbo.MenuItemVariants existing
    INNER JOIN @RequestedVariants requested ON requested.MenuItemVariantId = existing.MenuItemVariantId
    WHERE existing.TenantId = @TenantId
      AND existing.BranchId = @BranchId
      AND existing.MenuItemId = @MenuItemId;

    INSERT INTO dbo.MenuItemVariants (MenuItemVariantId, TenantId, BranchId, MenuItemId, Name, Price, IsAvailable, DisplayOrder)
    SELECT COALESCE(requested.MenuItemVariantId, NEWID()), @TenantId, @BranchId, @MenuItemId, requested.Name, requested.Price, requested.IsAvailable, requested.DisplayOrder
    FROM @RequestedVariants requested
    WHERE requested.MenuItemVariantId IS NULL
       OR NOT EXISTS
       (
           SELECT 1
           FROM dbo.MenuItemVariants existing
           WHERE existing.TenantId = @TenantId
             AND existing.BranchId = @BranchId
             AND existing.MenuItemId = @MenuItemId
             AND existing.MenuItemVariantId = requested.MenuItemVariantId
       );

    COMMIT TRANSACTION;

    EXEC dbo.MenuItem_GetOne @TenantId = @TenantId, @BranchId = @BranchId, @MenuItemId = @MenuItemId;
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
        mi.ImageAltText,
        JSON_QUERY(COALESCE((
            SELECT
                v.MenuItemVariantId AS menuItemVariantId,
                v.MenuItemId AS menuItemId,
                v.Name AS name,
                v.Price AS price,
                v.IsAvailable AS isAvailable,
                v.IsActive AS isActive,
                v.DisplayOrder AS displayOrder
            FROM dbo.MenuItemVariants v
            WHERE v.TenantId = mi.TenantId
              AND v.BranchId = mi.BranchId
              AND v.MenuItemId = mi.MenuItemId
              AND (@IncludeInactive = 1 OR v.IsActive = 1)
            ORDER BY v.DisplayOrder ASC, v.Name ASC
            FOR JSON PATH
        ), N'[]')) AS VariantsJson
    FROM dbo.MenuItems mi
    INNER JOIN dbo.MenuCategories mc ON mc.MenuCategoryId = mi.MenuCategoryId
    WHERE mi.TenantId = @TenantId
      AND mi.BranchId = @BranchId
      AND (@IncludeInactive = 1 OR mi.IsActive = 1)
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

    DECLARE @TenantId UNIQUEIDENTIFIER, @BranchId UNIQUEIDENTIFIER, @TableId UNIQUEIDENTIFIER, @EnableDirectQrOrdering BIT, @RequireCustomerName BIT, @RequireCustomerWhatsApp BIT;

    SELECT @TenantId = bt.TenantId, @BranchId = bt.BranchId, @TableId = bt.TableId, @EnableDirectQrOrdering = COALESCE(bos.EnableDirectQrOrdering, 0), @RequireCustomerName = COALESCE(bos.RequireCustomerName, 0), @RequireCustomerWhatsApp = COALESCE(bos.RequireCustomerWhatsApp, 0)
    FROM dbo.BranchTables bt
    INNER JOIN dbo.Branches b ON b.TenantId = bt.TenantId AND b.BranchId = bt.BranchId
    LEFT JOIN dbo.BranchOrderSettings bos ON bos.TenantId = bt.TenantId AND bos.BranchId = bt.BranchId
    WHERE bt.QrToken = @QrToken AND bt.IsActive = 1 AND b.IsActive = 1;

    IF @TableId IS NULL THROW 51701, 'Active QR table was not found.', 1;
    IF @EnableDirectQrOrdering = 0 THROW 51702, 'Direct QR ordering is disabled for this branch.', 1;
    IF @RequireCustomerName = 1 AND NULLIF(LTRIM(RTRIM(@CustomerName)), N'') IS NULL THROW 51703, 'Customer name is required for this branch.', 1;
    IF @RequireCustomerWhatsApp = 1 AND NULLIF(LTRIM(RTRIM(@CustomerWhatsApp)), N'') IS NULL THROW 51704, 'Customer WhatsApp is required for this branch.', 1;

    DECLARE @RequestedItems TABLE (MenuItemId UNIQUEIDENTIFIER NOT NULL, MenuItemVariantId UNIQUEIDENTIFIER NULL, Quantity INT NOT NULL);

    INSERT INTO @RequestedItems (MenuItemId, MenuItemVariantId, Quantity)
    SELECT parsed.MenuItemId, parsed.MenuItemVariantId, SUM(parsed.Quantity)
    FROM OPENJSON(@ItemsJson)
    WITH (MenuItemId UNIQUEIDENTIFIER '$.menuItemId', MenuItemVariantId UNIQUEIDENTIFIER '$.menuItemVariantId', Quantity INT '$.quantity') parsed
    WHERE parsed.MenuItemId IS NOT NULL AND parsed.Quantity BETWEEN 1 AND 99
    GROUP BY parsed.MenuItemId, parsed.MenuItemVariantId;

    IF NOT EXISTS (SELECT 1 FROM @RequestedItems) THROW 51705, 'At least one valid order item is required.', 1;

    IF EXISTS
    (
        SELECT 1
        FROM @RequestedItems requested
        INNER JOIN dbo.MenuItems mi ON mi.TenantId = @TenantId AND mi.BranchId = @BranchId AND mi.MenuItemId = requested.MenuItemId
        WHERE EXISTS (SELECT 1 FROM dbo.MenuItemVariants activeVariant WHERE activeVariant.MenuItemId = mi.MenuItemId AND activeVariant.IsActive = 1 AND activeVariant.IsAvailable = 1)
          AND requested.MenuItemVariantId IS NULL
    )
    BEGIN
        THROW 51710, 'One or more menu items require a portion or size selection.', 1;
    END;

    DECLARE @PricedItems TABLE (OrderItemId UNIQUEIDENTIFIER NOT NULL, MenuItemId UNIQUEIDENTIFIER NOT NULL, MenuItemVariantId UNIQUEIDENTIFIER NULL, MenuItemName NVARCHAR(160) NOT NULL, VariantName NVARCHAR(80) NULL, UnitPrice DECIMAL(10, 2) NOT NULL, Quantity INT NOT NULL, LineTotal DECIMAL(10, 2) NOT NULL);

    INSERT INTO @PricedItems (OrderItemId, MenuItemId, MenuItemVariantId, MenuItemName, VariantName, UnitPrice, Quantity, LineTotal)
    SELECT NEWID(), mi.MenuItemId, v.MenuItemVariantId, mi.Name, v.Name, COALESCE(v.Price, mi.Price), requested.Quantity, COALESCE(v.Price, mi.Price) * requested.Quantity
    FROM @RequestedItems requested
    INNER JOIN dbo.MenuItems mi ON mi.TenantId = @TenantId AND mi.BranchId = @BranchId AND mi.MenuItemId = requested.MenuItemId AND mi.IsActive = 1 AND mi.IsAvailable = 1
    LEFT JOIN dbo.MenuItemVariants v ON v.TenantId = @TenantId AND v.BranchId = @BranchId AND v.MenuItemId = mi.MenuItemId AND v.MenuItemVariantId = requested.MenuItemVariantId AND v.IsActive = 1 AND v.IsAvailable = 1
    WHERE requested.MenuItemVariantId IS NULL OR v.MenuItemVariantId IS NOT NULL;

    IF (SELECT COUNT(*) FROM @PricedItems) <> (SELECT COUNT(*) FROM @RequestedItems) THROW 51706, 'One or more menu items are unavailable for ordering.', 1;

    DECLARE @SubtotalAmount DECIMAL(10, 2);
    SELECT @SubtotalAmount = SUM(LineTotal) FROM @PricedItems;

    BEGIN TRANSACTION;

    INSERT INTO dbo.Orders (OrderId, TenantId, BranchId, TableId, OrderStatusCode, CustomerName, CustomerWhatsApp, Notes, SubtotalAmount, TotalAmount)
    VALUES (@OrderId, @TenantId, @BranchId, @TableId, N'Placed', NULLIF(LTRIM(RTRIM(@CustomerName)), N''), NULLIF(LTRIM(RTRIM(@CustomerWhatsApp)), N''), NULLIF(LTRIM(RTRIM(@Notes)), N''), @SubtotalAmount, @SubtotalAmount);

    INSERT INTO dbo.OrderItems (OrderItemId, TenantId, BranchId, OrderId, MenuItemId, MenuItemVariantId, MenuItemName, VariantName, UnitPrice, Quantity, LineTotal)
    SELECT OrderItemId, @TenantId, @BranchId, @OrderId, MenuItemId, MenuItemVariantId, MenuItemName, VariantName, UnitPrice, Quantity, LineTotal
    FROM @PricedItems;

    COMMIT TRANSACTION;

    SELECT OrderId, TenantId, BranchId, TableId, OrderStatusCode, CustomerName, CustomerWhatsApp, Notes, SubtotalAmount, TotalAmount, CreatedAtUtc, UpdatedAtUtc
    FROM dbo.Orders
    WHERE OrderId = @OrderId;

    SELECT OrderItemId, OrderId, MenuItemId, MenuItemVariantId, MenuItemName, VariantName, UnitPrice, Quantity, LineTotal
    FROM dbo.OrderItems
    WHERE OrderId = @OrderId
    ORDER BY CreatedAtUtc ASC, MenuItemName ASC, VariantName ASC;
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
        INNER JOIN dbo.BranchTables bt ON bt.TenantId = o.TenantId AND bt.BranchId = o.BranchId AND bt.TableId = o.TableId
        INNER JOIN dbo.Branches b ON b.TenantId = o.TenantId AND b.BranchId = o.BranchId
        WHERE bt.QrToken = @QrToken AND o.OrderId = @OrderId AND bt.IsActive = 1 AND b.IsActive = 1
    )
    BEGIN
        THROW 51709, 'Order was not found for this QR table.', 1;
    END;

    SELECT o.OrderId, o.TenantId, o.BranchId, o.TableId, o.OrderStatusCode, o.CustomerName, o.CustomerWhatsApp, o.Notes, o.SubtotalAmount, o.TotalAmount, o.CreatedAtUtc, o.UpdatedAtUtc
    FROM dbo.Orders o
    INNER JOIN dbo.BranchTables bt ON bt.TenantId = o.TenantId AND bt.BranchId = o.BranchId AND bt.TableId = o.TableId
    INNER JOIN dbo.Branches b ON b.TenantId = o.TenantId AND b.BranchId = o.BranchId
    WHERE bt.QrToken = @QrToken AND o.OrderId = @OrderId AND bt.IsActive = 1 AND b.IsActive = 1;

    SELECT OrderItemId, OrderId, MenuItemId, MenuItemVariantId, MenuItemName, VariantName, UnitPrice, Quantity, LineTotal
    FROM dbo.OrderItems
    WHERE OrderId = @OrderId
    ORDER BY CreatedAtUtc ASC, MenuItemName ASC, VariantName ASC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.AdminOrder_GetItemsByBranch
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT oi.OrderItemId, oi.OrderId, oi.MenuItemId, oi.MenuItemVariantId, oi.MenuItemName, oi.VariantName, oi.UnitPrice, oi.Quantity, oi.LineTotal
    FROM dbo.OrderItems oi
    INNER JOIN dbo.Orders o ON o.TenantId = oi.TenantId AND o.BranchId = oi.BranchId AND o.OrderId = oi.OrderId
    WHERE oi.TenantId = @TenantId AND oi.BranchId = @BranchId
    ORDER BY oi.CreatedAtUtc ASC, oi.MenuItemName ASC, oi.VariantName ASC;
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
    SET OrderStatusCode = @OrderStatusCode,
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

    SELECT OrderItemId, OrderId, MenuItemId, MenuItemVariantId, MenuItemName, VariantName, UnitPrice, Quantity, LineTotal
    FROM dbo.OrderItems
    WHERE TenantId = @TenantId
      AND BranchId = @BranchId
      AND OrderId = @OrderId
    ORDER BY CreatedAtUtc ASC, MenuItemName ASC, VariantName ASC;
END;
GO
