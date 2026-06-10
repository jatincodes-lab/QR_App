using QRApp.Application.Branches;

namespace QRApp.Application.Tests.Branches;

public sealed class BranchServiceTests
{
    [Fact]
    public async Task CreateAsync_WhenRequestIsValid_NormalizesBranchFields()
    {
        var repository = new FakeBranchRepository();
        var service = new BranchService(repository);
        var tenantId = Guid.NewGuid();

        var result = await service.CreateAsync(
            tenantId,
            new CreateBranchRequest(" Main Branch ", " 9999999999 ", null, null, " Surat ", " Gujarat ", " 395001 ", " in "),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("Main Branch", repository.CreatedRequest!.Name);
        Assert.Equal("IN", repository.CreatedRequest.CountryCode);
        Assert.Equal("Surat", repository.CreatedRequest.City);
    }

    [Fact]
    public async Task CreateAsync_WhenCountryCodeIsInvalid_ReturnsValidationError()
    {
        var service = new BranchService(new FakeBranchRepository());

        var result = await service.CreateAsync(
            Guid.NewGuid(),
            new CreateBranchRequest("Main Branch", null, null, null, null, null, null, "IND"),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains(result.Errors, error => error.Field == nameof(CreateBranchRequest.CountryCode));
    }

    private sealed class FakeBranchRepository : IBranchRepository
    {
        public CreateBranchRequest? CreatedRequest { get; private set; }

        public Task<BranchResponse> CreateAsync(Guid tenantId, Guid branchId, CreateBranchRequest request, CancellationToken cancellationToken)
        {
            CreatedRequest = request;
            return Task.FromResult(new BranchResponse(branchId, tenantId, request.Name, request.PhoneNumber, request.AddressLine1, request.AddressLine2, request.City, request.State, request.PostalCode, request.CountryCode, request.LogoUrl, request.LogoPublicId, true, DateTime.UtcNow, null));
        }

        public Task<BranchResponse> UpdateAsync(Guid tenantId, Guid branchId, UpdateBranchRequest request, CancellationToken cancellationToken)
        {
            return Task.FromResult(new BranchResponse(branchId, tenantId, request.Name, request.PhoneNumber, request.AddressLine1, request.AddressLine2, request.City, request.State, request.PostalCode, request.CountryCode, request.LogoUrl, request.LogoPublicId, request.IsActive, DateTime.UtcNow, null));
        }

        public Task<BranchResponse?> GetByIdAsync(Guid tenantId, Guid branchId, CancellationToken cancellationToken)
        {
            return Task.FromResult<BranchResponse?>(null);
        }

        public Task<IReadOnlyCollection<BranchListItemResponse>> GetListByTenantAsync(Guid tenantId, bool includeInactive, CancellationToken cancellationToken)
        {
            return Task.FromResult<IReadOnlyCollection<BranchListItemResponse>>(Array.Empty<BranchListItemResponse>());
        }

        public Task DeactivateAsync(Guid tenantId, Guid branchId, CancellationToken cancellationToken)
        {
            return Task.CompletedTask;
        }
    }
}
