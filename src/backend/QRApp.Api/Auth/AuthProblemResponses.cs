using System.Text.Json;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

namespace QRApp.Api.Auth;

public static class AuthProblemResponses
{
    public static Task WriteUnauthorizedAsync(JwtBearerChallengeContext context)
    {
        context.HandleResponse();

        var detail = GetUnauthorizedDetail(context);
        return WriteProblemAsync(
            context.Response,
            StatusCodes.Status401Unauthorized,
            "Authentication required",
            detail,
            "https://httpstatuses.com/401");
    }

    public static Task WriteForbiddenAsync(ForbiddenContext context)
    {
        return WriteProblemAsync(
            context.Response,
            StatusCodes.Status403Forbidden,
            "Access denied",
            "Your token is valid, but it does not have permission to access this resource.",
            "https://httpstatuses.com/403");
    }

    private static string GetUnauthorizedDetail(JwtBearerChallengeContext context)
    {
        if (!context.Request.Headers.ContainsKey("Authorization"))
        {
            return "Access token is required. Send an Authorization header using the Bearer token format.";
        }

        return context.AuthenticateFailure switch
        {
            SecurityTokenExpiredException => "Access token has expired. Login again to get a new token.",
            SecurityTokenException => "Access token is invalid. Login again and send a valid Bearer token.",
            _ => "Access token could not be authenticated. Login again and send a valid Bearer token."
        };
    }

    private static async Task WriteProblemAsync(
        HttpResponse response,
        int statusCode,
        string title,
        string detail,
        string type)
    {
        if (response.HasStarted)
        {
            return;
        }

        response.StatusCode = statusCode;
        response.ContentType = "application/problem+json";

        var body = new
        {
            type,
            title,
            status = statusCode,
            detail
        };

        await JsonSerializer.SerializeAsync(response.Body, body);
    }
}
