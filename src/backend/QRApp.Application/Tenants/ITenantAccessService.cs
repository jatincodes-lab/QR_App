namespace QRApp.Application.Tenants;

public interface ITenantAccessService
{
    Task<TenantAccessStatusResponse?> GetByTenantIdAsync(Guid tenantId, CancellationToken cancellationToken);

    Task<TenantAccessStatusResponse?> GetByQrTokenAsync(string qrToken, CancellationToken cancellationToken);
}
