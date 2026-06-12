namespace QRApp.Application.Tenants;

public interface ITenantRepository
{
    Task<TenantResponse> CreateAsync(Guid tenantId, CreateTenantRequest request, CancellationToken cancellationToken);

    Task<TenantResponse?> GetByIdAsync(Guid tenantId, CancellationToken cancellationToken);

    Task<TenantAccessStatusResponse?> GetAccessStatusByTenantIdAsync(Guid tenantId, CancellationToken cancellationToken);

    Task<TenantAccessStatusResponse?> GetAccessStatusByQrTokenAsync(string qrToken, CancellationToken cancellationToken);

    Task<TenantSubscriptionResponse?> GetSubscriptionByTenantIdAsync(Guid tenantId, CancellationToken cancellationToken);

    Task<TenantSubscriptionResponse> UpdateSubscriptionManualAsync(
        Guid tenantId,
        UpdateTenantSubscriptionRequest request,
        CancellationToken cancellationToken);
}
