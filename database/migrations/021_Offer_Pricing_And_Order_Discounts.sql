IF COL_LENGTH(N'dbo.BranchOffers', N'DiscountTypeCode') IS NULL
BEGIN
    ALTER TABLE dbo.BranchOffers ADD DiscountTypeCode NVARCHAR(32) NOT NULL CONSTRAINT DF_BranchOffers_DiscountTypeCode DEFAULT (N'DisplayOnly');
END;
GO

IF COL_LENGTH(N'dbo.BranchOffers', N'DiscountValue') IS NULL
BEGIN
    ALTER TABLE dbo.BranchOffers ADD DiscountValue DECIMAL(10,2) NOT NULL CONSTRAINT DF_BranchOffers_DiscountValue DEFAULT (0);
END;
GO

IF COL_LENGTH(N'dbo.BranchOffers', N'MinimumOrderAmount') IS NULL
BEGIN
    ALTER TABLE dbo.BranchOffers ADD MinimumOrderAmount DECIMAL(10,2) NOT NULL CONSTRAINT DF_BranchOffers_MinimumOrderAmount DEFAULT (0);
END;
GO

IF COL_LENGTH(N'dbo.BranchOffers', N'MaxDiscountAmount') IS NULL
BEGIN
    ALTER TABLE dbo.BranchOffers ADD MaxDiscountAmount DECIMAL(10,2) NULL;
END;
GO

IF COL_LENGTH(N'dbo.BranchOffers', N'AutoApply') IS NULL
BEGIN
    ALTER TABLE dbo.BranchOffers ADD AutoApply BIT NOT NULL CONSTRAINT DF_BranchOffers_AutoApply DEFAULT (0);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_BranchOffers_DiscountTypeCode')
BEGIN
    ALTER TABLE dbo.BranchOffers ADD CONSTRAINT CK_BranchOffers_DiscountTypeCode CHECK (DiscountTypeCode IN (N'DisplayOnly', N'Percentage', N'FixedAmount'));
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_BranchOffers_DiscountRules')
BEGIN
    ALTER TABLE dbo.BranchOffers ADD CONSTRAINT CK_BranchOffers_DiscountRules CHECK
    (
        DiscountValue >= 0
        AND MinimumOrderAmount >= 0
        AND (MaxDiscountAmount IS NULL OR MaxDiscountAmount >= 0)
        AND (DiscountTypeCode <> N'Percentage' OR DiscountValue <= 100)
        AND (DiscountTypeCode <> N'DisplayOnly' OR (DiscountValue = 0 AND AutoApply = 0))
    );
END;
GO

IF COL_LENGTH(N'dbo.Orders', N'AppliedBranchOfferId') IS NULL
BEGIN
    ALTER TABLE dbo.Orders ADD AppliedBranchOfferId UNIQUEIDENTIFIER NULL;
END;
GO

IF COL_LENGTH(N'dbo.Orders', N'AppliedOfferTitle') IS NULL
BEGIN
    ALTER TABLE dbo.Orders ADD AppliedOfferTitle NVARCHAR(160) NULL;
END;
GO

IF COL_LENGTH(N'dbo.Orders', N'AppliedOfferDiscountAmount') IS NULL
BEGIN
    ALTER TABLE dbo.Orders ADD AppliedOfferDiscountAmount DECIMAL(10,2) NOT NULL CONSTRAINT DF_Orders_AppliedOfferDiscountAmount DEFAULT (0);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_Orders_AppliedOfferDiscountAmount')
BEGIN
    ALTER TABLE dbo.Orders ADD CONSTRAINT CK_Orders_AppliedOfferDiscountAmount CHECK (AppliedOfferDiscountAmount >= 0 AND AppliedOfferDiscountAmount <= SubtotalAmount);
END;
GO

IF COL_LENGTH(N'dbo.OrderBills', N'AppliedBranchOfferId') IS NULL
BEGIN
    ALTER TABLE dbo.OrderBills ADD AppliedBranchOfferId UNIQUEIDENTIFIER NULL;
END;
GO

IF COL_LENGTH(N'dbo.OrderBills', N'AppliedOfferTitle') IS NULL
BEGIN
    ALTER TABLE dbo.OrderBills ADD AppliedOfferTitle NVARCHAR(160) NULL;
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
    @EndsAtUtc DATETIME2(3) = NULL,
    @DiscountTypeCode NVARCHAR(32) = N'DisplayOnly',
    @DiscountValue DECIMAL(10,2) = 0,
    @MinimumOrderAmount DECIMAL(10,2) = 0,
    @MaxDiscountAmount DECIMAL(10,2) = NULL,
    @AutoApply BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Branches WHERE TenantId = @TenantId AND BranchId = @BranchId AND IsActive = 1)
    BEGIN
        THROW 51401, 'Active branch was not found for this tenant.', 1;
    END;

    IF @DiscountTypeCode NOT IN (N'DisplayOnly', N'Percentage', N'FixedAmount')
    BEGIN
        THROW 51512, 'Offer discount type is invalid.', 1;
    END;

    IF @DiscountValue < 0 OR @MinimumOrderAmount < 0 OR (@MaxDiscountAmount IS NOT NULL AND @MaxDiscountAmount < 0)
    BEGIN
        THROW 51513, 'Offer amounts cannot be negative.', 1;
    END;

    IF @DiscountTypeCode = N'Percentage' AND @DiscountValue > 100
    BEGIN
        THROW 51514, 'Percentage offer cannot exceed 100.', 1;
    END;

    IF @DiscountTypeCode = N'DisplayOnly'
    BEGIN
        SET @DiscountValue = 0;
        SET @MinimumOrderAmount = 0;
        SET @MaxDiscountAmount = NULL;
        SET @AutoApply = 0;
    END;

    INSERT INTO dbo.BranchOffers
    (
        BranchOfferId, TenantId, BranchId, Title, Subtitle, DiscountText, ImageUrl, ImageAltText,
        DisplayOrder, StartsAtUtc, EndsAtUtc, DiscountTypeCode, DiscountValue, MinimumOrderAmount,
        MaxDiscountAmount, AutoApply
    )
    VALUES
    (
        @BranchOfferId, @TenantId, @BranchId, @Title, @Subtitle, @DiscountText, @ImageUrl, @ImageAltText,
        @DisplayOrder, @StartsAtUtc, @EndsAtUtc, @DiscountTypeCode, @DiscountValue, @MinimumOrderAmount,
        @MaxDiscountAmount, @AutoApply
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
    @IsActive BIT,
    @DiscountTypeCode NVARCHAR(32) = N'DisplayOnly',
    @DiscountValue DECIMAL(10,2) = 0,
    @MinimumOrderAmount DECIMAL(10,2) = 0,
    @MaxDiscountAmount DECIMAL(10,2) = NULL,
    @AutoApply BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    IF @DiscountTypeCode NOT IN (N'DisplayOnly', N'Percentage', N'FixedAmount')
    BEGIN
        THROW 51512, 'Offer discount type is invalid.', 1;
    END;

    IF @DiscountValue < 0 OR @MinimumOrderAmount < 0 OR (@MaxDiscountAmount IS NOT NULL AND @MaxDiscountAmount < 0)
    BEGIN
        THROW 51513, 'Offer amounts cannot be negative.', 1;
    END;

    IF @DiscountTypeCode = N'Percentage' AND @DiscountValue > 100
    BEGIN
        THROW 51514, 'Percentage offer cannot exceed 100.', 1;
    END;

    IF @DiscountTypeCode = N'DisplayOnly'
    BEGIN
        SET @DiscountValue = 0;
        SET @MinimumOrderAmount = 0;
        SET @MaxDiscountAmount = NULL;
        SET @AutoApply = 0;
    END;

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
        DiscountTypeCode = @DiscountTypeCode,
        DiscountValue = @DiscountValue,
        MinimumOrderAmount = @MinimumOrderAmount,
        MaxDiscountAmount = @MaxDiscountAmount,
        AutoApply = @AutoApply,
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
        bo.DisplayOrder,
        bo.DiscountTypeCode,
        bo.DiscountValue,
        bo.MinimumOrderAmount,
        bo.MaxDiscountAmount,
        bo.AutoApply
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

    DECLARE @AppliedBranchOfferId UNIQUEIDENTIFIER = NULL;
    DECLARE @AppliedOfferTitle NVARCHAR(160) = NULL;
    DECLARE @AppliedOfferDiscountAmount DECIMAL(10,2) = 0;

    ;WITH EligibleOffers AS
    (
        SELECT
            bo.BranchOfferId,
            bo.Title,
            CASE
                WHEN bo.DiscountTypeCode = N'Percentage'
                    THEN ROUND(@SubtotalAmount * bo.DiscountValue / 100, 2)
                WHEN bo.DiscountTypeCode = N'FixedAmount'
                    THEN bo.DiscountValue
                ELSE 0
            END AS RawDiscount,
            bo.MaxDiscountAmount,
            bo.DisplayOrder,
            bo.CreatedAtUtc
        FROM dbo.BranchOffers bo
        WHERE bo.TenantId = @TenantId
          AND bo.BranchId = @BranchId
          AND bo.IsActive = 1
          AND bo.AutoApply = 1
          AND bo.DiscountTypeCode IN (N'Percentage', N'FixedAmount')
          AND bo.DiscountValue > 0
          AND @SubtotalAmount >= bo.MinimumOrderAmount
          AND (bo.StartsAtUtc IS NULL OR bo.StartsAtUtc <= SYSUTCDATETIME())
          AND (bo.EndsAtUtc IS NULL OR bo.EndsAtUtc >= SYSUTCDATETIME())
    ),
    CalculatedOffers AS
    (
        SELECT
            BranchOfferId,
            Title,
            CASE
                WHEN MaxDiscountAmount IS NOT NULL AND RawDiscount > MaxDiscountAmount THEN MaxDiscountAmount
                WHEN RawDiscount > @SubtotalAmount THEN @SubtotalAmount
                ELSE RawDiscount
            END AS DiscountAmount,
            DisplayOrder,
            CreatedAtUtc
        FROM EligibleOffers
    )
    SELECT TOP (1)
        @AppliedBranchOfferId = BranchOfferId,
        @AppliedOfferTitle = Title,
        @AppliedOfferDiscountAmount = DiscountAmount
    FROM CalculatedOffers
    WHERE DiscountAmount > 0
    ORDER BY DiscountAmount DESC, DisplayOrder ASC, CreatedAtUtc DESC;

    SET @AppliedOfferDiscountAmount = COALESCE(@AppliedOfferDiscountAmount, 0);

    DECLARE
        @TaxEnabled BIT = 0,
        @TaxRate DECIMAL(6,3) = 0,
        @TaxMode NVARCHAR(20) = N'Exclusive',
        @ServiceChargeEnabled BIT = 0,
        @ServiceChargeRate DECIMAL(6,3) = 0,
        @RoundingMode NVARCHAR(20) = N'NearestRupee';

    SELECT
        @TaxEnabled = TaxEnabled,
        @TaxRate = TaxRate,
        @TaxMode = TaxMode,
        @ServiceChargeEnabled = ServiceChargeEnabled,
        @ServiceChargeRate = ServiceChargeRate,
        @RoundingMode = RoundingMode
    FROM dbo.BranchBillingSettings
    WHERE TenantId = @TenantId AND BranchId = @BranchId;

    DECLARE @TaxableAmount DECIMAL(10,2) = @SubtotalAmount - @AppliedOfferDiscountAmount;
    DECLARE @TaxAmount DECIMAL(10,2) = 0;
    DECLARE @ServiceChargeAmount DECIMAL(10,2) = 0;

    IF @TaxEnabled = 1 AND @TaxRate > 0
    BEGIN
        SET @TaxAmount = CASE WHEN @TaxMode = N'Inclusive'
            THEN ROUND(@TaxableAmount - (@TaxableAmount / (1 + (@TaxRate / 100))), 2)
            ELSE ROUND(@TaxableAmount * @TaxRate / 100, 2)
        END;
    END;

    IF @ServiceChargeEnabled = 1 AND @ServiceChargeRate > 0
    BEGIN
        SET @ServiceChargeAmount = ROUND(@TaxableAmount * @ServiceChargeRate / 100, 2);
    END;

    DECLARE @TotalBeforeRounding DECIMAL(10,2) = CASE WHEN @TaxMode = N'Inclusive' THEN @TaxableAmount ELSE @TaxableAmount + @TaxAmount END + @ServiceChargeAmount;
    DECLARE @TotalAmount DECIMAL(10,2) = CASE WHEN @RoundingMode = N'NearestRupee' THEN ROUND(@TotalBeforeRounding, 0) ELSE @TotalBeforeRounding END;

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
                CustomerId, TenantId, FirstBranchId, LastBranchId, Name, WhatsAppNumber, NormalizedWhatsApp,
                MarketingConsent, MarketingConsentAtUtc, MarketingConsentSource, FirstVisitAtUtc, LastVisitAtUtc,
                VisitCount, TotalOrderCount, TotalOrderValue, CreatedAtUtc
            )
            VALUES
            (
                @CustomerId, @TenantId, @BranchId, @BranchId, @CleanCustomerName, @CleanCustomerWhatsApp, @NormalizedWhatsApp,
                COALESCE(@MarketingConsent, 0), CASE WHEN COALESCE(@MarketingConsent, 0) = 1 THEN @NowUtc ELSE NULL END,
                CASE WHEN COALESCE(@MarketingConsent, 0) = 1 THEN NULLIF(LTRIM(RTRIM(@MarketingConsentSource)), N'') ELSE NULL END,
                @NowUtc, @NowUtc, 1, 1, @TotalAmount, @NowUtc
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
                TotalOrderValue = TotalOrderValue + @TotalAmount,
                UpdatedAtUtc = @NowUtc
            WHERE CustomerId = @CustomerId;
        END;
    END;

    INSERT INTO dbo.Orders
    (
        OrderId, TenantId, BranchId, TableId, CustomerId, OrderStatusCode, CustomerName, CustomerWhatsApp, Notes,
        SubtotalAmount, TotalAmount, AppliedBranchOfferId, AppliedOfferTitle, AppliedOfferDiscountAmount
    )
    VALUES
    (
        @OrderId, @TenantId, @BranchId, @TableId, @CustomerId, N'Placed', @CleanCustomerName, @CleanCustomerWhatsApp,
        NULLIF(LTRIM(RTRIM(@Notes)), N''), @SubtotalAmount, @TotalAmount, @AppliedBranchOfferId, @AppliedOfferTitle,
        @AppliedOfferDiscountAmount
    );

    INSERT INTO dbo.OrderItems (OrderItemId, TenantId, BranchId, OrderId, MenuItemId, MenuItemVariantId, MenuItemName, VariantName, ItemNote, UnitPrice, Quantity, LineTotal)
    SELECT OrderItemId, @TenantId, @BranchId, @OrderId, MenuItemId, MenuItemVariantId, MenuItemName, VariantName, ItemNote, UnitPrice, Quantity, LineTotal
    FROM @PricedItems;

    COMMIT TRANSACTION;

    EXEC dbo.PublicOrder_GetByQrToken @QrToken = @QrToken, @OrderId = @OrderId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.PublicOrder_GetByQrToken
    @QrToken NVARCHAR(80),
    @OrderId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

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
        o.AppliedBranchOfferId,
        o.AppliedOfferTitle,
        o.AppliedOfferDiscountAmount,
        o.CreatedAtUtc,
        o.UpdatedAtUtc
    FROM dbo.Orders o
    INNER JOIN dbo.BranchTables bt ON bt.TenantId = o.TenantId AND bt.BranchId = o.BranchId AND bt.TableId = o.TableId
    WHERE bt.QrToken = @QrToken
      AND bt.IsActive = 1
      AND o.OrderId = @OrderId;

    SELECT OrderItemId, OrderId, MenuItemId, MenuItemVariantId, MenuItemName, VariantName, ItemNote, UnitPrice, Quantity, LineTotal
    FROM dbo.OrderItems
    WHERE OrderId = @OrderId
    ORDER BY CreatedAtUtc ASC, MenuItemName ASC, VariantName ASC;
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
        o.AppliedBranchOfferId,
        o.AppliedOfferTitle,
        o.AppliedOfferDiscountAmount,
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

CREATE OR ALTER PROCEDURE dbo.AdminOrder_UpdateStatus
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER,
    @OrderId UNIQUEIDENTIFIER,
    @OrderStatusCode NVARCHAR(32),
    @Reason NVARCHAR(300) = NULL,
    @ChangedByUserId UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @OrderStatusCode NOT IN (N'Placed', N'Accepted', N'Preparing', N'Ready', N'Served', N'Completed', N'Cancelled')
    BEGIN
        THROW 51707, 'Order status is invalid.', 1;
    END;

    DECLARE @OldStatusCode NVARCHAR(32);
    DECLARE @CleanReason NVARCHAR(300) = NULLIF(LTRIM(RTRIM(@Reason)), N'');

    BEGIN TRANSACTION;

    SELECT @OldStatusCode = OrderStatusCode
    FROM dbo.Orders WITH (UPDLOCK, HOLDLOCK)
    WHERE TenantId = @TenantId
      AND BranchId = @BranchId
      AND OrderId = @OrderId;

    IF @OldStatusCode IS NULL
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 51708, 'Order was not found for this tenant and branch.', 1;
    END;

    IF @OldStatusCode IN (N'Completed', N'Cancelled') AND @OldStatusCode <> @OrderStatusCode
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 51711, 'Completed or cancelled orders cannot be moved to another status.', 1;
    END;

    IF @OrderStatusCode = N'Cancelled' AND @CleanReason IS NULL
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 51712, 'Cancellation reason is required.', 1;
    END;

    IF @OldStatusCode <> @OrderStatusCode
    BEGIN
        UPDATE dbo.Orders
        SET OrderStatusCode = @OrderStatusCode,
            UpdatedAtUtc = SYSUTCDATETIME()
        WHERE TenantId = @TenantId
          AND BranchId = @BranchId
          AND OrderId = @OrderId;

        INSERT INTO dbo.OrderStatusHistory (OrderStatusHistoryId, TenantId, BranchId, OrderId, OldStatusCode, NewStatusCode, Reason, ChangedByUserId)
        VALUES (NEWID(), @TenantId, @BranchId, @OrderId, @OldStatusCode, @OrderStatusCode, @CleanReason, @ChangedByUserId);

        IF @OrderStatusCode = N'Cancelled'
        BEGIN
            DECLARE @CancelledBillId UNIQUEIDENTIFIER;
            DECLARE @CancelledBillOldStatus NVARCHAR(32);

            SELECT
                @CancelledBillId = OrderBillId,
                @CancelledBillOldStatus = PaymentStatusCode
            FROM dbo.OrderBills WITH (UPDLOCK, HOLDLOCK)
            WHERE TenantId = @TenantId
              AND BranchId = @BranchId
              AND OrderId = @OrderId
              AND PaymentStatusCode IN (N'Unpaid', N'PartiallyPaid');

            IF @CancelledBillId IS NOT NULL
            BEGIN
                UPDATE dbo.OrderBills
                SET PaymentStatusCode = N'Voided',
                    PaymentMethod = NULL,
                    UpdatedAtUtc = SYSUTCDATETIME()
                WHERE OrderBillId = @CancelledBillId;

                INSERT INTO dbo.OrderBillAuditEntries
                (
                    OrderBillAuditEntryId, TenantId, BranchId, OrderBillId, OrderId, ChangedByUserId,
                    ChangeTypeCode, OldValue, NewValue, Reason
                )
                VALUES
                (
                    NEWID(), @TenantId, @BranchId, @CancelledBillId, @OrderId, @ChangedByUserId,
                    N'BillVoidedByOrderCancellation',
                    @CancelledBillOldStatus,
                    N'Voided',
                    @CleanReason
                );
            END;
        END;
    END;

    COMMIT TRANSACTION;

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
        o.AppliedBranchOfferId,
        o.AppliedOfferTitle,
        o.AppliedOfferDiscountAmount,
        o.CreatedAtUtc,
        o.UpdatedAtUtc
    FROM dbo.Orders o
    INNER JOIN dbo.BranchTables bt ON bt.TenantId = o.TenantId AND bt.BranchId = o.BranchId AND bt.TableId = o.TableId
    WHERE o.TenantId = @TenantId
      AND o.BranchId = @BranchId
      AND o.OrderId = @OrderId;

    SELECT OrderItemId, OrderId, MenuItemId, MenuItemVariantId, MenuItemName, VariantName, ItemNote, UnitPrice, Quantity, LineTotal
    FROM dbo.OrderItems
    WHERE TenantId = @TenantId
      AND BranchId = @BranchId
      AND OrderId = @OrderId
    ORDER BY CreatedAtUtc ASC, MenuItemName ASC, VariantName ASC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.OrderBill_GetByOrder
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER,
    @OrderId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT OrderBillId, TenantId, BranchId, OrderId, BillNumber, PaymentStatusCode, PaymentMethod,
           SubtotalAmount, DiscountAmount, TaxableAmount, TaxAmount, ServiceChargeAmount, RoundingAmount, TotalAmount,
           TaxEnabled, TaxName, TaxRate, TaxMode, ServiceChargeEnabled, ServiceChargeName, ServiceChargeRate,
           DiscountEnabled, AppliedBranchOfferId, AppliedOfferTitle, RefundStatusCode, RefundAmount, RefundReason, RefundedAtUtc,
           CreatedAtUtc, UpdatedAtUtc
    FROM dbo.OrderBills
    WHERE TenantId = @TenantId AND BranchId = @BranchId AND OrderId = @OrderId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.OrderBill_Generate
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER,
    @OrderId UNIQUEIDENTIFIER,
    @DiscountAmount DECIMAL(10,2),
    @ServiceChargeAmount DECIMAL(10,2),
    @OverrideReason NVARCHAR(300) = NULL,
    @ChangedByUserId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE
        @Subtotal DECIMAL(10,2),
        @AppliedBranchOfferId UNIQUEIDENTIFIER,
        @AppliedOfferTitle NVARCHAR(160),
        @AppliedOfferDiscountAmount DECIMAL(10,2);

    SELECT
        @Subtotal = SubtotalAmount,
        @AppliedBranchOfferId = AppliedBranchOfferId,
        @AppliedOfferTitle = AppliedOfferTitle,
        @AppliedOfferDiscountAmount = AppliedOfferDiscountAmount
    FROM dbo.Orders
    WHERE TenantId = @TenantId AND BranchId = @BranchId AND OrderId = @OrderId;

    IF @Subtotal IS NULL
    BEGIN
        THROW 51000, 'Order was not found for this tenant and branch.', 1;
    END;

    IF @DiscountAmount <= 0 AND COALESCE(@AppliedOfferDiscountAmount, 0) > 0
    BEGIN
        SET @DiscountAmount = @AppliedOfferDiscountAmount;
    END;

    DECLARE
        @TaxEnabled BIT = 0,
        @TaxName NVARCHAR(40) = N'GST',
        @TaxRate DECIMAL(6,3) = 0,
        @TaxMode NVARCHAR(20) = N'Exclusive',
        @ServiceChargeEnabled BIT = 0,
        @ServiceChargeName NVARCHAR(60) = N'Service charge',
        @ServiceChargeRate DECIMAL(6,3) = 0,
        @DiscountEnabled BIT = 1,
        @RoundingMode NVARCHAR(20) = N'NearestRupee';

    SELECT
        @TaxEnabled = TaxEnabled,
        @TaxName = TaxName,
        @TaxRate = TaxRate,
        @TaxMode = TaxMode,
        @ServiceChargeEnabled = ServiceChargeEnabled,
        @ServiceChargeName = ServiceChargeName,
        @ServiceChargeRate = ServiceChargeRate,
        @DiscountEnabled = DiscountEnabled,
        @RoundingMode = RoundingMode
    FROM dbo.BranchBillingSettings
    WHERE TenantId = @TenantId AND BranchId = @BranchId;

    IF @DiscountEnabled = 0
    BEGIN
        SET @DiscountAmount = 0;
        SET @AppliedBranchOfferId = NULL;
        SET @AppliedOfferTitle = NULL;
    END;

    IF @ServiceChargeEnabled = 0
    BEGIN
        SET @ServiceChargeAmount = 0;
    END;

    IF @DiscountAmount > @Subtotal
    BEGIN
        THROW 51000, 'Discount cannot exceed subtotal.', 1;
    END;

    DECLARE @TaxableAmount DECIMAL(10,2) = @Subtotal - @DiscountAmount;
    DECLARE @TaxAmount DECIMAL(10,2) = 0;

    IF @TaxEnabled = 1 AND @TaxRate > 0
    BEGIN
        IF @TaxMode = N'Inclusive'
        BEGIN
            SET @TaxAmount = ROUND(@TaxableAmount - (@TaxableAmount / (1 + (@TaxRate / 100))), 2);
        END
        ELSE
        BEGIN
            SET @TaxAmount = ROUND(@TaxableAmount * @TaxRate / 100, 2);
        END;
    END;

    DECLARE @TotalBeforeRounding DECIMAL(10,2);
    DECLARE @RoundedTotal DECIMAL(10,2);
    DECLARE @RoundingAmount DECIMAL(10,2);
    DECLARE @OrderBillId UNIQUEIDENTIFIER;
    DECLARE @BillNumber NVARCHAR(40);
    DECLARE @OldTotal NVARCHAR(200);

    SET @TotalBeforeRounding = CASE WHEN @TaxMode = N'Inclusive' THEN @TaxableAmount ELSE @TaxableAmount + @TaxAmount END + @ServiceChargeAmount;
    SET @RoundedTotal = CASE WHEN @RoundingMode = N'NearestRupee' THEN ROUND(@TotalBeforeRounding, 0) ELSE @TotalBeforeRounding END;
    SET @RoundingAmount = @RoundedTotal - @TotalBeforeRounding;

    SELECT @OrderBillId = OrderBillId,
           @BillNumber = BillNumber,
           @OldTotal = CONVERT(NVARCHAR(200), TotalAmount)
    FROM dbo.OrderBills
    WHERE TenantId = @TenantId AND OrderId = @OrderId;

    SET @OrderBillId = COALESCE(@OrderBillId, NEWID());
    SET @BillNumber = COALESCE(@BillNumber, CONCAT(N'BILL-', RIGHT(REPLACE(CONVERT(NVARCHAR(36), @OrderId), N'-', N''), 8)));

    IF EXISTS (SELECT 1 FROM dbo.OrderBills WHERE TenantId = @TenantId AND OrderId = @OrderId)
    BEGIN
        UPDATE dbo.OrderBills
        SET PaymentStatusCode = CASE WHEN PaymentStatusCode = N'Voided' THEN N'Unpaid' ELSE PaymentStatusCode END,
            SubtotalAmount = @Subtotal,
            DiscountAmount = @DiscountAmount,
            TaxableAmount = @TaxableAmount,
            TaxAmount = @TaxAmount,
            ServiceChargeAmount = @ServiceChargeAmount,
            RoundingAmount = @RoundingAmount,
            TotalAmount = @RoundedTotal,
            TaxEnabled = @TaxEnabled,
            TaxName = @TaxName,
            TaxRate = @TaxRate,
            TaxMode = @TaxMode,
            ServiceChargeEnabled = @ServiceChargeEnabled,
            ServiceChargeName = @ServiceChargeName,
            ServiceChargeRate = @ServiceChargeRate,
            DiscountEnabled = @DiscountEnabled,
            AppliedBranchOfferId = CASE WHEN @DiscountAmount = @AppliedOfferDiscountAmount THEN @AppliedBranchOfferId ELSE NULL END,
            AppliedOfferTitle = CASE WHEN @DiscountAmount = @AppliedOfferDiscountAmount THEN @AppliedOfferTitle ELSE NULL END,
            UpdatedAtUtc = SYSUTCDATETIME()
        WHERE TenantId = @TenantId AND OrderId = @OrderId;
    END
    ELSE
    BEGIN
        INSERT INTO dbo.OrderBills
        (
            OrderBillId, TenantId, BranchId, OrderId, BillNumber, SubtotalAmount, DiscountAmount, TaxableAmount,
            TaxAmount, ServiceChargeAmount, RoundingAmount, TotalAmount, TaxEnabled, TaxName, TaxRate, TaxMode,
            ServiceChargeEnabled, ServiceChargeName, ServiceChargeRate, DiscountEnabled, AppliedBranchOfferId, AppliedOfferTitle
        )
        VALUES
        (
            @OrderBillId, @TenantId, @BranchId, @OrderId, @BillNumber, @Subtotal, @DiscountAmount, @TaxableAmount,
            @TaxAmount, @ServiceChargeAmount, @RoundingAmount, @RoundedTotal, @TaxEnabled, @TaxName, @TaxRate, @TaxMode,
            @ServiceChargeEnabled, @ServiceChargeName, @ServiceChargeRate, @DiscountEnabled,
            CASE WHEN @DiscountAmount = @AppliedOfferDiscountAmount THEN @AppliedBranchOfferId ELSE NULL END,
            CASE WHEN @DiscountAmount = @AppliedOfferDiscountAmount THEN @AppliedOfferTitle ELSE NULL END
        );
    END;

    UPDATE dbo.Orders
    SET TotalAmount = @RoundedTotal,
        UpdatedAtUtc = SYSUTCDATETIME()
    WHERE TenantId = @TenantId AND BranchId = @BranchId AND OrderId = @OrderId;

    INSERT INTO dbo.OrderBillAuditEntries
    (
        OrderBillAuditEntryId, TenantId, BranchId, OrderBillId, OrderId, ChangedByUserId,
        ChangeTypeCode, OldValue, NewValue, Reason
    )
    VALUES
    (
        NEWID(), @TenantId, @BranchId, @OrderBillId, @OrderId, @ChangedByUserId,
        N'BillGenerated', @OldTotal, CONVERT(NVARCHAR(200), @RoundedTotal), @OverrideReason
    );

    EXEC dbo.OrderBill_GetByOrder @TenantId = @TenantId, @BranchId = @BranchId, @OrderId = @OrderId;
END;
GO
