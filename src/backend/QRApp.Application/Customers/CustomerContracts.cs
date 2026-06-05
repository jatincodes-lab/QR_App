namespace QRApp.Application.Customers;

public sealed record PublicCustomerLookupResponse(
    Guid CustomerId,
    string? Name,
    string WhatsAppNumber,
    bool MarketingConsent,
    int VisitCount,
    int TotalOrderCount,
    decimal TotalOrderValue,
    DateTime LastVisitAtUtc,
    IReadOnlyCollection<PublicCustomerRecentOrderResponse> RecentOrders);

public sealed record PublicCustomerRecentOrderResponse(
    Guid OrderId,
    DateTime CreatedAtUtc,
    decimal TotalAmount,
    IReadOnlyCollection<PublicCustomerRecentOrderItemResponse> Items);

public sealed record PublicCustomerRecentOrderItemResponse(
    Guid OrderId,
    Guid MenuItemId,
    Guid? MenuItemVariantId,
    string MenuItemName,
    string? VariantName,
    string? ItemNote,
    int Quantity);
