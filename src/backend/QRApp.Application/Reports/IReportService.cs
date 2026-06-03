namespace QRApp.Application.Reports;

public interface IReportService
{
    Task<OrderReportSummaryResponse> GetOrderSummaryAsync(Guid tenantId, OrderReportFilter filter, CancellationToken cancellationToken);

    Task<IReadOnlyCollection<OrderReportListItemResponse>> GetOrdersAsync(Guid tenantId, OrderReportFilter filter, CancellationToken cancellationToken);

    Task<OrderReportDetailResponse> GetOrderDetailAsync(Guid tenantId, Guid orderId, CancellationToken cancellationToken);

    Task<IReadOnlyCollection<ItemReportResponse>> GetItemsAsync(Guid tenantId, OrderReportFilter filter, CancellationToken cancellationToken);

    Task<IReadOnlyCollection<CustomerReportResponse>> GetCustomersAsync(Guid tenantId, OrderReportFilter filter, CancellationToken cancellationToken);
}
