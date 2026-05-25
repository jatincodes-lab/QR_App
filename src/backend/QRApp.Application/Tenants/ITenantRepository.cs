namespace QRApp.Application.Tenants;

public interface ITenantRepository
{
    Task<TenantResponse> CreateAsync(Guid tenantId, CreateTenantRequest request, CancellationToken cancellationToken);

    Task<TenantResponse?> GetByIdAsync(Guid tenantId, CancellationToken cancellationToken);
}

