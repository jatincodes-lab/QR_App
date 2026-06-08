namespace QRApp.Application.Staff;

public sealed record CreateStaffUserRequest(
    Guid? BranchId,
    string Email,
    string DisplayName,
    string Password,
    string RoleCode);

public sealed record UpdateStaffUserRequest(
    Guid? BranchId,
    string DisplayName,
    string RoleCode,
    bool IsActive);

public sealed record StaffUserResponse(
    Guid UserId,
    Guid TenantUserId,
    Guid TenantId,
    Guid? BranchId,
    string? BranchName,
    string Email,
    string DisplayName,
    string RoleCode,
    bool IsActive,
    bool TenantUserIsActive,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc);
