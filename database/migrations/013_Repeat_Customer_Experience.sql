CREATE OR ALTER PROCEDURE dbo.PublicCustomer_LookupByQrToken
    @QrToken NVARCHAR(80),
    @CustomerWhatsApp NVARCHAR(32)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @TenantId UNIQUEIDENTIFIER, @BranchId UNIQUEIDENTIFIER, @TableId UNIQUEIDENTIFIER;

    SELECT @TenantId = bt.TenantId, @BranchId = bt.BranchId, @TableId = bt.TableId
    FROM dbo.BranchTables bt
    INNER JOIN dbo.Branches b ON b.TenantId = bt.TenantId AND b.BranchId = bt.BranchId
    WHERE bt.QrToken = @QrToken
      AND bt.IsActive = 1
      AND b.IsActive = 1;

    IF @TableId IS NULL
    BEGIN
        THROW 51701, 'Active QR table was not found.', 1;
    END;

    DECLARE @CleanCustomerWhatsApp NVARCHAR(32) = NULLIF(LTRIM(RTRIM(@CustomerWhatsApp)), N'');
    DECLARE @NormalizedWhatsApp NVARCHAR(32) = NULL;

    IF @CleanCustomerWhatsApp IS NOT NULL
    BEGIN
        SET @NormalizedWhatsApp = NULLIF(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(@CleanCustomerWhatsApp, N' ', N''), N'+', N''), N'-', N''), N'(', N''), N')', N''), N'.', N''), N'');
    END;

    DECLARE @CustomerId UNIQUEIDENTIFIER = NULL;

    SELECT @CustomerId = c.CustomerId
    FROM dbo.Customers c
    WHERE c.TenantId = @TenantId
      AND c.NormalizedWhatsApp = @NormalizedWhatsApp;

    SELECT
        c.CustomerId,
        c.Name,
        c.WhatsAppNumber,
        c.MarketingConsent,
        c.VisitCount,
        c.TotalOrderCount,
        c.TotalOrderValue,
        c.LastVisitAtUtc
    FROM dbo.Customers c
    WHERE c.CustomerId = @CustomerId;

    DECLARE @RecentOrders TABLE
    (
        OrderId UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        CreatedAtUtc DATETIME2(3) NOT NULL,
        TotalAmount DECIMAL(10, 2) NOT NULL
    );

    IF @CustomerId IS NOT NULL
    BEGIN
        INSERT INTO @RecentOrders (OrderId, CreatedAtUtc, TotalAmount)
        SELECT o.OrderId, o.CreatedAtUtc, o.TotalAmount
        FROM dbo.Orders o
        WHERE o.TenantId = @TenantId
          AND o.CustomerId = @CustomerId
          AND o.OrderStatusCode <> N'Cancelled'
        ORDER BY o.CreatedAtUtc DESC;
    END;

    SELECT OrderId, CreatedAtUtc, TotalAmount
    FROM @RecentOrders
    ORDER BY CreatedAtUtc DESC;

    SELECT
        oi.OrderId,
        oi.MenuItemId,
        oi.MenuItemVariantId,
        oi.MenuItemName,
        oi.VariantName,
        oi.ItemNote,
        oi.Quantity
    FROM dbo.OrderItems oi
    INNER JOIN @RecentOrders recent ON recent.OrderId = oi.OrderId
    INNER JOIN dbo.MenuItems mi ON mi.TenantId = @TenantId
        AND mi.BranchId = @BranchId
        AND mi.MenuItemId = oi.MenuItemId
        AND mi.IsActive = 1
        AND mi.IsAvailable = 1
    LEFT JOIN dbo.MenuItemVariants mv ON mv.TenantId = @TenantId
        AND mv.BranchId = @BranchId
        AND mv.MenuItemId = oi.MenuItemId
        AND mv.MenuItemVariantId = oi.MenuItemVariantId
        AND mv.IsActive = 1
        AND mv.IsAvailable = 1
    WHERE oi.MenuItemVariantId IS NULL
       OR mv.MenuItemVariantId IS NOT NULL
    ORDER BY recent.CreatedAtUtc DESC, oi.CreatedAtUtc ASC, oi.MenuItemName ASC, oi.VariantName ASC;
END;
GO
