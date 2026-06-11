using QRApp.Shared.Results;

namespace QRApp.Application.Orders;

public interface IAdminOrderService
{
    Task<IReadOnlyCollection<AdminOrderResponse>> GetListByBranchAsync(
        Guid tenantId,
        Guid branchId,
        bool includeCompleted,
        CancellationToken cancellationToken);

    Task<OperationResult<AdminOrderResponse>> UpdateStatusAsync(
        Guid tenantId,
        Guid branchId,
        Guid orderId,
        UpdateAdminOrderStatusRequest request,
        Guid changedByUserId,
        CancellationToken cancellationToken);
}
