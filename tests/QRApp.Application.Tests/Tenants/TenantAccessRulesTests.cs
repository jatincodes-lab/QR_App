using QRApp.Application.Tenants;

namespace QRApp.Application.Tests.Tenants;

public sealed class TenantAccessRulesTests
{
    private static readonly Guid TenantId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    private static readonly DateTime NowUtc = new(2026, 6, 12, 10, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void CreateStatus_WhenTrialIsActive_AllowsAccessAndReportsDaysRemaining()
    {
        var status = TenantAccessRules.CreateStatus(
            TenantId,
            "trial",
            NowUtc.AddDays(-1),
            NowUtc.AddDays(2.2),
            "Trialing",
            "Active",
            true,
            NowUtc);

        Assert.True(status.IsAccessAllowed);
        Assert.False(status.IsTrialExpired);
        Assert.Equal(3, status.TrialDaysRemaining);
    }

    [Fact]
    public void CreateStatus_WhenTrialEnded_BlocksAccess()
    {
        var status = TenantAccessRules.CreateStatus(
            TenantId,
            "trial",
            NowUtc.AddDays(-8),
            NowUtc.AddSeconds(-1),
            "Trialing",
            "Active",
            true,
            NowUtc);

        Assert.False(status.IsAccessAllowed);
        Assert.True(status.IsTrialExpired);
        Assert.Null(status.TrialDaysRemaining);
    }

    [Fact]
    public void CreateStatus_WhenTrialEndIsMissing_BlocksAccess()
    {
        var status = TenantAccessRules.CreateStatus(
            TenantId,
            "trial",
            NowUtc.AddDays(-1),
            null,
            "Trialing",
            "Active",
            true,
            NowUtc);

        Assert.False(status.IsAccessAllowed);
        Assert.True(status.IsTrialExpired);
    }

    [Fact]
    public void CreateStatus_WhenTrialStartsInFuture_BlocksAccess()
    {
        var status = TenantAccessRules.CreateStatus(
            TenantId,
            "trial",
            NowUtc.AddHours(1),
            NowUtc.AddDays(7),
            "Trialing",
            "Active",
            true,
            NowUtc);

        Assert.False(status.IsAccessAllowed);
        Assert.False(status.IsTrialExpired);
        Assert.Equal("Your trial is not active yet. Please contact support.", status.Message);
    }

    [Fact]
    public void CreateStatus_WhenSubscriptionIsManualActive_AllowsAccessWithoutTrialWindow()
    {
        var status = TenantAccessRules.CreateStatus(
            TenantId,
            "manual",
            null,
            null,
            "ManualActive",
            "Active",
            true,
            NowUtc);

        Assert.True(status.IsAccessAllowed);
        Assert.False(status.IsTrialExpired);
        Assert.Null(status.TrialDaysRemaining);
    }

    [Fact]
    public void CreateStatus_WhenAccountIsInactive_BlocksAccessEvenForManualActive()
    {
        var status = TenantAccessRules.CreateStatus(
            TenantId,
            "manual",
            null,
            null,
            "ManualActive",
            "Inactive",
            true,
            NowUtc);

        Assert.False(status.IsAccessAllowed);
        Assert.False(status.IsAccountActive);
        Assert.Equal("This account is inactive. Please contact support to reactivate it.", status.Message);
    }
}
