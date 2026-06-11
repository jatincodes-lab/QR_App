namespace QRApp.Application.Orders;

public interface IAdminOrderRepository
{
    Task<IReadOnlyCollection<AdminOrderResponse>> GetListByBranchAsync(
        Guid tenantId,
        Guid branchId,
        bool includeCompleted,
        CancellationToken cancellationToken);

    Task<AdminOrderResponse> UpdateStatusAsync(
        Guid tenantId,
        Guid branchId,
        Guid orderId,
        string orderStatusCode,
        string? reason,
        Guid changedByUserId,
        CancellationToken cancellationToken);
}
