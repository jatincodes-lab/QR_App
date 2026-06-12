using QRApp.Shared.Results;

namespace QRApp.Application.Tenants;

public interface ITenantSubscriptionService
{
    Task<TenantSubscriptionResponse?> GetCurrentAsync(Guid tenantId, CancellationToken cancellationToken);

    Task<OperationResult<TenantSubscriptionResponse>> UpdateManualAsync(
        Guid tenantId,
        UpdateTenantSubscriptionRequest request,
        CancellationToken cancellationToken);

    Task<OperationResult<TenantSubscriptionResponse>> ExtendTrialAsync(
        Guid tenantId,
        ExtendTenantTrialRequest request,
        CancellationToken cancellationToken);

    Task<OperationResult<TenantSubscriptionResponse>> ReactivateManualAsync(
        Guid tenantId,
        TenantSubscriptionActionRequest request,
        CancellationToken cancellationToken);

    Task<OperationResult<TenantSubscriptionResponse>> SuspendAsync(
        Guid tenantId,
        TenantSubscriptionActionRequest request,
        CancellationToken cancellationToken);
}
