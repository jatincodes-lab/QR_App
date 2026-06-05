IF OBJECT_ID(N'dbo.Customers', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Customers
    (
        CustomerId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Customers PRIMARY KEY,
        RowId BIGINT IDENTITY(1,1) NOT NULL,
        TenantId UNIQUEIDENTIFIER NOT NULL,
        FirstBranchId UNIQUEIDENTIFIER NOT NULL,
        LastBranchId UNIQUEIDENTIFIER NOT NULL,
        Name NVARCHAR(120) NULL,
        WhatsAppNumber NVARCHAR(32) NOT NULL,
        NormalizedWhatsApp NVARCHAR(32) NOT NULL,
        MarketingConsent BIT NOT NULL CONSTRAINT DF_Customers_MarketingConsent DEFAULT (0),
        MarketingConsentAtUtc DATETIME2(3) NULL,
        MarketingConsentSource NVARCHAR(80) NULL,
        FirstVisitAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_Customers_FirstVisitAtUtc DEFAULT (SYSUTCDATETIME()),
        LastVisitAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_Customers_LastVisitAtUtc DEFAULT (SYSUTCDATETIME()),
        VisitCount INT NOT NULL CONSTRAINT DF_Customers_VisitCount DEFAULT (0),
        TotalOrderCount INT NOT NULL CONSTRAINT DF_Customers_TotalOrderCount DEFAULT (0),
        TotalOrderValue DECIMAL(18, 2) NOT NULL CONSTRAINT DF_Customers_TotalOrderValue DEFAULT (0),
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_Customers_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
        UpdatedAtUtc DATETIME2(3) NULL,
        RowVersion ROWVERSION NOT NULL,
        CONSTRAINT FK_Customers_Tenants FOREIGN KEY (TenantId) REFERENCES dbo.Tenants (TenantId),
        CONSTRAINT FK_Customers_FirstBranch FOREIGN KEY (FirstBranchId) REFERENCES dbo.Branches (BranchId),
        CONSTRAINT FK_Customers_LastBranch FOREIGN KEY (LastBranchId) REFERENCES dbo.Branches (BranchId),
        CONSTRAINT UQ_Customers_TenantId_NormalizedWhatsApp UNIQUE (TenantId, NormalizedWhatsApp),
        CONSTRAINT CK_Customers_VisitCount CHECK (VisitCount >= 0),
        CONSTRAINT CK_Customers_TotalOrderCount CHECK (TotalOrderCount >= 0),
        CONSTRAINT CK_Customers_TotalOrderValue CHECK (TotalOrderValue >= 0)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Customers_TenantId_LastVisitAtUtc' AND object_id = OBJECT_ID(N'dbo.Customers'))
BEGIN
    CREATE INDEX IX_Customers_TenantId_LastVisitAtUtc
    ON dbo.Customers (TenantId, LastVisitAtUtc DESC);
END;
GO

IF COL_LENGTH(N'dbo.Orders', N'CustomerId') IS NULL
BEGIN
    ALTER TABLE dbo.Orders ADD CustomerId UNIQUEIDENTIFIER NULL;
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Orders_Customers')
BEGIN
    ALTER TABLE dbo.Orders
    ADD CONSTRAINT FK_Orders_Customers FOREIGN KEY (CustomerId) REFERENCES dbo.Customers (CustomerId);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Orders_CustomerId_CreatedAtUtc' AND object_id = OBJECT_ID(N'dbo.Orders'))
BEGIN
    CREATE INDEX IX_Orders_CustomerId_CreatedAtUtc
    ON dbo.Orders (CustomerId, CreatedAtUtc DESC)
    WHERE CustomerId IS NOT NULL;
END;
GO

CREATE OR ALTER PROCEDURE dbo.PublicOrder_CreateFromQrToken
    @QrToken NVARCHAR(80),
    @OrderId UNIQUEIDENTIFIER,
    @CustomerName NVARCHAR(120) = NULL,
    @CustomerWhatsApp NVARCHAR(32) = NULL,
    @Notes NVARCHAR(500) = NULL,
    @ItemsJson NVARCHAR(MAX),
    @MarketingConsent BIT = 0,
    @MarketingConsentSource NVARCHAR(80) = NULL
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

    DECLARE @RequestedItems TABLE (MenuItemId UNIQUEIDENTIFIER NOT NULL, MenuItemVariantId UNIQUEIDENTIFIER NULL, ItemNote NVARCHAR(200) NULL, Quantity INT NOT NULL);

    INSERT INTO @RequestedItems (MenuItemId, MenuItemVariantId, ItemNote, Quantity)
    SELECT parsed.MenuItemId, parsed.MenuItemVariantId, NULLIF(LTRIM(RTRIM(parsed.ItemNote)), N''), SUM(parsed.Quantity)
    FROM OPENJSON(@ItemsJson)
    WITH (MenuItemId UNIQUEIDENTIFIER '$.menuItemId', MenuItemVariantId UNIQUEIDENTIFIER '$.menuItemVariantId', ItemNote NVARCHAR(200) '$.itemNote', Quantity INT '$.quantity') parsed
    WHERE parsed.MenuItemId IS NOT NULL AND parsed.Quantity BETWEEN 1 AND 99
    GROUP BY parsed.MenuItemId, parsed.MenuItemVariantId, NULLIF(LTRIM(RTRIM(parsed.ItemNote)), N'');

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

    DECLARE @PricedItems TABLE (OrderItemId UNIQUEIDENTIFIER NOT NULL, MenuItemId UNIQUEIDENTIFIER NOT NULL, MenuItemVariantId UNIQUEIDENTIFIER NULL, MenuItemName NVARCHAR(160) NOT NULL, VariantName NVARCHAR(80) NULL, ItemNote NVARCHAR(200) NULL, UnitPrice DECIMAL(10, 2) NOT NULL, Quantity INT NOT NULL, LineTotal DECIMAL(10, 2) NOT NULL);

    INSERT INTO @PricedItems (OrderItemId, MenuItemId, MenuItemVariantId, MenuItemName, VariantName, ItemNote, UnitPrice, Quantity, LineTotal)
    SELECT NEWID(), mi.MenuItemId, v.MenuItemVariantId, mi.Name, v.Name, requested.ItemNote, COALESCE(v.Price, mi.Price), requested.Quantity, COALESCE(v.Price, mi.Price) * requested.Quantity
    FROM @RequestedItems requested
    INNER JOIN dbo.MenuItems mi ON mi.TenantId = @TenantId AND mi.BranchId = @BranchId AND mi.MenuItemId = requested.MenuItemId AND mi.IsActive = 1 AND mi.IsAvailable = 1
    LEFT JOIN dbo.MenuItemVariants v ON v.TenantId = @TenantId AND v.BranchId = @BranchId AND v.MenuItemId = mi.MenuItemId AND v.MenuItemVariantId = requested.MenuItemVariantId AND v.IsActive = 1 AND v.IsAvailable = 1
    WHERE requested.MenuItemVariantId IS NULL OR v.MenuItemVariantId IS NOT NULL;

    IF (SELECT COUNT(*) FROM @PricedItems) <> (SELECT COUNT(*) FROM @RequestedItems) THROW 51706, 'One or more menu items are unavailable for ordering.', 1;

    DECLARE @SubtotalAmount DECIMAL(10, 2);
    SELECT @SubtotalAmount = SUM(LineTotal) FROM @PricedItems;

    DECLARE @CleanCustomerName NVARCHAR(120) = NULLIF(LTRIM(RTRIM(@CustomerName)), N'');
    DECLARE @CleanCustomerWhatsApp NVARCHAR(32) = NULLIF(LTRIM(RTRIM(@CustomerWhatsApp)), N'');
    DECLARE @NormalizedWhatsApp NVARCHAR(32) = NULL;
    DECLARE @CustomerId UNIQUEIDENTIFIER = NULL;
    DECLARE @NowUtc DATETIME2(3) = SYSUTCDATETIME();

    IF @CleanCustomerWhatsApp IS NOT NULL
    BEGIN
        SET @NormalizedWhatsApp = NULLIF(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(@CleanCustomerWhatsApp, N' ', N''), N'+', N''), N'-', N''), N'(', N''), N')', N''), N'.', N''), N'');
    END;

    BEGIN TRANSACTION;

    IF @NormalizedWhatsApp IS NOT NULL
    BEGIN
        SELECT @CustomerId = CustomerId
        FROM dbo.Customers WITH (UPDLOCK, HOLDLOCK)
        WHERE TenantId = @TenantId
          AND NormalizedWhatsApp = @NormalizedWhatsApp;

        IF @CustomerId IS NULL
        BEGIN
            SET @CustomerId = NEWID();

            INSERT INTO dbo.Customers
            (
                CustomerId,
                TenantId,
                FirstBranchId,
                LastBranchId,
                Name,
                WhatsAppNumber,
                NormalizedWhatsApp,
                MarketingConsent,
                MarketingConsentAtUtc,
                MarketingConsentSource,
                FirstVisitAtUtc,
                LastVisitAtUtc,
                VisitCount,
                TotalOrderCount,
                TotalOrderValue,
                CreatedAtUtc
            )
            VALUES
            (
                @CustomerId,
                @TenantId,
                @BranchId,
                @BranchId,
                @CleanCustomerName,
                @CleanCustomerWhatsApp,
                @NormalizedWhatsApp,
                COALESCE(@MarketingConsent, 0),
                CASE WHEN COALESCE(@MarketingConsent, 0) = 1 THEN @NowUtc ELSE NULL END,
                CASE WHEN COALESCE(@MarketingConsent, 0) = 1 THEN NULLIF(LTRIM(RTRIM(@MarketingConsentSource)), N'') ELSE NULL END,
                @NowUtc,
                @NowUtc,
                1,
                1,
                @SubtotalAmount,
                @NowUtc
            );
        END
        ELSE
        BEGIN
            UPDATE dbo.Customers
            SET LastBranchId = @BranchId,
                Name = COALESCE(@CleanCustomerName, Name),
                WhatsAppNumber = @CleanCustomerWhatsApp,
                MarketingConsent = CASE WHEN COALESCE(@MarketingConsent, 0) = 1 THEN 1 ELSE MarketingConsent END,
                MarketingConsentAtUtc = CASE WHEN COALESCE(@MarketingConsent, 0) = 1 THEN @NowUtc ELSE MarketingConsentAtUtc END,
                MarketingConsentSource = CASE WHEN COALESCE(@MarketingConsent, 0) = 1 THEN COALESCE(NULLIF(LTRIM(RTRIM(@MarketingConsentSource)), N''), MarketingConsentSource) ELSE MarketingConsentSource END,
                LastVisitAtUtc = @NowUtc,
                VisitCount = VisitCount + 1,
                TotalOrderCount = TotalOrderCount + 1,
                TotalOrderValue = TotalOrderValue + @SubtotalAmount,
                UpdatedAtUtc = @NowUtc
            WHERE CustomerId = @CustomerId;
        END;
    END;

    INSERT INTO dbo.Orders (OrderId, TenantId, BranchId, TableId, CustomerId, OrderStatusCode, CustomerName, CustomerWhatsApp, Notes, SubtotalAmount, TotalAmount)
    VALUES (@OrderId, @TenantId, @BranchId, @TableId, @CustomerId, N'Placed', @CleanCustomerName, @CleanCustomerWhatsApp, NULLIF(LTRIM(RTRIM(@Notes)), N''), @SubtotalAmount, @SubtotalAmount);

    INSERT INTO dbo.OrderItems (OrderItemId, TenantId, BranchId, OrderId, MenuItemId, MenuItemVariantId, MenuItemName, VariantName, ItemNote, UnitPrice, Quantity, LineTotal)
    SELECT OrderItemId, @TenantId, @BranchId, @OrderId, MenuItemId, MenuItemVariantId, MenuItemName, VariantName, ItemNote, UnitPrice, Quantity, LineTotal
    FROM @PricedItems;

    COMMIT TRANSACTION;

    SELECT OrderId, TenantId, BranchId, TableId, OrderStatusCode, CustomerName, CustomerWhatsApp, Notes, SubtotalAmount, TotalAmount, CreatedAtUtc, UpdatedAtUtc
    FROM dbo.Orders
    WHERE OrderId = @OrderId;

    SELECT OrderItemId, OrderId, MenuItemId, MenuItemVariantId, MenuItemName, VariantName, ItemNote, UnitPrice, Quantity, LineTotal
    FROM dbo.OrderItems
    WHERE OrderId = @OrderId
    ORDER BY CreatedAtUtc ASC, MenuItemName ASC, VariantName ASC;
END;
GO
