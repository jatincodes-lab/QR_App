using Microsoft.AspNetCore.Authorization;
using Microsoft.Data.SqlClient;
using QRApp.Api.Auth;
using QRApp.Api.Errors;
using QRApp.Application.Auth;

namespace QRApp.Api.Endpoints;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var auth = app.MapGroup("/api/v1/auth");

        auth.MapPost("/register-owner", RegisterOwnerAsync).AllowAnonymous();
        auth.MapPost("/login", LoginAsync).AllowAnonymous();

        app.MapGet("/api/v1/me", [Authorize] (ITenantContext tenantContext) =>
        {
            return Results.Ok(new CurrentUserContextResponse(
                tenantContext.UserId,
                tenantContext.TenantId,
                tenantContext.RoleCode));
        });

        return app;
    }

    private static async Task<IResult> RegisterOwnerAsync(
        RegisterTenantOwnerRequest request,
        IAuthService authService,
        IJwtTokenService jwtTokenService,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await authService.RegisterTenantOwnerAsync(request, cancellationToken);
            return result.IsSuccess
                ? Results.Created("/api/v1/me", ToTokenResponse(result.Value!, jwtTokenService))
                : ApiProblemResponses.Validation(result.Errors);
        }
        catch (Exception ex)
        when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(AuthEndpoints)).LogWarning(sqlException, "Database rejected owner registration.");
            return SqlProblemMapper.ToProblem(sqlException);
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(AuthEndpoints)).LogError(ex, "Failed to register tenant owner.");
            return ApiProblemResponses.ServerError("Tenant owner could not be registered.");
        }
    }

    private static async Task<IResult> LoginAsync(
        LoginRequest request,
        IAuthService authService,
        IJwtTokenService jwtTokenService,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await authService.LoginAsync(request, cancellationToken);
            return result.IsSuccess
                ? Results.Ok(ToTokenResponse(result.Value!, jwtTokenService))
                : ApiProblemResponses.Validation(result.Errors);
        }
        catch (Exception ex)
        when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(AuthEndpoints)).LogWarning(sqlException, "Database failed during login.");
            return SqlProblemMapper.ToProblem(sqlException);
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(AuthEndpoints)).LogError(ex, "Failed to login.");
            return ApiProblemResponses.ServerError("Login could not be completed.");
        }
    }

    private static AuthTokenResponse ToTokenResponse(AuthenticatedSessionResponse session, IJwtTokenService jwtTokenService)
    {
        var token = jwtTokenService.CreateToken(session);
        return new AuthTokenResponse(token.AccessToken, token.ExpiresAtUtc, session.User, session.Tenant);
    }
    private sealed record AuthTokenResponse(
        string AccessToken,
        DateTime ExpiresAtUtc,
        AuthenticatedUserResponse User,
        AuthenticatedTenantResponse Tenant);

    private sealed record CurrentUserContextResponse(Guid UserId, Guid TenantId, string RoleCode);
}
