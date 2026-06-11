using Microsoft.AspNetCore.Authorization;
using Microsoft.Data.SqlClient;
using QRApp.Api.Errors;
using QRApp.Application.Auth;
using QRApp.Application.Billing;
using QRApp.Application.Branches;
using QRApp.Application.BranchOrderSettings;

namespace QRApp.Api.Endpoints;

public static class AdminBranchEndpoints
{
    public static IEndpointRouteBuilder MapAdminBranchEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/admin").RequireAuthorization();

        group.MapPost("/branches", CreateBranchAsync);
        group.MapGet("/branches", GetBranchesAsync);
        group.MapGet("/branches/{branchId:guid}", GetBranchByIdAsync);
        group.MapPut("/branches/{branchId:guid}", UpdateBranchAsync);
        group.MapDelete("/branches/{branchId:guid}", DeactivateBranchAsync);

        group.MapPost("/branches/{branchId:guid}/order-settings", CreateBranchOrderSettingsAsync);
        group.MapGet("/branches/{branchId:guid}/order-settings", GetBranchOrderSettingsAsync);
        group.MapPut("/branches/{branchId:guid}/order-settings", UpdateBranchOrderSettingsAsync);
        group.MapGet("/branches/{branchId:guid}/billing-settings", GetBranchBillingSettingsAsync);
        group.MapPut("/branches/{branchId:guid}/billing-settings", SaveBranchBillingSettingsAsync);

        return app;
    }

    private static async Task<IResult> CreateBranchAsync(
        CreateBranchRequest request,
        ITenantContext tenantContext,
        IBranchService branchService,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await branchService.CreateAsync(tenantContext.TenantId, request, cancellationToken);
            return result.IsSuccess
                ? Results.Created($"/api/v1/admin/branches/{result.Value!.BranchId}", result.Value)
                : ApiProblemResponses.Validation(result.Errors);
        }
        catch (Exception ex)
        when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(AdminBranchEndpoints)).LogWarning(sqlException, "Database rejected admin branch creation.");
            return SqlProblemMapper.ToProblem(sqlException);
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(AdminBranchEndpoints)).LogError(ex, "Failed to create admin branch.");
            return ApiProblemResponses.ServerError("Branch could not be created.");
        }
    }

    private static async Task<IResult> GetBranchesAsync(
        bool? includeInactive,
        ITenantContext tenantContext,
        IBranchService branchService,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var branches = await branchService.GetListByTenantAsync(
                tenantContext.TenantId,
                includeInactive.GetValueOrDefault(),
                cancellationToken);

            return Results.Ok(tenantContext.BranchId.HasValue
                ? branches.Where(branch => branch.BranchId == tenantContext.BranchId.Value).ToArray()
                : branches);
        }
        catch (Exception ex)
        when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(AdminBranchEndpoints)).LogWarning(sqlException, "Database failed while listing admin branches.");
            return SqlProblemMapper.ToProblem(sqlException);
        }
    }

    private static async Task<IResult> GetBranchByIdAsync(
        Guid branchId,
        ITenantContext tenantContext,
        IBranchService branchService,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var branch = await branchService.GetByIdAsync(tenantContext.TenantId, branchId, cancellationToken);
            return branch is null ? ApiProblemResponses.NotFound("Branch was not found.") : Results.Ok(branch);
        }
        catch (Exception ex)
        when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(AdminBranchEndpoints)).LogWarning(sqlException, "Database failed while reading admin branch {BranchId}.", branchId);
            return SqlProblemMapper.ToProblem(sqlException);
        }
    }

    private static async Task<IResult> UpdateBranchAsync(
        Guid branchId,
        UpdateBranchRequest request,
        ITenantContext tenantContext,
        IBranchService branchService,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await branchService.UpdateAsync(tenantContext.TenantId, branchId, request, cancellationToken);
            return result.IsSuccess ? Results.Ok(result.Value) : ApiProblemResponses.Validation(result.Errors);
        }
        catch (Exception ex)
        when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(AdminBranchEndpoints)).LogWarning(sqlException, "Database rejected admin branch update for branch {BranchId}.", branchId);
            return SqlProblemMapper.ToProblem(sqlException);
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(AdminBranchEndpoints)).LogError(ex, "Failed to update admin branch {BranchId}.", branchId);
            return ApiProblemResponses.ServerError("Branch could not be updated.");
        }
    }

    private static async Task<IResult> DeactivateBranchAsync(
        Guid branchId,
        ITenantContext tenantContext,
        IBranchService branchService,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            await branchService.DeactivateAsync(tenantContext.TenantId, branchId, cancellationToken);
            return Results.NoContent();
        }
        catch (Exception ex)
        when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(AdminBranchEndpoints)).LogWarning(sqlException, "Database rejected admin branch deactivation for branch {BranchId}.", branchId);
            return SqlProblemMapper.ToProblem(sqlException);
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(AdminBranchEndpoints)).LogError(ex, "Failed to deactivate admin branch {BranchId}.", branchId);
            return ApiProblemResponses.ServerError("Branch could not be deactivated.");
        }
    }

    private static async Task<IResult> CreateBranchOrderSettingsAsync(
        Guid branchId,
        CreateBranchOrderSettingsRequest request,
        ITenantContext tenantContext,
        IBranchOrderSettingsService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var settings = await service.CreateAsync(tenantContext.TenantId, branchId, request, cancellationToken);
            return Results.Created($"/api/v1/admin/branches/{branchId}/order-settings", settings);
        }
        catch (Exception ex)
        when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(AdminBranchEndpoints)).LogWarning(sqlException, "Database rejected admin order settings creation for branch {BranchId}.", branchId);
            return SqlProblemMapper.ToProblem(sqlException);
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(AdminBranchEndpoints)).LogError(ex, "Failed to create admin order settings for branch {BranchId}.", branchId);
            return ApiProblemResponses.ServerError("Branch order settings could not be created.");
        }
    }

    private static async Task<IResult> GetBranchOrderSettingsAsync(
        Guid branchId,
        ITenantContext tenantContext,
        IBranchOrderSettingsService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var settings = await service.GetByBranchAsync(tenantContext.TenantId, branchId, cancellationToken);
            return settings is null ? ApiProblemResponses.NotFound("Branch order settings were not found.") : Results.Ok(settings);
        }
        catch (Exception ex)
        when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(AdminBranchEndpoints)).LogWarning(sqlException, "Database failed while reading admin order settings for branch {BranchId}.", branchId);
            return SqlProblemMapper.ToProblem(sqlException);
        }
    }

    private static async Task<IResult> UpdateBranchOrderSettingsAsync(
        Guid branchId,
        UpdateBranchOrderSettingsRequest request,
        ITenantContext tenantContext,
        IBranchOrderSettingsService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var settings = await service.UpdateAsync(tenantContext.TenantId, branchId, request, cancellationToken);
            return Results.Ok(settings);
        }
        catch (Exception ex)
        when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(AdminBranchEndpoints)).LogWarning(sqlException, "Database rejected admin order settings update for branch {BranchId}.", branchId);
            return SqlProblemMapper.ToProblem(sqlException);
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(AdminBranchEndpoints)).LogError(ex, "Failed to update admin order settings for branch {BranchId}.", branchId);
            return ApiProblemResponses.ServerError("Branch order settings could not be updated.");
        }
    }

    private static async Task<IResult> GetBranchBillingSettingsAsync(
        Guid branchId,
        ITenantContext tenantContext,
        IBillingService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var settings = await service.GetSettingsAsync(tenantContext.TenantId, branchId, cancellationToken);
            return settings is null ? ApiProblemResponses.NotFound("Branch billing settings were not found.") : Results.Ok(settings);
        }
        catch (Exception ex)
        when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(AdminBranchEndpoints)).LogWarning(sqlException, "Database failed while reading billing settings for branch {BranchId}.", branchId);
            return SqlProblemMapper.ToProblem(sqlException);
        }
    }

    private static async Task<IResult> SaveBranchBillingSettingsAsync(
        Guid branchId,
        SaveBranchBillingSettingsRequest request,
        ITenantContext tenantContext,
        IBillingService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await service.SaveSettingsAsync(tenantContext.TenantId, branchId, request, cancellationToken);
            return result.IsSuccess ? Results.Ok(result.Value) : ApiProblemResponses.Validation(result.Errors);
        }
        catch (Exception ex)
        when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(AdminBranchEndpoints)).LogWarning(sqlException, "Database rejected billing settings update for branch {BranchId}.", branchId);
            return SqlProblemMapper.ToProblem(sqlException);
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(AdminBranchEndpoints)).LogError(ex, "Failed to save billing settings for branch {BranchId}.", branchId);
            return ApiProblemResponses.ServerError("Branch billing settings could not be saved.");
        }
    }
}
