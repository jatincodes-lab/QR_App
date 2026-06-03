IF OBJECT_ID(N'dbo.OrderStatusHistory', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OrderStatusHistory
    (
        OrderStatusHistoryId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_OrderStatusHistory PRIMARY KEY,
        TenantId UNIQUEIDENTIFIER NOT NULL,
        BranchId UNIQUEIDENTIFIER NOT NULL,
        OrderId UNIQUEIDENTIFIER NOT NULL,
        OldStatusCode NVARCHAR(32) NULL,
        NewStatusCode NVARCHAR(32) NOT NULL,
        Reason NVARCHAR(300) NULL,
        ChangedByUserId UNIQUEIDENTIFIER NULL,
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_OrderStatusHistory_CreatedAtUtc DEFAULT (DATEADD(MINUTE, 330, SYSUTCDATETIME())),
        CONSTRAINT FK_OrderStatusHistory_Orders FOREIGN KEY (OrderId) REFERENCES dbo.Orders (OrderId)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_OrderStatusHistory_OrderId_CreatedAtUtc' AND object_id = OBJECT_ID(N'dbo.OrderStatusHistory'))
BEGIN
    CREATE INDEX IX_OrderStatusHistory_OrderId_CreatedAtUtc
    ON dbo.OrderStatusHistory (OrderId, CreatedAtUtc);
END;
GO

INSERT INTO dbo.OrderStatusHistory (OrderStatusHistoryId, TenantId, BranchId, OrderId, OldStatusCode, NewStatusCode, Reason, ChangedByUserId, CreatedAtUtc)
SELECT NEWID(), o.TenantId, o.BranchId, o.OrderId, NULL, o.OrderStatusCode, NULL, NULL, o.CreatedAtUtc
FROM dbo.Orders o
WHERE NOT EXISTS (SELECT 1 FROM dbo.OrderStatusHistory h WHERE h.OrderId = o.OrderId);
GO

CREATE OR ALTER PROCEDURE dbo.AdminOrder_UpdateStatus
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER,
    @OrderId UNIQUEIDENTIFIER,
    @OrderStatusCode NVARCHAR(32),
    @Reason NVARCHAR(300) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @OrderStatusCode NOT IN (N'Placed', N'Accepted', N'Preparing', N'Ready', N'Served', N'Completed', N'Cancelled')
    BEGIN
        THROW 51707, 'Order status is invalid.', 1;
    END;

    DECLARE @OldStatusCode NVARCHAR(32);

    SELECT @OldStatusCode = OrderStatusCode
    FROM dbo.Orders
    WHERE TenantId = @TenantId
      AND BranchId = @BranchId
      AND OrderId = @OrderId;

    IF @OldStatusCode IS NULL
    BEGIN
        THROW 51708, 'Order was not found for this tenant and branch.', 1;
    END;

    BEGIN TRANSACTION;

    UPDATE dbo.Orders
    SET OrderStatusCode = @OrderStatusCode,
        UpdatedAtUtc = DATEADD(MINUTE, 330, SYSUTCDATETIME())
    WHERE TenantId = @TenantId
      AND BranchId = @BranchId
      AND OrderId = @OrderId;

    INSERT INTO dbo.OrderStatusHistory (OrderStatusHistoryId, TenantId, BranchId, OrderId, OldStatusCode, NewStatusCode, Reason, ChangedByUserId)
    VALUES (NEWID(), @TenantId, @BranchId, @OrderId, @OldStatusCode, @OrderStatusCode, NULLIF(LTRIM(RTRIM(@Reason)), N''), NULL);

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

CREATE OR ALTER PROCEDURE dbo.Report_Orders
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER = NULL,
    @DateFrom DATETIME2(3) = NULL,
    @DateTo DATETIME2(3) = NULL,
    @StatusCode NVARCHAR(32) = NULL,
    @Search NVARCHAR(120) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP (500)
        o.OrderId,
        o.BranchId,
        b.Name AS BranchName,
        o.TableId,
        bt.Name AS TableName,
        o.OrderStatusCode,
        o.CustomerName,
        o.CustomerWhatsApp,
        o.Notes,
        o.TotalAmount,
        COALESCE(SUM(oi.Quantity), 0) AS ItemCount,
        o.CreatedAtUtc,
        o.UpdatedAtUtc,
        MAX(CASE WHEN h.NewStatusCode = N'Accepted' THEN h.CreatedAtUtc END) AS AcceptedAtUtc,
        MAX(CASE WHEN h.NewStatusCode = N'Preparing' THEN h.CreatedAtUtc END) AS PreparingAtUtc,
        MAX(CASE WHEN h.NewStatusCode = N'Ready' THEN h.CreatedAtUtc END) AS ReadyAtUtc,
        MAX(CASE WHEN h.NewStatusCode = N'Served' THEN h.CreatedAtUtc END) AS ServedAtUtc,
        MAX(CASE WHEN h.NewStatusCode = N'Completed' THEN h.CreatedAtUtc END) AS CompletedAtUtc,
        MAX(CASE WHEN h.NewStatusCode = N'Cancelled' THEN h.CreatedAtUtc END) AS CancelledAtUtc,
        latest.Reason AS LatestReason
    FROM dbo.Orders o
    INNER JOIN dbo.Branches b ON b.TenantId = o.TenantId AND b.BranchId = o.BranchId
    INNER JOIN dbo.BranchTables bt ON bt.TenantId = o.TenantId AND bt.BranchId = o.BranchId AND bt.TableId = o.TableId
    LEFT JOIN dbo.OrderItems oi ON oi.TenantId = o.TenantId AND oi.BranchId = o.BranchId AND oi.OrderId = o.OrderId
    LEFT JOIN dbo.OrderStatusHistory h ON h.TenantId = o.TenantId AND h.BranchId = o.BranchId AND h.OrderId = o.OrderId
    OUTER APPLY
    (
        SELECT TOP (1) osh.Reason
        FROM dbo.OrderStatusHistory osh
        WHERE osh.OrderId = o.OrderId AND osh.Reason IS NOT NULL
        ORDER BY osh.CreatedAtUtc DESC
    ) latest
    WHERE o.TenantId = @TenantId
      AND (@BranchId IS NULL OR o.BranchId = @BranchId)
      AND (@DateFrom IS NULL OR o.CreatedAtUtc >= @DateFrom)
      AND (@DateTo IS NULL OR o.CreatedAtUtc < DATEADD(DAY, 1, @DateTo))
      AND (NULLIF(LTRIM(RTRIM(@StatusCode)), N'') IS NULL OR o.OrderStatusCode = @StatusCode)
      AND (
          NULLIF(LTRIM(RTRIM(@Search)), N'') IS NULL
          OR bt.Name LIKE N'%' + @Search + N'%'
          OR o.CustomerName LIKE N'%' + @Search + N'%'
          OR o.CustomerWhatsApp LIKE N'%' + @Search + N'%'
          OR REPLACE(CONVERT(NVARCHAR(36), o.OrderId), N'-', N'') LIKE N'%' + @Search + N'%'
      )
    GROUP BY o.OrderId, o.BranchId, b.Name, o.TableId, bt.Name, o.OrderStatusCode, o.CustomerName, o.CustomerWhatsApp, o.Notes, o.TotalAmount, o.CreatedAtUtc, o.UpdatedAtUtc, latest.Reason
    ORDER BY o.CreatedAtUtc DESC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.Report_OrderSummary
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER = NULL,
    @DateFrom DATETIME2(3) = NULL,
    @DateTo DATETIME2(3) = NULL,
    @StatusCode NVARCHAR(32) = NULL,
    @Search NVARCHAR(120) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    ;WITH Filtered AS
    (
        SELECT o.*
        FROM dbo.Orders o
        INNER JOIN dbo.BranchTables bt ON bt.TenantId = o.TenantId AND bt.BranchId = o.BranchId AND bt.TableId = o.TableId
        WHERE o.TenantId = @TenantId
          AND (@BranchId IS NULL OR o.BranchId = @BranchId)
          AND (@DateFrom IS NULL OR o.CreatedAtUtc >= @DateFrom)
          AND (@DateTo IS NULL OR o.CreatedAtUtc < DATEADD(DAY, 1, @DateTo))
          AND (NULLIF(LTRIM(RTRIM(@StatusCode)), N'') IS NULL OR o.OrderStatusCode = @StatusCode)
          AND (
              NULLIF(LTRIM(RTRIM(@Search)), N'') IS NULL
              OR bt.Name LIKE N'%' + @Search + N'%'
              OR o.CustomerName LIKE N'%' + @Search + N'%'
              OR o.CustomerWhatsApp LIKE N'%' + @Search + N'%'
              OR REPLACE(CONVERT(NVARCHAR(36), o.OrderId), N'-', N'') LIKE N'%' + @Search + N'%'
          )
    ),
    ReadyDurations AS
    (
        SELECT DATEDIFF(MINUTE, MIN(CASE WHEN h.NewStatusCode = N'Accepted' THEN h.CreatedAtUtc END), MIN(CASE WHEN h.NewStatusCode = N'Ready' THEN h.CreatedAtUtc END)) AS ReadyMinutes
        FROM Filtered f
        INNER JOIN dbo.OrderStatusHistory h ON h.OrderId = f.OrderId
        GROUP BY f.OrderId
    )
    SELECT
        COUNT(1) AS TotalOrders,
        SUM(CASE WHEN OrderStatusCode IN (N'Completed', N'Served') THEN 1 ELSE 0 END) AS CompletedOrders,
        SUM(CASE WHEN OrderStatusCode = N'Cancelled' THEN 1 ELSE 0 END) AS CancelledOrders,
        COALESCE(SUM(CASE WHEN OrderStatusCode <> N'Cancelled' THEN TotalAmount ELSE 0 END), 0) AS TotalOrderValue,
        COALESCE(AVG(CASE WHEN OrderStatusCode <> N'Cancelled' THEN TotalAmount END), 0) AS AverageOrderValue,
        COALESCE((SELECT AVG(CAST(ReadyMinutes AS DECIMAL(10, 2))) FROM ReadyDurations WHERE ReadyMinutes IS NOT NULL AND ReadyMinutes >= 0), 0) AS AverageReadyMinutes
    FROM Filtered;
END;
GO

CREATE OR ALTER PROCEDURE dbo.Report_OrderDetail
    @TenantId UNIQUEIDENTIFIER,
    @OrderId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        o.OrderId,
        o.BranchId,
        b.Name AS BranchName,
        o.TableId,
        bt.Name AS TableName,
        o.OrderStatusCode,
        o.CustomerName,
        o.CustomerWhatsApp,
        o.Notes,
        o.TotalAmount,
        COALESCE(SUM(oi.Quantity), 0) AS ItemCount,
        o.CreatedAtUtc,
        o.UpdatedAtUtc,
        MAX(CASE WHEN h.NewStatusCode = N'Accepted' THEN h.CreatedAtUtc END) AS AcceptedAtUtc,
        MAX(CASE WHEN h.NewStatusCode = N'Preparing' THEN h.CreatedAtUtc END) AS PreparingAtUtc,
        MAX(CASE WHEN h.NewStatusCode = N'Ready' THEN h.CreatedAtUtc END) AS ReadyAtUtc,
        MAX(CASE WHEN h.NewStatusCode = N'Served' THEN h.CreatedAtUtc END) AS ServedAtUtc,
        MAX(CASE WHEN h.NewStatusCode = N'Completed' THEN h.CreatedAtUtc END) AS CompletedAtUtc,
        MAX(CASE WHEN h.NewStatusCode = N'Cancelled' THEN h.CreatedAtUtc END) AS CancelledAtUtc,
        latest.Reason AS LatestReason
    FROM dbo.Orders o
    INNER JOIN dbo.Branches b ON b.TenantId = o.TenantId AND b.BranchId = o.BranchId
    INNER JOIN dbo.BranchTables bt ON bt.TenantId = o.TenantId AND bt.BranchId = o.BranchId AND bt.TableId = o.TableId
    LEFT JOIN dbo.OrderItems oi ON oi.TenantId = o.TenantId AND oi.BranchId = o.BranchId AND oi.OrderId = o.OrderId
    LEFT JOIN dbo.OrderStatusHistory h ON h.TenantId = o.TenantId AND h.BranchId = o.BranchId AND h.OrderId = o.OrderId
    OUTER APPLY
    (
        SELECT TOP (1) osh.Reason
        FROM dbo.OrderStatusHistory osh
        WHERE osh.OrderId = o.OrderId AND osh.Reason IS NOT NULL
        ORDER BY osh.CreatedAtUtc DESC
    ) latest
    WHERE o.TenantId = @TenantId AND o.OrderId = @OrderId
    GROUP BY o.OrderId, o.BranchId, b.Name, o.TableId, bt.Name, o.OrderStatusCode, o.CustomerName, o.CustomerWhatsApp, o.Notes, o.TotalAmount, o.CreatedAtUtc, o.UpdatedAtUtc, latest.Reason;

    SELECT oi.OrderItemId, oi.MenuItemId, oi.MenuItemVariantId, oi.MenuItemName, oi.VariantName, oi.ItemNote, oi.UnitPrice, oi.Quantity, oi.LineTotal
    FROM dbo.OrderItems oi
    WHERE oi.TenantId = @TenantId AND oi.OrderId = @OrderId
    ORDER BY oi.CreatedAtUtc ASC, oi.MenuItemName ASC, oi.VariantName ASC;

    SELECT OrderStatusHistoryId, OrderId, OldStatusCode, NewStatusCode, Reason, ChangedByUserId, CreatedAtUtc
    FROM dbo.OrderStatusHistory
    WHERE TenantId = @TenantId AND OrderId = @OrderId
    ORDER BY CreatedAtUtc ASC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.Report_Items
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER = NULL,
    @DateFrom DATETIME2(3) = NULL,
    @DateTo DATETIME2(3) = NULL,
    @StatusCode NVARCHAR(32) = NULL,
    @Search NVARCHAR(120) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP (50)
        oi.MenuItemName AS ItemName,
        oi.VariantName,
        SUM(oi.Quantity) AS Quantity,
        COUNT(DISTINCT oi.OrderId) AS OrderCount,
        SUM(oi.LineTotal) AS TotalValue
    FROM dbo.OrderItems oi
    INNER JOIN dbo.Orders o ON o.TenantId = oi.TenantId AND o.BranchId = oi.BranchId AND o.OrderId = oi.OrderId
    WHERE o.TenantId = @TenantId
      AND o.OrderStatusCode <> N'Cancelled'
      AND (@BranchId IS NULL OR o.BranchId = @BranchId)
      AND (@DateFrom IS NULL OR o.CreatedAtUtc >= @DateFrom)
      AND (@DateTo IS NULL OR o.CreatedAtUtc < DATEADD(DAY, 1, @DateTo))
      AND (NULLIF(LTRIM(RTRIM(@StatusCode)), N'') IS NULL OR o.OrderStatusCode = @StatusCode)
      AND (NULLIF(LTRIM(RTRIM(@Search)), N'') IS NULL OR oi.MenuItemName LIKE N'%' + @Search + N'%' OR oi.VariantName LIKE N'%' + @Search + N'%')
    GROUP BY oi.MenuItemName, oi.VariantName
    ORDER BY SUM(oi.Quantity) DESC, SUM(oi.LineTotal) DESC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.Report_Customers
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER = NULL,
    @DateFrom DATETIME2(3) = NULL,
    @DateTo DATETIME2(3) = NULL,
    @StatusCode NVARCHAR(32) = NULL,
    @Search NVARCHAR(120) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP (100)
        COALESCE(NULLIF(LTRIM(RTRIM(CustomerWhatsApp)), N''), NULLIF(LTRIM(RTRIM(CustomerName)), N''), N'Guest') AS CustomerKey,
        MAX(CustomerName) AS CustomerName,
        MAX(CustomerWhatsApp) AS CustomerWhatsApp,
        COUNT(1) AS OrderCount,
        SUM(CASE WHEN OrderStatusCode <> N'Cancelled' THEN TotalAmount ELSE 0 END) AS TotalValue,
        MAX(CreatedAtUtc) AS LastOrderAtUtc
    FROM dbo.Orders
    WHERE TenantId = @TenantId
      AND (@BranchId IS NULL OR BranchId = @BranchId)
      AND (@DateFrom IS NULL OR CreatedAtUtc >= @DateFrom)
      AND (@DateTo IS NULL OR CreatedAtUtc < DATEADD(DAY, 1, @DateTo))
      AND (NULLIF(LTRIM(RTRIM(@StatusCode)), N'') IS NULL OR OrderStatusCode = @StatusCode)
      AND (NULLIF(LTRIM(RTRIM(@Search)), N'') IS NULL OR CustomerName LIKE N'%' + @Search + N'%' OR CustomerWhatsApp LIKE N'%' + @Search + N'%')
      AND (CustomerName IS NOT NULL OR CustomerWhatsApp IS NOT NULL)
    GROUP BY COALESCE(NULLIF(LTRIM(RTRIM(CustomerWhatsApp)), N''), NULLIF(LTRIM(RTRIM(CustomerName)), N''), N'Guest')
    ORDER BY MAX(CreatedAtUtc) DESC;
END;
GO
