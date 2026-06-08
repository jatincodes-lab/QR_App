namespace QRApp.Application.Auth;

public interface ITenantContext
{
    bool IsAuthenticated { get; }

    Guid UserId { get; }

    Guid TenantId { get; }

    string RoleCode { get; }

    Guid? BranchId { get; }
}
