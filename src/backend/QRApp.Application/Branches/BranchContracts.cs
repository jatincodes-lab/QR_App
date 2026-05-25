namespace QRApp.Application.Branches;

public sealed record CreateBranchRequest(
    string Name,
    string? PhoneNumber,
    string? AddressLine1,
    string? AddressLine2,
    string? City,
    string? State,
    string? PostalCode,
    string CountryCode);

public sealed record UpdateBranchRequest(
    string Name,
    string? PhoneNumber,
    string? AddressLine1,
    string? AddressLine2,
    string? City,
    string? State,
    string? PostalCode,
    string CountryCode,
    bool IsActive);

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
    bool IsActive,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc);

