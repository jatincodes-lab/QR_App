namespace QRApp.Application.Orders;

public sealed record AdminOrderItemResponse(
    Guid OrderItemId,
    Guid OrderId,
    Guid MenuItemId,
    string MenuItemName,
    decimal UnitPrice,
    int Quantity,
    decimal LineTotal);

public sealed record AdminOrderResponse(
    Guid OrderId,
    Guid TenantId,
    Guid BranchId,
    Guid TableId,
    string TableName,
    string OrderStatusCode,
    string? CustomerName,
    string? CustomerWhatsApp,
    string? Notes,
    decimal SubtotalAmount,
    decimal TotalAmount,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc,
    IReadOnlyCollection<AdminOrderItemResponse> Items);

public sealed record UpdateAdminOrderStatusRequest(string OrderStatusCode);
