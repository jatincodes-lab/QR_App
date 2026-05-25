using QRApp.Application.Auth;

namespace QRApp.Api.Auth;

public interface IJwtTokenService
{
    JwtTokenResult CreateToken(AuthenticatedSessionResponse session);
}

public sealed record JwtTokenResult(string AccessToken, DateTime ExpiresAtUtc);

