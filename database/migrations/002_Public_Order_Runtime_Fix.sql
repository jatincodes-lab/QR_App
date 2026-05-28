IF OBJECT_ID(N'dbo.Orders', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Orders
    (
        OrderId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Orders PRIMARY KEY,
        TenantId UNIQUEIDENTIFIER NOT NULL,
        BranchId UNIQUEIDENTIFIER NOT NULL,
        TableId UNIQUEIDENTIFIER NOT NULL,
        OrderStatusCode NVARCHAR(32) NOT NULL CONSTRAINT DF_Orders_OrderStatusCode DEFAULT (N'Placed'),
        CustomerName NVARCHAR(120) NULL,
        CustomerWhatsApp NVARCHAR(32) NULL,
        Notes NVARCHAR(500) NULL,
        SubtotalAmount DECIMAL(10, 2) NOT NULL,
        TotalAmount DECIMAL(10, 2) NOT NULL,
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_Orders_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
        UpdatedAtUtc DATETIME2(3) NULL,
        RowVersion ROWVERSION NOT NULL,
        CONSTRAINT FK_Orders_Tenants FOREIGN KEY (TenantId) REFERENCES dbo.Tenants (TenantId),
        CONSTRAINT FK_Orders_Branches FOREIGN KEY (BranchId) REFERENCES dbo.Branches (BranchId),
        CONSTRAINT FK_Orders_BranchTables FOREIGN KEY (TableId) REFERENCES dbo.BranchTables (TableId),
        CONSTRAINT CK_Orders_SubtotalAmount CHECK (SubtotalAmount >= 0),
        CONSTRAINT CK_Orders_TotalAmount CHECK (TotalAmount >= 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.OrderItems', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OrderItems
    (
        OrderItemId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_OrderItems PRIMARY KEY,
        TenantId UNIQUEIDENTIFIER NOT NULL,
        BranchId UNIQUEIDENTIFIER NOT NULL,
        OrderId UNIQUEIDENTIFIER NOT NULL,
        MenuItemId UNIQUEIDENTIFIER NOT NULL,
        MenuItemName NVARCHAR(160) NOT NULL,
        UnitPrice DECIMAL(10, 2) NOT NULL,
        Quantity INT NOT NULL,
        LineTotal DECIMAL(10, 2) NOT NULL,
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_OrderItems_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
        RowVersion ROWVERSION NOT NULL,
        CONSTRAINT FK_OrderItems_Tenants FOREIGN KEY (TenantId) REFERENCES dbo.Tenants (TenantId),
        CONSTRAINT FK_OrderItems_Branches FOREIGN KEY (BranchId) REFERENCES dbo.Branches (BranchId),
        CONSTRAINT FK_OrderItems_Orders FOREIGN KEY (OrderId) REFERENCES dbo.Orders (OrderId),
        CONSTRAINT FK_OrderItems_MenuItems FOREIGN KEY (MenuItemId) REFERENCES dbo.MenuItems (MenuItemId),
        CONSTRAINT CK_OrderItems_UnitPrice CHECK (UnitPrice >= 0),
        CONSTRAINT CK_OrderItems_Quantity CHECK (Quantity > 0),
        CONSTRAINT CK_OrderItems_LineTotal CHECK (LineTotal >= 0)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Orders_TenantId_BranchId_CreatedAtUtc' AND object_id = OBJECT_ID(N'dbo.Orders'))
BEGIN
    CREATE INDEX IX_Orders_TenantId_BranchId_CreatedAtUtc ON dbo.Orders (TenantId, BranchId, CreatedAtUtc DESC);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Orders_TenantId_BranchId_OrderStatusCode' AND object_id = OBJECT_ID(N'dbo.Orders'))
BEGIN
    CREATE INDEX IX_Orders_TenantId_BranchId_OrderStatusCode ON dbo.Orders (TenantId, BranchId, OrderStatusCode);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_OrderItems_OrderId' AND object_id = OBJECT_ID(N'dbo.OrderItems'))
BEGIN
    CREATE INDEX IX_OrderItems_OrderId ON dbo.OrderItems (OrderId);
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
