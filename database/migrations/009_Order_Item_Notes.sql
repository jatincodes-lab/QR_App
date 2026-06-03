IF COL_LENGTH(N'dbo.OrderItems', N'ItemNote') IS NULL
BEGIN
    ALTER TABLE dbo.OrderItems ADD ItemNote NVARCHAR(200) NULL;
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

    BEGIN TRANSACTION;

    INSERT INTO dbo.Orders (OrderId, TenantId, BranchId, TableId, OrderStatusCode, CustomerName, CustomerWhatsApp, Notes, SubtotalAmount, TotalAmount)
    VALUES (@OrderId, @TenantId, @BranchId, @TableId, N'Placed', NULLIF(LTRIM(RTRIM(@CustomerName)), N''), NULLIF(LTRIM(RTRIM(@CustomerWhatsApp)), N''), NULLIF(LTRIM(RTRIM(@Notes)), N''), @SubtotalAmount, @SubtotalAmount);

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

    SELECT OrderItemId, OrderId, MenuItemId, MenuItemVariantId, MenuItemName, VariantName, ItemNote, UnitPrice, Quantity, LineTotal
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

    SELECT oi.OrderItemId, oi.OrderId, oi.MenuItemId, oi.MenuItemVariantId, oi.MenuItemName, oi.VariantName, oi.ItemNote, oi.UnitPrice, oi.Quantity, oi.LineTotal
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
        UpdatedAtUtc = DATEADD(MINUTE, 330, SYSUTCDATETIME())
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

    SELECT OrderItemId, OrderId, MenuItemId, MenuItemVariantId, MenuItemName, VariantName, ItemNote, UnitPrice, Quantity, LineTotal
    FROM dbo.OrderItems
    WHERE TenantId = @TenantId
      AND BranchId = @BranchId
      AND OrderId = @OrderId
    ORDER BY CreatedAtUtc ASC, MenuItemName ASC, VariantName ASC;
END;
GO
