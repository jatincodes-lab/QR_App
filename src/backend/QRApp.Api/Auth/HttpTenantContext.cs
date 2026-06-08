using System.Security.Claims;
using QRApp.Application.Auth;

namespace QRApp.Api.Auth;

public sealed class HttpTenantContext(IHttpContextAccessor httpContextAccessor) : ITenantContext
{
    private ClaimsPrincipal? User => httpContextAccessor.HttpContext?.User;

    public bool IsAuthenticated => User?.Identity?.IsAuthenticated == true;

    public Guid UserId => ReadGuidClaim(TokenClaims.UserId);

    public Guid TenantId => ReadGuidClaim(TokenClaims.TenantId);

    public string RoleCode => User?.FindFirstValue(TokenClaims.RoleCode)
        ?? throw new InvalidOperationException("Authenticated request is missing role context.");

    public Guid? BranchId
    {
        get
        {
            var value = User?.FindFirstValue(TokenClaims.BranchId);
            return Guid.TryParse(value, out var id) ? id : null;
        }
    }

    private Guid ReadGuidClaim(string claimType)
    {
        var value = User?.FindFirstValue(claimType);
        if (Guid.TryParse(value, out var id))
        {
            return id;
        }

        throw new InvalidOperationException($"Authenticated request is missing {claimType} context.");
    }
}
