IF OBJECT_ID(N'dbo.BranchBillingSettings', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.BranchBillingSettings
    (
        BranchBillingSettingsId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_BranchBillingSettings PRIMARY KEY,
        RowId BIGINT IDENTITY(1,1) NOT NULL,
        TenantId UNIQUEIDENTIFIER NOT NULL,
        BranchId UNIQUEIDENTIFIER NOT NULL,
        TaxEnabled BIT NOT NULL CONSTRAINT DF_BranchBillingSettings_TaxEnabled DEFAULT (0),
        TaxName NVARCHAR(40) NOT NULL CONSTRAINT DF_BranchBillingSettings_TaxName DEFAULT (N'GST'),
        TaxRate DECIMAL(6,3) NOT NULL CONSTRAINT DF_BranchBillingSettings_TaxRate DEFAULT (0),
        TaxMode NVARCHAR(20) NOT NULL CONSTRAINT DF_BranchBillingSettings_TaxMode DEFAULT (N'Exclusive'),
        ServiceChargeEnabled BIT NOT NULL CONSTRAINT DF_BranchBillingSettings_ServiceChargeEnabled DEFAULT (0),
        ServiceChargeName NVARCHAR(60) NOT NULL CONSTRAINT DF_BranchBillingSettings_ServiceChargeName DEFAULT (N'Service charge'),
        ServiceChargeRate DECIMAL(6,3) NOT NULL CONSTRAINT DF_BranchBillingSettings_ServiceChargeRate DEFAULT (0),
        DiscountEnabled BIT NOT NULL CONSTRAINT DF_BranchBillingSettings_DiscountEnabled DEFAULT (1),
        StaffCanApplyDiscount BIT NOT NULL CONSTRAINT DF_BranchBillingSettings_StaffCanApplyDiscount DEFAULT (0),
        RoundingMode NVARCHAR(20) NOT NULL CONSTRAINT DF_BranchBillingSettings_RoundingMode DEFAULT (N'NearestRupee'),
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_BranchBillingSettings_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
        UpdatedAtUtc DATETIME2(3) NULL,
        RowVersion ROWVERSION NOT NULL,
        CONSTRAINT FK_BranchBillingSettings_Tenants FOREIGN KEY (TenantId) REFERENCES dbo.Tenants (TenantId),
        CONSTRAINT FK_BranchBillingSettings_Branches FOREIGN KEY (BranchId) REFERENCES dbo.Branches (BranchId),
        CONSTRAINT UQ_BranchBillingSettings_TenantId_BranchId UNIQUE (TenantId, BranchId),
        CONSTRAINT CK_BranchBillingSettings_TaxRate CHECK (TaxRate >= 0 AND TaxRate <= 100),
        CONSTRAINT CK_BranchBillingSettings_ServiceChargeRate CHECK (ServiceChargeRate >= 0 AND ServiceChargeRate <= 100),
        CONSTRAINT CK_BranchBillingSettings_TaxMode CHECK (TaxMode IN (N'Exclusive', N'Inclusive')),
        CONSTRAINT CK_BranchBillingSettings_RoundingMode CHECK (RoundingMode IN (N'None', N'NearestRupee'))
    );
END;
GO

IF OBJECT_ID(N'dbo.OrderBills', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OrderBills
    (
        OrderBillId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_OrderBills PRIMARY KEY,
        RowId BIGINT IDENTITY(1,1) NOT NULL,
        TenantId UNIQUEIDENTIFIER NOT NULL,
        BranchId UNIQUEIDENTIFIER NOT NULL,
        OrderId UNIQUEIDENTIFIER NOT NULL,
        BillNumber NVARCHAR(40) NOT NULL,
        PaymentStatusCode NVARCHAR(32) NOT NULL CONSTRAINT DF_OrderBills_PaymentStatusCode DEFAULT (N'Unpaid'),
        PaymentMethod NVARCHAR(80) NULL,
        SubtotalAmount DECIMAL(10,2) NOT NULL,
        DiscountAmount DECIMAL(10,2) NOT NULL CONSTRAINT DF_OrderBills_DiscountAmount DEFAULT (0),
        TaxableAmount DECIMAL(10,2) NOT NULL,
        TaxAmount DECIMAL(10,2) NOT NULL CONSTRAINT DF_OrderBills_TaxAmount DEFAULT (0),
        ServiceChargeAmount DECIMAL(10,2) NOT NULL CONSTRAINT DF_OrderBills_ServiceChargeAmount DEFAULT (0),
        RoundingAmount DECIMAL(10,2) NOT NULL CONSTRAINT DF_OrderBills_RoundingAmount DEFAULT (0),
        TotalAmount DECIMAL(10,2) NOT NULL,
        TaxEnabled BIT NOT NULL,
        TaxName NVARCHAR(40) NOT NULL,
        TaxRate DECIMAL(6,3) NOT NULL,
        TaxMode NVARCHAR(20) NOT NULL,
        ServiceChargeEnabled BIT NOT NULL,
        ServiceChargeName NVARCHAR(60) NOT NULL,
        ServiceChargeRate DECIMAL(6,3) NOT NULL,
        DiscountEnabled BIT NOT NULL,
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_OrderBills_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
        UpdatedAtUtc DATETIME2(3) NULL,
        RowVersion ROWVERSION NOT NULL,
        CONSTRAINT FK_OrderBills_Tenants FOREIGN KEY (TenantId) REFERENCES dbo.Tenants (TenantId),
        CONSTRAINT FK_OrderBills_Branches FOREIGN KEY (BranchId) REFERENCES dbo.Branches (BranchId),
        CONSTRAINT FK_OrderBills_Orders FOREIGN KEY (OrderId) REFERENCES dbo.Orders (OrderId),
        CONSTRAINT UQ_OrderBills_TenantId_OrderId UNIQUE (TenantId, OrderId),
        CONSTRAINT UQ_OrderBills_TenantId_BillNumber UNIQUE (TenantId, BillNumber),
        CONSTRAINT CK_OrderBills_PaymentStatusCode CHECK (PaymentStatusCode IN (N'Unpaid', N'Paid', N'PartiallyPaid', N'Voided')),
        CONSTRAINT CK_OrderBills_Amounts CHECK (SubtotalAmount >= 0 AND DiscountAmount >= 0 AND TaxableAmount >= 0 AND TaxAmount >= 0 AND ServiceChargeAmount >= 0 AND TotalAmount >= 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.OrderBillAuditEntries', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OrderBillAuditEntries
    (
        OrderBillAuditEntryId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_OrderBillAuditEntries PRIMARY KEY,
        RowId BIGINT IDENTITY(1,1) NOT NULL,
        TenantId UNIQUEIDENTIFIER NOT NULL,
        BranchId UNIQUEIDENTIFIER NOT NULL,
        OrderBillId UNIQUEIDENTIFIER NOT NULL,
        OrderId UNIQUEIDENTIFIER NOT NULL,
        ChangedByUserId UNIQUEIDENTIFIER NOT NULL,
        ChangeTypeCode NVARCHAR(40) NOT NULL,
        OldValue NVARCHAR(200) NULL,
        NewValue NVARCHAR(200) NULL,
        Reason NVARCHAR(300) NULL,
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_OrderBillAuditEntries_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_OrderBillAuditEntries_Tenants FOREIGN KEY (TenantId) REFERENCES dbo.Tenants (TenantId),
        CONSTRAINT FK_OrderBillAuditEntries_Branches FOREIGN KEY (BranchId) REFERENCES dbo.Branches (BranchId),
        CONSTRAINT FK_OrderBillAuditEntries_OrderBills FOREIGN KEY (OrderBillId) REFERENCES dbo.OrderBills (OrderBillId),
        CONSTRAINT FK_OrderBillAuditEntries_Orders FOREIGN KEY (OrderId) REFERENCES dbo.Orders (OrderId)
    );
END;
GO

CREATE OR ALTER PROCEDURE dbo.BranchBillingSettings_GetByBranch
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT BranchBillingSettingsId, TenantId, BranchId, TaxEnabled, TaxName, TaxRate, TaxMode,
           ServiceChargeEnabled, ServiceChargeName, ServiceChargeRate, DiscountEnabled, StaffCanApplyDiscount,
           RoundingMode, CreatedAtUtc, UpdatedAtUtc
    FROM dbo.BranchBillingSettings
    WHERE TenantId = @TenantId AND BranchId = @BranchId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.BranchBillingSettings_Save
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER,
    @BranchBillingSettingsId UNIQUEIDENTIFIER,
    @TaxEnabled BIT,
    @TaxName NVARCHAR(40),
    @TaxRate DECIMAL(6,3),
    @TaxMode NVARCHAR(20),
    @ServiceChargeEnabled BIT,
    @ServiceChargeName NVARCHAR(60),
    @ServiceChargeRate DECIMAL(6,3),
    @DiscountEnabled BIT,
    @StaffCanApplyDiscount BIT,
    @RoundingMode NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Branches WHERE TenantId = @TenantId AND BranchId = @BranchId)
    BEGIN
        THROW 51000, 'Branch was not found for this tenant.', 1;
    END;

    IF EXISTS (SELECT 1 FROM dbo.BranchBillingSettings WHERE TenantId = @TenantId AND BranchId = @BranchId)
    BEGIN
        UPDATE dbo.BranchBillingSettings
        SET TaxEnabled = @TaxEnabled,
            TaxName = @TaxName,
            TaxRate = @TaxRate,
            TaxMode = @TaxMode,
            ServiceChargeEnabled = @ServiceChargeEnabled,
            ServiceChargeName = @ServiceChargeName,
            ServiceChargeRate = @ServiceChargeRate,
            DiscountEnabled = @DiscountEnabled,
            StaffCanApplyDiscount = @StaffCanApplyDiscount,
            RoundingMode = @RoundingMode,
            UpdatedAtUtc = SYSUTCDATETIME()
        WHERE TenantId = @TenantId AND BranchId = @BranchId;
    END
    ELSE
    BEGIN
        INSERT INTO dbo.BranchBillingSettings
        (
            BranchBillingSettingsId, TenantId, BranchId, TaxEnabled, TaxName, TaxRate, TaxMode,
            ServiceChargeEnabled, ServiceChargeName, ServiceChargeRate, DiscountEnabled, StaffCanApplyDiscount,
            RoundingMode
        )
        VALUES
        (
            @BranchBillingSettingsId, @TenantId, @BranchId, @TaxEnabled, @TaxName, @TaxRate, @TaxMode,
            @ServiceChargeEnabled, @ServiceChargeName, @ServiceChargeRate, @DiscountEnabled, @StaffCanApplyDiscount,
            @RoundingMode
        );
    END;

    EXEC dbo.BranchBillingSettings_GetByBranch @TenantId = @TenantId, @BranchId = @BranchId;
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
           DiscountEnabled, CreatedAtUtc, UpdatedAtUtc
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

    DECLARE @Subtotal DECIMAL(10,2);
    SELECT @Subtotal = SubtotalAmount
    FROM dbo.Orders
    WHERE TenantId = @TenantId AND BranchId = @BranchId AND OrderId = @OrderId;

    IF @Subtotal IS NULL
    BEGIN
        THROW 51000, 'Order was not found for this tenant and branch.', 1;
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
            UpdatedAtUtc = SYSUTCDATETIME()
        WHERE TenantId = @TenantId AND OrderId = @OrderId;
    END
    ELSE
    BEGIN
        INSERT INTO dbo.OrderBills
        (
            OrderBillId, TenantId, BranchId, OrderId, BillNumber, SubtotalAmount, DiscountAmount, TaxableAmount,
            TaxAmount, ServiceChargeAmount, RoundingAmount, TotalAmount, TaxEnabled, TaxName, TaxRate, TaxMode,
            ServiceChargeEnabled, ServiceChargeName, ServiceChargeRate, DiscountEnabled
        )
        VALUES
        (
            @OrderBillId, @TenantId, @BranchId, @OrderId, @BillNumber, @Subtotal, @DiscountAmount, @TaxableAmount,
            @TaxAmount, @ServiceChargeAmount, @RoundingAmount, @RoundedTotal, @TaxEnabled, @TaxName, @TaxRate, @TaxMode,
            @ServiceChargeEnabled, @ServiceChargeName, @ServiceChargeRate, @DiscountEnabled
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

CREATE OR ALTER PROCEDURE dbo.OrderBill_UpdatePaymentStatus
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER,
    @OrderId UNIQUEIDENTIFIER,
    @PaymentStatusCode NVARCHAR(32),
    @PaymentMethod NVARCHAR(80) = NULL,
    @Reason NVARCHAR(300) = NULL,
    @ChangedByUserId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @OrderBillId UNIQUEIDENTIFIER;
    DECLARE @OldStatus NVARCHAR(200);

    SELECT @OrderBillId = OrderBillId, @OldStatus = PaymentStatusCode
    FROM dbo.OrderBills
    WHERE TenantId = @TenantId AND BranchId = @BranchId AND OrderId = @OrderId;

    IF @OrderBillId IS NULL
    BEGIN
        THROW 51000, 'Bill was not found for this order.', 1;
    END;

    UPDATE dbo.OrderBills
    SET PaymentStatusCode = @PaymentStatusCode,
        PaymentMethod = @PaymentMethod,
        UpdatedAtUtc = SYSUTCDATETIME()
    WHERE OrderBillId = @OrderBillId;

    INSERT INTO dbo.OrderBillAuditEntries
    (
        OrderBillAuditEntryId, TenantId, BranchId, OrderBillId, OrderId, ChangedByUserId,
        ChangeTypeCode, OldValue, NewValue, Reason
    )
    VALUES
    (
        NEWID(), @TenantId, @BranchId, @OrderBillId, @OrderId, @ChangedByUserId,
        N'PaymentStatusUpdated', @OldStatus, @PaymentStatusCode, @Reason
    );

    EXEC dbo.OrderBill_GetByOrder @TenantId = @TenantId, @BranchId = @BranchId, @OrderId = @OrderId;
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
        CAST(COALESCE(bbs.TaxEnabled, 0) AS BIT) AS TaxEnabled,
        COALESCE(bbs.TaxName, N'GST') AS TaxName,
        COALESCE(bbs.TaxRate, 0) AS TaxRate,
        COALESCE(bbs.TaxMode, N'Exclusive') AS TaxMode,
        CAST(COALESCE(bbs.ServiceChargeEnabled, 0) AS BIT) AS ServiceChargeEnabled,
        COALESCE(bbs.ServiceChargeName, N'Service charge') AS ServiceChargeName,
        COALESCE(bbs.ServiceChargeRate, 0) AS ServiceChargeRate,
        COALESCE(bbs.RoundingMode, N'NearestRupee') AS RoundingMode,
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
    LEFT JOIN dbo.BranchBillingSettings bbs ON bbs.TenantId = bt.TenantId AND bbs.BranchId = bt.BranchId
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

    DECLARE @TaxAmount DECIMAL(10,2) = 0;
    DECLARE @ServiceChargeAmount DECIMAL(10,2) = 0;

    IF @TaxEnabled = 1 AND @TaxRate > 0
    BEGIN
        SET @TaxAmount = CASE WHEN @TaxMode = N'Inclusive'
            THEN ROUND(@SubtotalAmount - (@SubtotalAmount / (1 + (@TaxRate / 100))), 2)
            ELSE ROUND(@SubtotalAmount * @TaxRate / 100, 2)
        END;
    END;

    IF @ServiceChargeEnabled = 1 AND @ServiceChargeRate > 0
    BEGIN
        SET @ServiceChargeAmount = ROUND(@SubtotalAmount * @ServiceChargeRate / 100, 2);
    END;

    DECLARE @TotalBeforeRounding DECIMAL(10,2) = CASE WHEN @TaxMode = N'Inclusive' THEN @SubtotalAmount ELSE @SubtotalAmount + @TaxAmount END + @ServiceChargeAmount;
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

    INSERT INTO dbo.Orders (OrderId, TenantId, BranchId, TableId, CustomerId, OrderStatusCode, CustomerName, CustomerWhatsApp, Notes, SubtotalAmount, TotalAmount)
    VALUES (@OrderId, @TenantId, @BranchId, @TableId, @CustomerId, N'Placed', @CleanCustomerName, @CleanCustomerWhatsApp, NULLIF(LTRIM(RTRIM(@Notes)), N''), @SubtotalAmount, @TotalAmount);

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
