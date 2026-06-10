using QRApp.Application.Common;
using QRApp.Shared.Results;

namespace QRApp.Application.Branches;

public sealed class BranchService(IBranchRepository branchRepository) : IBranchService
{
    public async Task<OperationResult<BranchResponse>> CreateAsync(Guid tenantId, CreateBranchRequest request, CancellationToken cancellationToken)
    {
        var errors = Validate(request.Name, request.CountryCode, request.LogoUrl, request.LogoPublicId);
        if (errors.Count > 0)
        {
            return OperationResult<BranchResponse>.Failed(errors.ToArray());
        }

        var cleanedRequest = new CreateBranchRequest(
            TextRules.CleanRequired(request.Name),
            TextRules.CleanOptional(request.PhoneNumber),
            TextRules.CleanOptional(request.AddressLine1),
            TextRules.CleanOptional(request.AddressLine2),
            TextRules.CleanOptional(request.City),
            TextRules.CleanOptional(request.State),
            TextRules.CleanOptional(request.PostalCode),
            TextRules.CleanRequired(request.CountryCode).ToUpperInvariant(),
            TextRules.CleanOptional(request.LogoUrl),
            TextRules.CleanOptional(request.LogoPublicId));

        var branch = await branchRepository.CreateAsync(tenantId, Guid.NewGuid(), cleanedRequest, cancellationToken);
        return OperationResult<BranchResponse>.Success(branch);
    }

    public async Task<OperationResult<BranchResponse>> UpdateAsync(Guid tenantId, Guid branchId, UpdateBranchRequest request, CancellationToken cancellationToken)
    {
        var errors = Validate(request.Name, request.CountryCode, request.LogoUrl, request.LogoPublicId);
        if (errors.Count > 0)
        {
            return OperationResult<BranchResponse>.Failed(errors.ToArray());
        }

        var cleanedRequest = new UpdateBranchRequest(
            TextRules.CleanRequired(request.Name),
            TextRules.CleanOptional(request.PhoneNumber),
            TextRules.CleanOptional(request.AddressLine1),
            TextRules.CleanOptional(request.AddressLine2),
            TextRules.CleanOptional(request.City),
            TextRules.CleanOptional(request.State),
            TextRules.CleanOptional(request.PostalCode),
            TextRules.CleanRequired(request.CountryCode).ToUpperInvariant(),
            request.IsActive,
            TextRules.CleanOptional(request.LogoUrl),
            TextRules.CleanOptional(request.LogoPublicId));

        var branch = await branchRepository.UpdateAsync(tenantId, branchId, cleanedRequest, cancellationToken);
        return OperationResult<BranchResponse>.Success(branch);
    }

    public Task<BranchResponse?> GetByIdAsync(Guid tenantId, Guid branchId, CancellationToken cancellationToken)
    {
        return branchRepository.GetByIdAsync(tenantId, branchId, cancellationToken);
    }

    public Task<IReadOnlyCollection<BranchListItemResponse>> GetListByTenantAsync(Guid tenantId, bool includeInactive, CancellationToken cancellationToken)
    {
        return branchRepository.GetListByTenantAsync(tenantId, includeInactive, cancellationToken);
    }

    public Task DeactivateAsync(Guid tenantId, Guid branchId, CancellationToken cancellationToken)
    {
        return branchRepository.DeactivateAsync(tenantId, branchId, cancellationToken);
    }

    private static List<ValidationFailure> Validate(string name, string countryCode, string? logoUrl, string? logoPublicId)
    {
        var errors = new List<ValidationFailure>();
        var cleanName = TextRules.CleanRequired(name);
        var cleanCountryCode = TextRules.CleanRequired(countryCode);

        if (cleanName.Length is < 2 or > 160)
        {
            errors.Add(new ValidationFailure(nameof(CreateBranchRequest.Name), "Branch name must be between 2 and 160 characters."));
        }

        if (cleanCountryCode.Length != 2 || !cleanCountryCode.All(char.IsLetter))
        {
            errors.Add(new ValidationFailure(nameof(CreateBranchRequest.CountryCode), "Country code must be a two-letter ISO code."));
        }

        if (TextRules.CleanOptional(logoUrl)?.Length > 1000)
        {
            errors.Add(new ValidationFailure(nameof(CreateBranchRequest.LogoUrl), "Branch logo URL cannot exceed 1000 characters."));
        }

        if (TextRules.CleanOptional(logoPublicId)?.Length > 300)
        {
            errors.Add(new ValidationFailure(nameof(CreateBranchRequest.LogoPublicId), "Branch logo provider ID cannot exceed 300 characters."));
        }

        return errors;
    }
}
