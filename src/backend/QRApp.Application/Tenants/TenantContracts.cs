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

