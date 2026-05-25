using QRApp.Shared.Results;

namespace QRApp.Application.Auth;

public interface IAuthService
{
    Task<OperationResult<AuthenticatedSessionResponse>> RegisterTenantOwnerAsync(
        RegisterTenantOwnerRequest request,
        CancellationToken cancellationToken);

    Task<OperationResult<AuthenticatedSessionResponse>> LoginAsync(
        LoginRequest request,
        CancellationToken cancellationToken);
}

