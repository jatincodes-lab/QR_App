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

CREATE OR ALTER PROCEDURE dbo.AdminOrder_GetItemsByBranch
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        oi.OrderItemId,
        oi.OrderId,
        oi.MenuItemId,
        oi.MenuItemName,
        oi.UnitPrice,
        oi.Quantity,
        oi.LineTotal
    FROM dbo.OrderItems oi
    INNER JOIN dbo.Orders o ON o.TenantId = oi.TenantId AND o.BranchId = oi.BranchId AND o.OrderId = oi.OrderId
    WHERE oi.TenantId = @TenantId
      AND oi.BranchId = @BranchId
    ORDER BY oi.CreatedAtUtc ASC, oi.MenuItemName ASC;
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
    SET
        OrderStatusCode = @OrderStatusCode,
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

    SELECT
        OrderItemId,
        OrderId,
        MenuItemId,
        MenuItemName,
        UnitPrice,
        Quantity,
        LineTotal
    FROM dbo.OrderItems
    WHERE TenantId = @TenantId
      AND BranchId = @BranchId
      AND OrderId = @OrderId
    ORDER BY CreatedAtUtc ASC, MenuItemName ASC;
END;
GO
