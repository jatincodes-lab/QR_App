namespace QRApp.Application.Branches;

public sealed record CreateBranchRequest(
    string Name,
    string? PhoneNumber,
    string? AddressLine1,
    string? AddressLine2,
    string? City,
    string? State,
    string? PostalCode,
    string CountryCode,
    string? LogoUrl = null,
    string? LogoPublicId = null);

public sealed record UpdateBranchRequest(
    string Name,
    string? PhoneNumber,
    string? AddressLine1,
    string? AddressLine2,
    string? City,
    string? State,
    string? PostalCode,
    string CountryCode,
    bool IsActive,
    string? LogoUrl = null,
    string? LogoPublicId = null);

public sealed record BranchResponse(
    Guid BranchId,
    Guid TenantId,
    string Name,
    string? PhoneNumber,
    string? AddressLine1,
    string? AddressLine2,
    string? City,
    string? State,
    string? PostalCode,
    string CountryCode,
    string? LogoUrl,
    string? LogoPublicId,
    bool IsActive,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc);

public sealed record BranchListItemResponse(
    Guid BranchId,
    Guid TenantId,
    string Name,
    string? PhoneNumber,
    string? City,
    string CountryCode,
    string? LogoUrl,
    string? LogoPublicId,
    bool IsActive,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc);
