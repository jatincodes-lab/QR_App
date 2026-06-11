namespace QRApp.Application.Orders;

public sealed record CreatePublicQrOrderItemRequest(Guid MenuItemId, int Quantity, Guid? MenuItemVariantId = null, string? ItemNote = null);

public sealed record CreatePublicQrOrderRequest(
    string? CustomerName,
    string? CustomerWhatsApp,
    string? Notes,
    IReadOnlyCollection<CreatePublicQrOrderItemRequest> Items,
    bool MarketingConsent = false);

public sealed record PublicOrderItemResponse(
    Guid OrderItemId,
    Guid OrderId,
    Guid MenuItemId,
    Guid? MenuItemVariantId,
    string MenuItemName,
    string? VariantName,
    string? ItemNote,
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
    Guid? AppliedBranchOfferId,
    string? AppliedOfferTitle,
    decimal AppliedOfferDiscountAmount,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc,
    IReadOnlyCollection<PublicOrderItemResponse> Items);
