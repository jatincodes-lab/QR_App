using QRApp.Application.Common;

namespace QRApp.Application.Reports;

public sealed class ReportService(IReportRepository repository) : IReportService
{
    public Task<OrderReportSummaryResponse> GetOrderSummaryAsync(Guid tenantId, OrderReportFilter filter, CancellationToken cancellationToken)
    {
        return repository.GetOrderSummaryAsync(tenantId, Clean(filter), cancellationToken);
    }

    public Task<IReadOnlyCollection<OrderReportListItemResponse>> GetOrdersAsync(Guid tenantId, OrderReportFilter filter, CancellationToken cancellationToken)
    {
        return repository.GetOrdersAsync(tenantId, Clean(filter), cancellationToken);
    }

    public Task<OrderReportDetailResponse> GetOrderDetailAsync(Guid tenantId, Guid orderId, CancellationToken cancellationToken)
    {
        return repository.GetOrderDetailAsync(tenantId, orderId, cancellationToken);
    }

    public Task<IReadOnlyCollection<ItemReportResponse>> GetItemsAsync(Guid tenantId, OrderReportFilter filter, CancellationToken cancellationToken)
    {
        return repository.GetItemsAsync(tenantId, Clean(filter), cancellationToken);
    }

    public Task<IReadOnlyCollection<CustomerReportResponse>> GetCustomersAsync(Guid tenantId, OrderReportFilter filter, CancellationToken cancellationToken)
    {
        return repository.GetCustomersAsync(tenantId, Clean(filter), cancellationToken);
    }

    private static OrderReportFilter Clean(OrderReportFilter filter)
    {
        return filter with
        {
            StatusCode = TextRules.CleanOptional(filter.StatusCode),
            Search = TextRules.CleanOptional(filter.Search)
        };
    }
}
