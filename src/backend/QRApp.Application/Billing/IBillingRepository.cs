namespace QRApp.Application.Billing;

public interface IBillingRepository
{
    Task<BranchBillingSettingsResponse?> GetSettingsAsync(Guid tenantId, Guid branchId, CancellationToken cancellationToken);

    Task<BranchBillingSettingsResponse> SaveSettingsAsync(
        Guid tenantId,
        Guid branchId,
        Guid branchBillingSettingsId,
        SaveBranchBillingSettingsRequest request,
        CancellationToken cancellationToken);

    Task<OrderBillResponse?> GetOrderBillAsync(Guid tenantId, Guid branchId, Guid orderId, CancellationToken cancellationToken);

    Task<OrderBillResponse> GenerateOrderBillAsync(
        Guid tenantId,
        Guid branchId,
        Guid orderId,
        GenerateOrderBillRequest request,
        Guid changedByUserId,
        CancellationToken cancellationToken);

    Task<OrderBillResponse> UpdatePaymentStatusAsync(
        Guid tenantId,
        Guid branchId,
        Guid orderId,
        UpdateOrderBillPaymentStatusRequest request,
        Guid changedByUserId,
        CancellationToken cancellationToken);

    Task<OrderBillResponse> UpdateRefundStatusAsync(
        Guid tenantId,
        Guid branchId,
        Guid orderId,
        UpdateOrderBillRefundStatusRequest request,
        Guid changedByUserId,
        CancellationToken cancellationToken);
}
