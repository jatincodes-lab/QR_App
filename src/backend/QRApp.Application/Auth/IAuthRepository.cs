namespace QRApp.Application.Auth;

public interface IAuthRepository
{
    Task<AuthenticatedSessionResponse> RegisterTenantOwnerAsync(
        Guid tenantId,
        Guid userId,
        Guid tenantUserId,
        RegisterTenantOwnerRequest request,
        string passwordHash,
        CancellationToken cancellationToken);

    Task<LoginUserRecord?> GetUserByEmailAsync(string email, CancellationToken cancellationToken);
}

