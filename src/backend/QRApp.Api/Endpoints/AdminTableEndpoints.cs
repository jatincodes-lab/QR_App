using Microsoft.Data.SqlClient;
using QRApp.Api.Errors;
using QRApp.Application.Auth;
using QRApp.Application.Tables;
using QRApp.Shared.Results;

namespace QRApp.Api.Endpoints;

public static class AdminTableEndpoints
{
    public static IEndpointRouteBuilder MapAdminTableEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/admin").RequireAuthorization();

        group.MapPost("/branches/{branchId:guid}/tables", CreateTableAsync);
        group.MapGet("/branches/{branchId:guid}/tables", GetTablesAsync);
        group.MapPut("/branches/{branchId:guid}/tables/{tableId:guid}", UpdateTableAsync);
        group.MapDelete("/branches/{branchId:guid}/tables/{tableId:guid}", DeactivateTableAsync);
        group.MapPost("/branches/{branchId:guid}/tables/{tableId:guid}/qr-token/regenerate", RegenerateQrTokenAsync);

        return app;
    }

    private static async Task<IResult> CreateTableAsync(
        Guid branchId,
        CreateBranchTableRequest request,
        ITenantContext tenantContext,
        IBranchTableService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await service.CreateAsync(tenantContext.TenantId, branchId, request, cancellationToken);
            return result.IsSuccess
                ? Results.Created($"/api/v1/admin/branches/{branchId}/tables/{result.Value!.TableId}", result.Value)
                : ValidationProblem(result.Errors);
        }
        catch (Exception ex)
        when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(AdminTableEndpoints)).LogWarning(sqlException, "Database rejected table creation for branch {BranchId}.", branchId);
            return SqlProblemMapper.ToProblem(sqlException);
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(AdminTableEndpoints)).LogError(ex, "Failed to create table for branch {BranchId}.", branchId);
            return Results.Problem("Table could not be created.");
        }
    }

    private static async Task<IResult> GetTablesAsync(
        Guid branchId,
        bool? includeInactive,
        ITenantContext tenantContext,
        IBranchTableService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var tables = await service.GetListByBranchAsync(
                tenantContext.TenantId,
                branchId,
                includeInactive.GetValueOrDefault(),
                cancellationToken);

            return Results.Ok(tables);
        }
        catch (Exception ex)
        when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(AdminTableEndpoints)).LogWarning(sqlException, "Database failed while listing tables for branch {BranchId}.", branchId);
            return SqlProblemMapper.ToProblem(sqlException);
        }
    }

    private static async Task<IResult> UpdateTableAsync(
        Guid branchId,
        Guid tableId,
        UpdateBranchTableRequest request,
        ITenantContext tenantContext,
        IBranchTableService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await service.UpdateAsync(tenantContext.TenantId, branchId, tableId, request, cancellationToken);
            return result.IsSuccess ? Results.Ok(result.Value) : ValidationProblem(result.Errors);
        }
        catch (Exception ex)
        when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(AdminTableEndpoints)).LogWarning(sqlException, "Database rejected table update for table {TableId}.", tableId);
            return SqlProblemMapper.ToProblem(sqlException);
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(AdminTableEndpoints)).LogError(ex, "Failed to update table {TableId}.", tableId);
            return Results.Problem("Table could not be updated.");
        }
    }

    private static async Task<IResult> DeactivateTableAsync(
        Guid branchId,
        Guid tableId,
        ITenantContext tenantContext,
        IBranchTableService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            await service.DeactivateAsync(tenantContext.TenantId, branchId, tableId, cancellationToken);
            return Results.NoContent();
        }
        catch (Exception ex)
        when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(AdminTableEndpoints)).LogWarning(sqlException, "Database rejected table deactivation for table {TableId}.", tableId);
            return SqlProblemMapper.ToProblem(sqlException);
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(AdminTableEndpoints)).LogError(ex, "Failed to deactivate table {TableId}.", tableId);
            return Results.Problem("Table could not be deactivated.");
        }
    }

    private static async Task<IResult> RegenerateQrTokenAsync(
        Guid branchId,
        Guid tableId,
        ITenantContext tenantContext,
        IBranchTableService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var table = await service.RegenerateQrTokenAsync(tenantContext.TenantId, branchId, tableId, cancellationToken);
            return Results.Ok(table);
        }
        catch (Exception ex)
        when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(AdminTableEndpoints)).LogWarning(sqlException, "Database rejected QR token regeneration for table {TableId}.", tableId);
            return SqlProblemMapper.ToProblem(sqlException);
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(AdminTableEndpoints)).LogError(ex, "Failed to regenerate QR token for table {TableId}.", tableId);
            return Results.Problem("QR token could not be regenerated.");
        }
    }

    private static IResult ValidationProblem(IReadOnlyCollection<ValidationFailure> errors)
    {
        return Results.ValidationProblem(errors
            .GroupBy(error => error.Field)
            .ToDictionary(group => group.Key, group => group.Select(error => error.Message).ToArray()));
    }
}
