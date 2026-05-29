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
            51602 => Conflict("Table name already exists for this branch."),
            51604 => Conflict("QR token already exists."),
            51702 => Conflict("Direct QR ordering is disabled for this branch."),
            2601 or 2627 => Conflict("A record with the same unique value already exists."),

            51101 => ApiProblemResponses.NotFound("Active tenant was not found."),
            51103 => ApiProblemResponses.NotFound("Branch was not found for this tenant."),
            51201 => ApiProblemResponses.NotFound("Active branch was not found for this tenant."),
            51203 => ApiProblemResponses.NotFound("Branch order settings were not found for this tenant and branch."),
            51401 => ApiProblemResponses.NotFound("Active branch was not found for this tenant."),
            51403 => ApiProblemResponses.NotFound("Menu category was not found for this tenant and branch."),
            51501 => ApiProblemResponses.NotFound("Active menu category was not found for this tenant and branch."),
            51503 => ApiProblemResponses.NotFound("Menu item was not found for this tenant and branch."),
            51601 => ApiProblemResponses.NotFound("Active branch was not found for this tenant."),
            51603 => ApiProblemResponses.NotFound("Table was not found for this tenant and branch."),
            51701 => ApiProblemResponses.NotFound("Active QR table was not found."),

            51703 => ApiProblemResponses.BadRequest("Customer name is required for this branch."),
            51704 => ApiProblemResponses.BadRequest("Customer WhatsApp is required for this branch."),
            51705 => ApiProblemResponses.BadRequest("At least one valid order item is required."),
            51706 => ApiProblemResponses.BadRequest("One or more menu items are unavailable for ordering."),
            51707 => ApiProblemResponses.BadRequest("Order status is invalid."),
            51708 => ApiProblemResponses.NotFound("Order was not found for this tenant and branch."),
            51709 => ApiProblemResponses.NotFound("Order was not found for this QR table."),

            547 => ApiProblemResponses.BadRequest("The request violates a database relationship constraint."),

            -2 => ServiceUnavailable("Database operation timed out."),
            53 or 4060 or 18456 => ServiceUnavailable("Database is not available or not configured correctly."),
            208 or 2812 => ServiceUnavailable("Database schema is not up to date. Apply the latest database scripts and try again."),

            _ => ApiProblemResponses.ServerError("A database error occurred.")
        };
    }

    private static IResult Conflict(string message)
    {
        return ApiProblemResponses.Conflict(message);
    }

    private static IResult ServiceUnavailable(string message)
    {
        return ApiProblemResponses.ServiceUnavailable(message);
    }
}
