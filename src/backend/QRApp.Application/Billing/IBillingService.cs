using QRApp.Shared.Results;

namespace QRApp.Application.Billing;

public interface IBillingService
{
    Task<BranchBillingSettingsResponse?> GetSettingsAsync(Guid tenantId, Guid branchId, CancellationToken cancellationToken);

    Task<OperationResult<BranchBillingSettingsResponse>> SaveSettingsAsync(
        Guid tenantId,
        Guid branchId,
        SaveBranchBillingSettingsRequest request,
        CancellationToken cancellationToken);

    Task<OrderBillResponse?> GetOrderBillAsync(Guid tenantId, Guid branchId, Guid orderId, CancellationToken cancellationToken);

    Task<OperationResult<OrderBillResponse>> GenerateOrderBillAsync(
        Guid tenantId,
        Guid branchId,
        Guid orderId,
        GenerateOrderBillRequest request,
        Guid changedByUserId,
        CancellationToken cancellationToken);

    Task<OperationResult<OrderBillResponse>> UpdatePaymentStatusAsync(
        Guid tenantId,
        Guid branchId,
        Guid orderId,
        UpdateOrderBillPaymentStatusRequest request,
        Guid changedByUserId,
        CancellationToken cancellationToken);

    Task<OperationResult<OrderBillResponse>> UpdateRefundStatusAsync(
        Guid tenantId,
        Guid branchId,
        Guid orderId,
        UpdateOrderBillRefundStatusRequest request,
        Guid changedByUserId,
        CancellationToken cancellationToken);
}
