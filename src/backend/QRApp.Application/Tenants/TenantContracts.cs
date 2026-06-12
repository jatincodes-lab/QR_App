namespace QRApp.Application.Tenants;

public sealed record CreateTenantRequest(string Name, string Slug, string OwnerEmail);

public sealed record TenantResponse(
    Guid TenantId,
    string Name,
    string Slug,
    string OwnerEmail,
    bool IsActive,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc);

public sealed record TenantAccessStatusResponse(
    Guid TenantId,
    string PlanCode,
    DateTime? TrialStartAtUtc,
    DateTime? TrialEndAtUtc,
    string SubscriptionStatusCode,
    string AccountStatusCode,
    bool IsTenantActive,
    bool IsAccountActive,
    bool IsTrialExpired,
    bool IsAccessAllowed,
    int? TrialDaysRemaining,
    string Message);
