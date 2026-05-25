using QRApp.Application.Common;
using QRApp.Shared.Results;

namespace QRApp.Application.Tenants;

public sealed class TenantService(ITenantRepository tenantRepository) : ITenantService
{
    public async Task<OperationResult<TenantResponse>> CreateAsync(CreateTenantRequest request, CancellationToken cancellationToken)
    {
        var name = TextRules.CleanRequired(request.Name);
        var slug = TextRules.CleanRequired(request.Slug).ToLowerInvariant();
        var ownerEmail = TextRules.CleanRequired(request.OwnerEmail).ToLowerInvariant();

        var errors = new List<ValidationFailure>();

        if (name.Length is < 2 or > 160)
        {
            errors.Add(new ValidationFailure(nameof(request.Name), "Tenant name must be between 2 and 160 characters."));
        }

        if (slug.Length is < 3 or > 120 || !slug.All(c => char.IsLetterOrDigit(c) || c == '-'))
        {
            errors.Add(new ValidationFailure(nameof(request.Slug), "Tenant slug must be 3-120 characters and contain only letters, numbers, or hyphens."));
        }

        if (ownerEmail.Length > 256 || !ownerEmail.Contains('@', StringComparison.Ordinal))
        {
            errors.Add(new ValidationFailure(nameof(request.OwnerEmail), "Owner email is invalid."));
        }

        if (errors.Count > 0)
        {
            return OperationResult<TenantResponse>.Failed(errors.ToArray());
        }

        var cleanedRequest = new CreateTenantRequest(name, slug, ownerEmail);
        var tenant = await tenantRepository.CreateAsync(Guid.NewGuid(), cleanedRequest, cancellationToken);
        return OperationResult<TenantResponse>.Success(tenant);
    }

    public Task<TenantResponse?> GetByIdAsync(Guid tenantId, CancellationToken cancellationToken)
    {
        return tenantRepository.GetByIdAsync(tenantId, cancellationToken);
    }
}

