using QRApp.Application.Tenants;

namespace QRApp.Application.Tests.Tenants;

public sealed class TenantServiceTests
{
    [Fact]
    public async Task CreateAsync_WhenRequestIsValid_NormalizesAndCreatesTenant()
    {
        var repository = new FakeTenantRepository();
        var service = new TenantService(repository);

        var result = await service.CreateAsync(
            new CreateTenantRequest(" Cafe Demo ", " Cafe-Demo ", " OWNER@EXAMPLE.COM "),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("Cafe Demo", repository.CreatedRequest!.Name);
        Assert.Equal("cafe-demo", repository.CreatedRequest.Slug);
        Assert.Equal("owner@example.com", repository.CreatedRequest.OwnerEmail);
    }

    [Fact]
    public async Task CreateAsync_WhenSlugIsInvalid_ReturnsValidationError()
    {
        var service = new TenantService(new FakeTenantRepository());

        var result = await service.CreateAsync(
            new CreateTenantRequest("Cafe Demo", "bad slug", "owner@example.com"),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains(result.Errors, error => error.Field == nameof(CreateTenantRequest.Slug));
    }

    private sealed class FakeTenantRepository : ITenantRepository
    {
        public CreateTenantRequest? CreatedRequest { get; private set; }

        public Task<TenantResponse> CreateAsync(Guid tenantId, CreateTenantRequest request, CancellationToken cancellationToken)
        {
            CreatedRequest = request;
            return Task.FromResult(new TenantResponse(tenantId, request.Name, request.Slug, request.OwnerEmail, true, DateTime.UtcNow, null));
        }

        public Task<TenantResponse?> GetByIdAsync(Guid tenantId, CancellationToken cancellationToken)
        {
            return Task.FromResult<TenantResponse?>(null);
        }

        public Task<TenantAccessStatusResponse?> GetAccessStatusByTenantIdAsync(Guid tenantId, CancellationToken cancellationToken)
        {
            return Task.FromResult<TenantAccessStatusResponse?>(null);
        }

        public Task<TenantAccessStatusResponse?> GetAccessStatusByQrTokenAsync(string qrToken, CancellationToken cancellationToken)
        {
            return Task.FromResult<TenantAccessStatusResponse?>(null);
        }

        public Task<TenantSubscriptionResponse?> GetSubscriptionByTenantIdAsync(Guid tenantId, CancellationToken cancellationToken)
        {
            return Task.FromResult<TenantSubscriptionResponse?>(null);
        }

        public Task<TenantSubscriptionResponse> UpdateSubscriptionManualAsync(
            Guid tenantId,
            UpdateTenantSubscriptionRequest request,
            CancellationToken cancellationToken)
        {
            var access = TenantAccessRules.CreateStatus(
                tenantId,
                request.PlanCode,
                null,
                request.TrialEndAtUtc,
                request.SubscriptionStatusCode,
                request.AccountStatusCode,
                string.Equals(request.AccountStatusCode, "Active", StringComparison.OrdinalIgnoreCase),
                DateTime.UtcNow);

            return Task.FromResult(new TenantSubscriptionResponse(
                tenantId,
                "Cafe Demo",
                "cafe-demo",
                "owner@example.com",
                request.PlanCode,
                null,
                request.TrialEndAtUtc,
                request.SubscriptionStatusCode,
                request.AccountStatusCode,
                access.IsTenantActive,
                DateTime.UtcNow,
                request.SubscriptionNotes,
                access));
        }
    }
}
