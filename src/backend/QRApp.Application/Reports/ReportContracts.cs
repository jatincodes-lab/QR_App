namespace QRApp.Application.Reports;

public sealed record OrderReportFilter(
    Guid? BranchId,
    DateTime? DateFrom,
    DateTime? DateTo,
    string? StatusCode,
    string? Search);

public sealed record OrderReportSummaryResponse(
    int TotalOrders,
    int CompletedOrders,
    int CancelledOrders,
    decimal TotalOrderValue,
    decimal AverageOrderValue,
    decimal AverageReadyMinutes);

public sealed record OrderReportListItemResponse(
    Guid OrderId,
    Guid BranchId,
    string BranchName,
    Guid TableId,
    string TableName,
    string OrderStatusCode,
    string? CustomerName,
    string? CustomerWhatsApp,
    string? Notes,
    decimal TotalAmount,
    int ItemCount,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc,
    DateTime? AcceptedAtUtc,
    DateTime? PreparingAtUtc,
    DateTime? ReadyAtUtc,
    DateTime? ServedAtUtc,
    DateTime? CompletedAtUtc,
    DateTime? CancelledAtUtc,
    string? LatestReason);

public sealed record OrderReportDetailResponse(
    OrderReportListItemResponse Order,
    IReadOnlyCollection<OrderReportItemResponse> Items,
    IReadOnlyCollection<OrderStatusHistoryResponse> StatusHistory);

public sealed record OrderReportItemResponse(
    Guid OrderItemId,
    Guid MenuItemId,
    Guid? MenuItemVariantId,
    string MenuItemName,
    string? VariantName,
    string? ItemNote,
    decimal UnitPrice,
    int Quantity,
    decimal LineTotal);

public sealed record OrderStatusHistoryResponse(
    Guid OrderStatusHistoryId,
    Guid OrderId,
    string? OldStatusCode,
    string NewStatusCode,
    string? Reason,
    Guid? ChangedByUserId,
    DateTime CreatedAtUtc);

public sealed record ItemReportResponse(
    string ItemName,
    string? VariantName,
    int Quantity,
    int OrderCount,
    decimal TotalValue);

public sealed record CustomerReportResponse(
    string CustomerKey,
    string? CustomerName,
    string? CustomerWhatsApp,
    int OrderCount,
    decimal TotalValue,
    DateTime LastOrderAtUtc);
