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

public sealed record TenantSubscriptionResponse(
    Guid TenantId,
    string Name,
    string Slug,
    string OwnerEmail,
    string PlanCode,
    DateTime? TrialStartAtUtc,
    DateTime? TrialEndAtUtc,
    string SubscriptionStatusCode,
    string AccountStatusCode,
    bool IsTenantActive,
    DateTime? SubscriptionUpdatedAtUtc,
    string? SubscriptionNotes,
    TenantAccessStatusResponse AccessStatus);

public sealed record UpdateTenantSubscriptionRequest(
    string PlanCode,
    string SubscriptionStatusCode,
    string AccountStatusCode,
    DateTime? TrialEndAtUtc,
    string? SubscriptionNotes);

public sealed record ExtendTenantTrialRequest(int Days, string? SubscriptionNotes);

public sealed record TenantSubscriptionActionRequest(string? SubscriptionNotes);
