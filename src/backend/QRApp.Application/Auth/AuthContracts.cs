using QRApp.Application.Tenants;

namespace QRApp.Application.Auth;

public sealed record RegisterTenantOwnerRequest(
    string TenantName,
    string TenantSlug,
    string OwnerEmail,
    string OwnerDisplayName,
    string Password);

public sealed record LoginRequest(string Email, string Password);

public sealed record AuthenticatedUserResponse(
    Guid UserId,
    string Email,
    string DisplayName,
    Guid TenantId,
    string RoleCode,
    Guid? BranchId);

public sealed record AuthenticatedTenantResponse(
    Guid TenantId,
    string Name,
    string Slug,
    TenantAccessStatusResponse AccessStatus);

public sealed record AuthenticatedSessionResponse(
    AuthenticatedUserResponse User,
    AuthenticatedTenantResponse Tenant);

public sealed record LoginUserRecord(
    Guid UserId,
    string Email,
    string DisplayName,
    string PasswordHash,
    Guid TenantId,
    string TenantName,
    string TenantSlug,
    string RoleCode,
    Guid? BranchId,
    string PlanCode,
    DateTime? TrialStartAtUtc,
    DateTime? TrialEndAtUtc,
    string SubscriptionStatusCode,
    string AccountStatusCode,
    bool IsTenantActive);
