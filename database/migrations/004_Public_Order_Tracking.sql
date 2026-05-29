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
        INNER JOIN dbo.BranchTables bt ON bt.TenantId = o.TenantId
            AND bt.BranchId = o.BranchId
            AND bt.TableId = o.TableId
        INNER JOIN dbo.Branches b ON b.TenantId = o.TenantId
            AND b.BranchId = o.BranchId
        WHERE bt.QrToken = @QrToken
          AND o.OrderId = @OrderId
          AND bt.IsActive = 1
          AND b.IsActive = 1
    )
    BEGIN
        THROW 51709, 'Order was not found for this QR table.', 1;
    END;

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
        o.CreatedAtUtc,
        o.UpdatedAtUtc
    FROM dbo.Orders o
    INNER JOIN dbo.BranchTables bt ON bt.TenantId = o.TenantId
        AND bt.BranchId = o.BranchId
        AND bt.TableId = o.TableId
    INNER JOIN dbo.Branches b ON b.TenantId = o.TenantId
        AND b.BranchId = o.BranchId
    WHERE bt.QrToken = @QrToken
      AND o.OrderId = @OrderId
      AND bt.IsActive = 1
      AND b.IsActive = 1;

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
