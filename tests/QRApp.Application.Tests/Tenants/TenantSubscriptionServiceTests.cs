using QRApp.Application.Tenants;

namespace QRApp.Application.Tests.Tenants;

public sealed class TenantSubscriptionServiceTests
{
    private static readonly Guid TenantId = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");

    [Fact]
    public async Task UpdateManualAsync_WhenTrialingWithoutEndDate_ReturnsValidationError()
    {
        var service = new TenantSubscriptionService(new FakeTenantRepository());

        var result = await service.UpdateManualAsync(
            TenantId,
            new UpdateTenantSubscriptionRequest("trial", "Trialing", "Active", null, null),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains(result.Errors, error => error.Field == nameof(UpdateTenantSubscriptionRequest.TrialEndAtUtc));
    }

    [Fact]
    public async Task ExtendTrialAsync_WhenDaysAreOutOfRange_ReturnsValidationError()
    {
        var service = new TenantSubscriptionService(new FakeTenantRepository());

        var result = await service.ExtendTrialAsync(
            TenantId,
            new ExtendTenantTrialRequest(0, null),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains(result.Errors, error => error.Field == nameof(ExtendTenantTrialRequest.Days));
    }

    [Fact]
    public async Task UpdateManualAsync_WhenNoteIsTooLong_ReturnsValidationError()
    {
        var service = new TenantSubscriptionService(new FakeTenantRepository());

        var result = await service.UpdateManualAsync(
            TenantId,
            new UpdateTenantSubscriptionRequest("manual", "ManualActive", "Active", null, new string('x', 501)),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains(result.Errors, error => error.Field == nameof(UpdateTenantSubscriptionRequest.SubscriptionNotes));
    }

    [Fact]
    public async Task ExtendTrialAsync_WhenCurrentTrialIsFuture_AddsDaysFromExistingEnd()
    {
        var currentEnd = DateTime.UtcNow.AddDays(3);
        var repository = new FakeTenantRepository(currentEnd);
        var service = new TenantSubscriptionService(repository);

        var result = await service.ExtendTrialAsync(
            TenantId,
            new ExtendTenantTrialRequest(7, "Pilot extension"),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("trial", repository.UpdatedRequest!.PlanCode);
        Assert.Equal("Trialing", repository.UpdatedRequest.SubscriptionStatusCode);
        Assert.Equal("Active", repository.UpdatedRequest.AccountStatusCode);
        Assert.Equal("Pilot extension", repository.UpdatedRequest.SubscriptionNotes);
        Assert.True(repository.UpdatedRequest.TrialEndAtUtc >= currentEnd.AddDays(7).AddSeconds(-1));
    }

    [Fact]
    public async Task ReactivateManualAsync_SetsManualActiveAndClearsTrialEnd()
    {
        var repository = new FakeTenantRepository();
        var service = new TenantSubscriptionService(repository);

        var result = await service.ReactivateManualAsync(
            TenantId,
            new TenantSubscriptionActionRequest(null),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("manual", repository.UpdatedRequest!.PlanCode);
        Assert.Equal("ManualActive", repository.UpdatedRequest.SubscriptionStatusCode);
        Assert.Equal("Active", repository.UpdatedRequest.AccountStatusCode);
        Assert.Null(repository.UpdatedRequest.TrialEndAtUtc);
    }

    [Fact]
    public async Task SuspendAsync_SetsInactiveSuspended()
    {
        var repository = new FakeTenantRepository();
        var service = new TenantSubscriptionService(repository);

        var result = await service.SuspendAsync(
            TenantId,
            new TenantSubscriptionActionRequest("Payment overdue"),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("Suspended", repository.UpdatedRequest!.SubscriptionStatusCode);
        Assert.Equal("Inactive", repository.UpdatedRequest.AccountStatusCode);
        Assert.Equal("Payment overdue", repository.UpdatedRequest.SubscriptionNotes);
    }

    private sealed class FakeTenantRepository(DateTime? trialEndAtUtc = null) : ITenantRepository
    {
        public UpdateTenantSubscriptionRequest? UpdatedRequest { get; private set; }

        public Task<TenantResponse> CreateAsync(Guid tenantId, CreateTenantRequest request, CancellationToken cancellationToken)
        {
            throw new NotImplementedException();
        }

        public Task<TenantResponse?> GetByIdAsync(Guid tenantId, CancellationToken cancellationToken)
        {
            throw new NotImplementedException();
        }

        public Task<TenantAccessStatusResponse?> GetAccessStatusByTenantIdAsync(Guid tenantId, CancellationToken cancellationToken)
        {
            throw new NotImplementedException();
        }

        public Task<TenantAccessStatusResponse?> GetAccessStatusByQrTokenAsync(string qrToken, CancellationToken cancellationToken)
        {
            throw new NotImplementedException();
        }

        public Task<TenantSubscriptionResponse?> GetSubscriptionByTenantIdAsync(Guid tenantId, CancellationToken cancellationToken)
        {
            var access = TenantAccessRules.CreateStatus(
                tenantId,
                "trial",
                DateTime.UtcNow.AddDays(-1),
                trialEndAtUtc ?? DateTime.UtcNow.AddDays(2),
                "Trialing",
                "Active",
                true,
                DateTime.UtcNow);

            return Task.FromResult<TenantSubscriptionResponse?>(new TenantSubscriptionResponse(
                tenantId,
                "Cafe Demo",
                "cafe-demo",
                "owner@example.com",
                "trial",
                DateTime.UtcNow.AddDays(-1),
                trialEndAtUtc ?? DateTime.UtcNow.AddDays(2),
                "Trialing",
                "Active",
                true,
                DateTime.UtcNow,
                null,
                access));
        }

        public Task<TenantSubscriptionResponse> UpdateSubscriptionManualAsync(
            Guid tenantId,
            UpdateTenantSubscriptionRequest request,
            CancellationToken cancellationToken)
        {
            UpdatedRequest = request;
            var access = TenantAccessRules.CreateStatus(
                tenantId,
                request.PlanCode,
                DateTime.UtcNow.AddDays(-1),
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
                DateTime.UtcNow.AddDays(-1),
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
