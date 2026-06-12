using QRApp.Shared.Results;

namespace QRApp.Api.Errors;

internal static class ApiProblemResponses
{
    public static IResult Validation(IReadOnlyCollection<ValidationFailure> errors)
    {
        var groupedErrors = errors
            .GroupBy(error => error.Field)
            .ToDictionary(group => group.Key, group => group.Select(error => error.Message).ToArray());

        return Problem(
            StatusCodes.Status400BadRequest,
            "Request validation failed",
            "One or more fields need attention.",
            "https://httpstatuses.com/400",
            new Dictionary<string, object?> { ["errors"] = groupedErrors });
    }

    public static IResult BadRequest(string detail)
    {
        return Problem(
            StatusCodes.Status400BadRequest,
            "Bad request",
            detail,
            "https://httpstatuses.com/400");
    }

    public static IResult NotFound(string detail)
    {
        return Problem(
            StatusCodes.Status404NotFound,
            "Not found",
            detail,
            "https://httpstatuses.com/404");
    }

    public static IResult MethodNotAllowed(string detail)
    {
        return Problem(
            StatusCodes.Status405MethodNotAllowed,
            "Method not allowed",
            detail,
            "https://httpstatuses.com/405");
    }

    public static IResult Conflict(string detail)
    {
        return Problem(
            StatusCodes.Status409Conflict,
            "Conflict",
            detail,
            "https://httpstatuses.com/409");
    }

    public static IResult Forbidden(string detail)
    {
        return Problem(
            StatusCodes.Status403Forbidden,
            "Forbidden",
            detail,
            "https://httpstatuses.com/403");
    }

    public static IResult PaymentRequired(string detail)
    {
        return Problem(
            StatusCodes.Status402PaymentRequired,
            "Account renewal required",
            detail,
            "https://httpstatuses.com/402");
    }

    public static IResult ServerError(string detail)
    {
        return Problem(
            StatusCodes.Status500InternalServerError,
            "Server error",
            detail,
            "https://httpstatuses.com/500");
    }

    public static IResult ServiceUnavailable(string detail)
    {
        return Problem(
            StatusCodes.Status503ServiceUnavailable,
            "Service unavailable",
            detail,
            "https://httpstatuses.com/503");
    }

    private static IResult Problem(
        int status,
        string title,
        string detail,
        string type,
        IReadOnlyDictionary<string, object?>? extensions = null)
    {
        var body = new Dictionary<string, object?>
        {
            ["type"] = type,
            ["title"] = title,
            ["status"] = status,
            ["detail"] = detail
        };

        if (extensions is not null)
        {
            foreach (var extension in extensions)
            {
                body[extension.Key] = extension.Value;
            }
        }

        return Results.Json(body, statusCode: status, contentType: "application/problem+json");
    }
}
