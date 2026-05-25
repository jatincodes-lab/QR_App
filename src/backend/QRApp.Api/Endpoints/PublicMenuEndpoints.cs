using Microsoft.Data.SqlClient;
using QRApp.Api.Errors;
using QRApp.Application.Menus;

namespace QRApp.Api.Endpoints;

public static class PublicMenuEndpoints
{
    public static IEndpointRouteBuilder MapPublicMenuEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/public");

        group.MapGet("/branches/{branchId:guid}/menu", GetPublicMenuAsync).AllowAnonymous();

        return app;
    }

    private static async Task<IResult> GetPublicMenuAsync(
        Guid branchId,
        IMenuItemService menuItemService,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var menu = await menuItemService.GetPublicMenuByBranchAsync(branchId, cancellationToken);
            return menu is null ? Results.NotFound() : Results.Ok(menu);
        }
        catch (Exception ex)
        when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(PublicMenuEndpoints)).LogWarning(sqlException, "Database failed while reading public menu for branch {BranchId}.", branchId);
            return SqlProblemMapper.ToProblem(sqlException);
        }
    }
}

