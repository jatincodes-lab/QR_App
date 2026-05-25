using Microsoft.Data.SqlClient;

namespace QRApp.Api.Errors;

internal static class SqlProblemMapper
{
    public static IResult ToProblem(SqlException exception)
    {
        return exception.Number switch
        {
            51001 => Conflict("Tenant slug already exists."),
            51002 => Conflict("Tenant owner email already exists."),
            51301 => Conflict("User email already exists."),
            51102 => Conflict("Branch name already exists for this tenant."),
            51202 => Conflict("Branch order settings already exist."),
            51402 => Conflict("Menu category name already exists for this branch."),
            51502 => Conflict("Menu item name already exists for this category."),
            2601 or 2627 => Conflict("A record with the same unique value already exists."),

            51101 => Results.NotFound(new { message = "Active tenant was not found." }),
            51103 => Results.NotFound(new { message = "Branch was not found for this tenant." }),
            51201 => Results.NotFound(new { message = "Active branch was not found for this tenant." }),
            51203 => Results.NotFound(new { message = "Branch order settings were not found for this tenant and branch." }),
            51401 => Results.NotFound(new { message = "Active branch was not found for this tenant." }),
            51403 => Results.NotFound(new { message = "Menu category was not found for this tenant and branch." }),
            51501 => Results.NotFound(new { message = "Active menu category was not found for this tenant and branch." }),
            51503 => Results.NotFound(new { message = "Menu item was not found for this tenant and branch." }),

            547 => Results.BadRequest(new { message = "The request violates a database relationship constraint." }),

            -2 => ServiceUnavailable("Database operation timed out."),
            53 or 4060 or 18456 => ServiceUnavailable("Database is not available or not configured correctly."),

            _ => Results.Problem("A database error occurred.")
        };
    }

    private static IResult Conflict(string message)
    {
        return Results.Conflict(new { message });
    }

    private static IResult ServiceUnavailable(string message)
    {
        return Results.Problem(message, statusCode: StatusCodes.Status503ServiceUnavailable);
    }
}
