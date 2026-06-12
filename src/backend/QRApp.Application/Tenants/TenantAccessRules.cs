namespace QRApp.Application.Tenants;

public static class TenantAccessRules
{
    public static TenantAccessStatusResponse CreateStatus(
        Guid tenantId,
        string? planCode,
        DateTime? trialStartAtUtc,
        DateTime? trialEndAtUtc,
        string? subscriptionStatusCode,
        string? accountStatusCode,
        bool isTenantActive,
        DateTime utcNow)
    {
        var cleanPlanCode = string.IsNullOrWhiteSpace(planCode) ? "trial" : planCode.Trim();
        var cleanSubscriptionStatus = string.IsNullOrWhiteSpace(subscriptionStatusCode) ? "Trialing" : subscriptionStatusCode.Trim();
        var cleanAccountStatus = string.IsNullOrWhiteSpace(accountStatusCode) ? "Active" : accountStatusCode.Trim();
        var isTrialing = string.Equals(cleanSubscriptionStatus, "Trialing", StringComparison.OrdinalIgnoreCase);
        var isTrialNotStarted = isTrialing &&
                                trialStartAtUtc.HasValue &&
                                trialStartAtUtc.Value > utcNow;
        var isTrialExpired = isTrialing &&
                             (!trialEndAtUtc.HasValue || trialEndAtUtc.Value < utcNow);
        var isAccountActive = string.Equals(cleanAccountStatus, "Active", StringComparison.OrdinalIgnoreCase);
        var isPaidOrManualActive =
            string.Equals(cleanSubscriptionStatus, "Active", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(cleanSubscriptionStatus, "ManualActive", StringComparison.OrdinalIgnoreCase);
        var isTrialOpen = isTrialing && !isTrialNotStarted && !isTrialExpired;
        var isAccessAllowed = isTenantActive && isAccountActive && (isPaidOrManualActive || isTrialOpen);
        int? daysRemaining = isTrialOpen && trialEndAtUtc.HasValue
            ? Math.Max(0, (int)Math.Ceiling((trialEndAtUtc.Value - utcNow).TotalDays))
            : null;

        return new TenantAccessStatusResponse(
            tenantId,
            cleanPlanCode,
            trialStartAtUtc,
            trialEndAtUtc,
            cleanSubscriptionStatus,
            cleanAccountStatus,
            isTenantActive,
            isAccountActive,
            isTrialExpired,
            isAccessAllowed,
            daysRemaining,
            BuildMessage(isTenantActive, isAccountActive, cleanSubscriptionStatus, isTrialNotStarted, isTrialExpired, daysRemaining));
    }

    private static string BuildMessage(bool isTenantActive, bool isAccountActive, string subscriptionStatusCode, bool isTrialNotStarted, bool isTrialExpired, int? daysRemaining)
    {
        if (!isTenantActive || !isAccountActive)
        {
            return "This account is inactive. Please contact support to reactivate it.";
        }

        if (isTrialExpired)
        {
            return "Your trial has expired. Please renew your account to continue using Qrave.";
        }

        if (isTrialNotStarted)
        {
            return "Your trial is not active yet. Please contact support.";
        }

        if (string.Equals(subscriptionStatusCode, "Trialing", StringComparison.OrdinalIgnoreCase))
        {
            return daysRemaining == 1
                ? "Your trial ends tomorrow."
                : $"Your trial has {daysRemaining.GetValueOrDefault()} days remaining.";
        }

        return "Your account is active.";
    }
}
