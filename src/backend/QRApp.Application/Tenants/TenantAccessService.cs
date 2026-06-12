using QRApp.Application.Common;

namespace QRApp.Application.Tenants;

public sealed class TenantAccessService(ITenantRepository repository) : ITenantAccessService
{
    public Task<TenantAccessStatusResponse?> GetByTenantIdAsync(Guid tenantId, CancellationToken cancellationToken)
    {
        return tenantId == Guid.Empty
            ? Task.FromResult<TenantAccessStatusResponse?>(null)
            : repository.GetAccessStatusByTenantIdAsync(tenantId, cancellationToken);
    }

    public Task<TenantAccessStatusResponse?> GetByQrTokenAsync(string qrToken, CancellationToken cancellationToken)
    {
        var cleanToken = TextRules.CleanRequired(qrToken);
        return cleanToken.Length is < 8 or > 80
            ? Task.FromResult<TenantAccessStatusResponse?>(null)
            : repository.GetAccessStatusByQrTokenAsync(cleanToken, cancellationToken);
    }
}
