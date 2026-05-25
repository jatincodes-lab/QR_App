using Microsoft.Data.SqlClient;
using QRApp.Api.Errors;
using QRApp.Application.Tables;

namespace QRApp.Api.Endpoints;

public static class PublicQrEndpoints
{
    public static IEndpointRouteBuilder MapPublicQrEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/public");

        group.MapGet("/qr/{qrToken}", GetPublicQrMenuAsync).AllowAnonymous();

        return app;
    }

    private static async Task<IResult> GetPublicQrMenuAsync(
        string qrToken,
        IBranchTableService branchTableService,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var menu = await branchTableService.GetPublicMenuByQrTokenAsync(qrToken, cancellationToken);
            return menu is null ? Results.NotFound() : Results.Ok(menu);
        }
        catch (Exception ex)
        when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(PublicQrEndpoints)).LogWarning(sqlException, "Database failed while reading public menu for QR token.");
            return SqlProblemMapper.ToProblem(sqlException);
        }
    }
}
