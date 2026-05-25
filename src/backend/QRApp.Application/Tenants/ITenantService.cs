using QRApp.Shared.Results;

namespace QRApp.Application.Tenants;

public interface ITenantService
{
    Task<OperationResult<TenantResponse>> CreateAsync(CreateTenantRequest request, CancellationToken cancellationToken);

    Task<TenantResponse?> GetByIdAsync(Guid tenantId, CancellationToken cancellationToken);
}

