using Microsoft.Data.SqlClient;
using QRApp.Api.Errors;
using QRApp.Application.Branches;
using QRApp.Application.BranchOrderSettings;
using QRApp.Application.Tenants;
using QRApp.Shared.Results;

namespace QRApp.Api.Endpoints;

public static class TenantBranchEndpoints
{
    public static IEndpointRouteBuilder MapTenantBranchEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1");

        group.MapPost("/tenants", CreateTenantAsync);
        group.MapGet("/tenants/{tenantId:guid}", GetTenantByIdAsync);

        group.MapPost("/tenants/{tenantId:guid}/branches", CreateBranchAsync);
        group.MapGet("/tenants/{tenantId:guid}/branches", GetBranchesAsync);
        group.MapGet("/tenants/{tenantId:guid}/branches/{branchId:guid}", GetBranchByIdAsync);
        group.MapPut("/tenants/{tenantId:guid}/branches/{branchId:guid}", UpdateBranchAsync);
        group.MapDelete("/tenants/{tenantId:guid}/branches/{branchId:guid}", DeactivateBranchAsync);

        group.MapPost("/tenants/{tenantId:guid}/branches/{branchId:guid}/order-settings", CreateBranchOrderSettingsAsync);
        group.MapGet("/tenants/{tenantId:guid}/branches/{branchId:guid}/order-settings", GetBranchOrderSettingsAsync);
        group.MapPut("/tenants/{tenantId:guid}/branches/{branchId:guid}/order-settings", UpdateBranchOrderSettingsAsync);

        return app;
    }

    private static async Task<IResult> CreateTenantAsync(
        CreateTenantRequest request,
        ITenantService tenantService,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await tenantService.CreateAsync(request, cancellationToken);
            return result.IsSuccess
                ? Results.Created($"/api/v1/tenants/{result.Value!.TenantId}", result.Value)
                : ValidationProblem(result.Errors);
        }
        catch (Exception ex)
        when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(TenantBranchEndpoints)).LogWarning(sqlException, "Database rejected tenant creation.");
            return SqlProblemMapper.ToProblem(sqlException);
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(TenantBranchEndpoints)).LogError(ex, "Failed to create tenant.");
            return Results.Problem("Tenant could not be created.");
        }
    }

    private static async Task<IResult> GetTenantByIdAsync(
        Guid tenantId,
        ITenantService tenantService,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var tenant = await tenantService.GetByIdAsync(tenantId, cancellationToken);
            return tenant is null ? Results.NotFound() : Results.Ok(tenant);
        }
        catch (Exception ex)
        when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(TenantBranchEndpoints)).LogWarning(sqlException, "Database failed while reading tenant {TenantId}.", tenantId);
            return SqlProblemMapper.ToProblem(sqlException);
        }
    }

    private static async Task<IResult> CreateBranchAsync(
        Guid tenantId,
        CreateBranchRequest request,
        IBranchService branchService,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await branchService.CreateAsync(tenantId, request, cancellationToken);
            return result.IsSuccess
                ? Results.Created($"/api/v1/tenants/{tenantId}/branches/{result.Value!.BranchId}", result.Value)
                : ValidationProblem(result.Errors);
        }
        catch (Exception ex)
        when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(TenantBranchEndpoints)).LogWarning(sqlException, "Database rejected branch creation for tenant {TenantId}.", tenantId);
            return SqlProblemMapper.ToProblem(sqlException);
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(TenantBranchEndpoints)).LogError(ex, "Failed to create branch for tenant {TenantId}.", tenantId);
            return Results.Problem("Branch could not be created.");
        }
    }

    private static async Task<IResult> GetBranchesAsync(
        Guid tenantId,
        bool includeInactive,
        IBranchService branchService,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var branches = await branchService.GetListByTenantAsync(tenantId, includeInactive, cancellationToken);
            return Results.Ok(branches);
        }
        catch (Exception ex)
        when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(TenantBranchEndpoints)).LogWarning(sqlException, "Database failed while listing branches for tenant {TenantId}.", tenantId);
            return SqlProblemMapper.ToProblem(sqlException);
        }
    }

    private static async Task<IResult> GetBranchByIdAsync(
        Guid tenantId,
        Guid branchId,
        IBranchService branchService,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var branch = await branchService.GetByIdAsync(tenantId, branchId, cancellationToken);
            return branch is null ? Results.NotFound() : Results.Ok(branch);
        }
        catch (Exception ex)
        when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(TenantBranchEndpoints)).LogWarning(sqlException, "Database failed while reading branch {BranchId} for tenant {TenantId}.", branchId, tenantId);
            return SqlProblemMapper.ToProblem(sqlException);
        }
    }

    private static async Task<IResult> UpdateBranchAsync(
        Guid tenantId,
        Guid branchId,
        UpdateBranchRequest request,
        IBranchService branchService,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await branchService.UpdateAsync(tenantId, branchId, request, cancellationToken);
            return result.IsSuccess ? Results.Ok(result.Value) : ValidationProblem(result.Errors);
        }
        catch (Exception ex)
        when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(TenantBranchEndpoints)).LogWarning(sqlException, "Database rejected branch update for branch {BranchId} and tenant {TenantId}.", branchId, tenantId);
            return SqlProblemMapper.ToProblem(sqlException);
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(TenantBranchEndpoints)).LogError(ex, "Failed to update branch {BranchId} for tenant {TenantId}.", branchId, tenantId);
            return Results.Problem("Branch could not be updated.");
        }
    }

    private static async Task<IResult> DeactivateBranchAsync(
        Guid tenantId,
        Guid branchId,
        IBranchService branchService,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            await branchService.DeactivateAsync(tenantId, branchId, cancellationToken);
            return Results.NoContent();
        }
        catch (Exception ex)
        when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(TenantBranchEndpoints)).LogWarning(sqlException, "Database rejected branch deactivation for branch {BranchId} and tenant {TenantId}.", branchId, tenantId);
            return SqlProblemMapper.ToProblem(sqlException);
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(TenantBranchEndpoints)).LogError(ex, "Failed to deactivate branch {BranchId} for tenant {TenantId}.", branchId, tenantId);
            return Results.Problem("Branch could not be deactivated.");
        }
    }

    private static async Task<IResult> CreateBranchOrderSettingsAsync(
        Guid tenantId,
        Guid branchId,
        CreateBranchOrderSettingsRequest request,
        IBranchOrderSettingsService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var settings = await service.CreateAsync(tenantId, branchId, request, cancellationToken);
            return Results.Created($"/api/v1/tenants/{tenantId}/branches/{branchId}/order-settings", settings);
        }
        catch (Exception ex)
        when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(TenantBranchEndpoints)).LogWarning(sqlException, "Database rejected order settings creation for branch {BranchId} and tenant {TenantId}.", branchId, tenantId);
            return SqlProblemMapper.ToProblem(sqlException);
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(TenantBranchEndpoints)).LogError(ex, "Failed to create order settings for branch {BranchId} and tenant {TenantId}.", branchId, tenantId);
            return Results.Problem("Branch order settings could not be created.");
        }
    }

    private static async Task<IResult> GetBranchOrderSettingsAsync(
        Guid tenantId,
        Guid branchId,
        IBranchOrderSettingsService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var settings = await service.GetByBranchAsync(tenantId, branchId, cancellationToken);
            return settings is null ? Results.NotFound() : Results.Ok(settings);
        }
        catch (Exception ex)
        when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(TenantBranchEndpoints)).LogWarning(sqlException, "Database failed while reading order settings for branch {BranchId} and tenant {TenantId}.", branchId, tenantId);
            return SqlProblemMapper.ToProblem(sqlException);
        }
    }

    private static async Task<IResult> UpdateBranchOrderSettingsAsync(
        Guid tenantId,
        Guid branchId,
        UpdateBranchOrderSettingsRequest request,
        IBranchOrderSettingsService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var settings = await service.UpdateAsync(tenantId, branchId, request, cancellationToken);
            return Results.Ok(settings);
        }
        catch (Exception ex)
        when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(TenantBranchEndpoints)).LogWarning(sqlException, "Database rejected order settings update for branch {BranchId} and tenant {TenantId}.", branchId, tenantId);
            return SqlProblemMapper.ToProblem(sqlException);
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(TenantBranchEndpoints)).LogError(ex, "Failed to update order settings for branch {BranchId} and tenant {TenantId}.", branchId, tenantId);
            return Results.Problem("Branch order settings could not be updated.");
        }
    }

    private static IResult ValidationProblem(IReadOnlyCollection<ValidationFailure> errors)
    {
        return Results.ValidationProblem(errors
            .GroupBy(error => error.Field)
            .ToDictionary(group => group.Key, group => group.Select(error => error.Message).ToArray()));
    }
}
