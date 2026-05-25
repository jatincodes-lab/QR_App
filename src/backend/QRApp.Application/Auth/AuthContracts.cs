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
    string RoleCode);

public sealed record AuthenticatedTenantResponse(
    Guid TenantId,
    string Name,
    string Slug);

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
    string RoleCode);

