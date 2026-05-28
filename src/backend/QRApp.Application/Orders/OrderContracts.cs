namespace QRApp.Application.Orders;

public sealed record CreatePublicQrOrderItemRequest(Guid MenuItemId, int Quantity);

public sealed record CreatePublicQrOrderRequest(
    string? CustomerName,
    string? CustomerWhatsApp,
    string? Notes,
    IReadOnlyCollection<CreatePublicQrOrderItemRequest> Items);

public sealed record PublicOrderItemResponse(
    Guid OrderItemId,
    Guid OrderId,
    Guid MenuItemId,
    string MenuItemName,
    decimal UnitPrice,
    int Quantity,
    decimal LineTotal);

public sealed record PublicOrderResponse(
    Guid OrderId,
    Guid TenantId,
    Guid BranchId,
    Guid TableId,
    string OrderStatusCode,
    string? CustomerName,
    string? CustomerWhatsApp,
    string? Notes,
    decimal SubtotalAmount,
    decimal TotalAmount,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc,
    IReadOnlyCollection<PublicOrderItemResponse> Items);
