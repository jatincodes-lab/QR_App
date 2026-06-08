using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using QRApp.Application.Auth;

namespace QRApp.Api.Auth;

public sealed class JwtTokenService(IOptions<JwtOptions> options) : IJwtTokenService
{
    public JwtTokenResult CreateToken(AuthenticatedSessionResponse session)
    {
        var jwtOptions = options.Value;
        var expiresAtUtc = DateTime.UtcNow.AddMinutes(jwtOptions.AccessTokenMinutes);
        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.SigningKey)),
            SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, session.User.UserId.ToString()),
            new Claim(TokenClaims.UserId, session.User.UserId.ToString()),
            new Claim(ClaimTypes.Email, session.User.Email),
            new Claim(ClaimTypes.Name, session.User.DisplayName),
            new Claim(TokenClaims.TenantId, session.User.TenantId.ToString()),
            new Claim(TokenClaims.RoleCode, session.User.RoleCode)
        };

        if (session.User.BranchId.HasValue)
        {
            claims.Add(new Claim(TokenClaims.BranchId, session.User.BranchId.Value.ToString()));
        }

        var token = new JwtSecurityToken(
            jwtOptions.Issuer,
            jwtOptions.Audience,
            claims,
            expires: expiresAtUtc,
            signingCredentials: credentials);

        return new JwtTokenResult(new JwtSecurityTokenHandler().WriteToken(token), expiresAtUtc);
    }
}
