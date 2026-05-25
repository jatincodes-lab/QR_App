using Microsoft.Data.SqlClient;
using QRApp.Api.Errors;
using QRApp.Application.Auth;
using QRApp.Application.Menus;
using QRApp.Shared.Results;

namespace QRApp.Api.Endpoints;

public static class AdminMenuEndpoints
{
    public static IEndpointRouteBuilder MapAdminMenuEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/admin").RequireAuthorization();

        group.MapPost("/branches/{branchId:guid}/menu-categories", CreateCategoryAsync);
        group.MapGet("/branches/{branchId:guid}/menu-categories", GetCategoriesAsync);
        group.MapPut("/branches/{branchId:guid}/menu-categories/{menuCategoryId:guid}", UpdateCategoryAsync);
        group.MapDelete("/branches/{branchId:guid}/menu-categories/{menuCategoryId:guid}", DeactivateCategoryAsync);

        group.MapPost("/branches/{branchId:guid}/menu-items", CreateItemAsync);
        group.MapGet("/branches/{branchId:guid}/menu-items", GetItemsAsync);
        group.MapPut("/branches/{branchId:guid}/menu-items/{menuItemId:guid}", UpdateItemAsync);
        group.MapDelete("/branches/{branchId:guid}/menu-items/{menuItemId:guid}", DeactivateItemAsync);

        return app;
    }

    private static async Task<IResult> CreateCategoryAsync(
        Guid branchId,
        CreateMenuCategoryRequest request,
        ITenantContext tenantContext,
        IMenuCategoryService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await service.CreateAsync(tenantContext.TenantId, branchId, request, cancellationToken);
            return result.IsSuccess
                ? Results.Created($"/api/v1/admin/branches/{branchId}/menu-categories/{result.Value!.MenuCategoryId}", result.Value)
                : ValidationProblem(result.Errors);
        }
        catch (Exception ex)
        when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(AdminMenuEndpoints)).LogWarning(sqlException, "Database rejected menu category creation for branch {BranchId}.", branchId);
            return SqlProblemMapper.ToProblem(sqlException);
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(AdminMenuEndpoints)).LogError(ex, "Failed to create menu category for branch {BranchId}.", branchId);
            return Results.Problem("Menu category could not be created.");
        }
    }

    private static async Task<IResult> GetCategoriesAsync(
        Guid branchId,
        bool? includeInactive,
        ITenantContext tenantContext,
        IMenuCategoryService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var categories = await service.GetListByBranchAsync(
                tenantContext.TenantId,
                branchId,
                includeInactive.GetValueOrDefault(),
                cancellationToken);

            return Results.Ok(categories);
        }
        catch (Exception ex)
        when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(AdminMenuEndpoints)).LogWarning(sqlException, "Database failed while listing menu categories for branch {BranchId}.", branchId);
            return SqlProblemMapper.ToProblem(sqlException);
        }
    }

    private static async Task<IResult> UpdateCategoryAsync(
        Guid branchId,
        Guid menuCategoryId,
        UpdateMenuCategoryRequest request,
        ITenantContext tenantContext,
        IMenuCategoryService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await service.UpdateAsync(tenantContext.TenantId, branchId, menuCategoryId, request, cancellationToken);
            return result.IsSuccess ? Results.Ok(result.Value) : ValidationProblem(result.Errors);
        }
        catch (Exception ex)
        when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(AdminMenuEndpoints)).LogWarning(sqlException, "Database rejected menu category update for category {MenuCategoryId}.", menuCategoryId);
            return SqlProblemMapper.ToProblem(sqlException);
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(AdminMenuEndpoints)).LogError(ex, "Failed to update menu category {MenuCategoryId}.", menuCategoryId);
            return Results.Problem("Menu category could not be updated.");
        }
    }

    private static async Task<IResult> DeactivateCategoryAsync(
        Guid branchId,
        Guid menuCategoryId,
        ITenantContext tenantContext,
        IMenuCategoryService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            await service.DeactivateAsync(tenantContext.TenantId, branchId, menuCategoryId, cancellationToken);
            return Results.NoContent();
        }
        catch (Exception ex)
        when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(AdminMenuEndpoints)).LogWarning(sqlException, "Database rejected menu category deactivation for category {MenuCategoryId}.", menuCategoryId);
            return SqlProblemMapper.ToProblem(sqlException);
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(AdminMenuEndpoints)).LogError(ex, "Failed to deactivate menu category {MenuCategoryId}.", menuCategoryId);
            return Results.Problem("Menu category could not be deactivated.");
        }
    }

    private static async Task<IResult> CreateItemAsync(
        Guid branchId,
        CreateMenuItemRequest request,
        ITenantContext tenantContext,
        IMenuItemService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await service.CreateAsync(tenantContext.TenantId, branchId, request, cancellationToken);
            return result.IsSuccess
                ? Results.Created($"/api/v1/admin/branches/{branchId}/menu-items/{result.Value!.MenuItemId}", result.Value)
                : ValidationProblem(result.Errors);
        }
        catch (Exception ex)
        when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(AdminMenuEndpoints)).LogWarning(sqlException, "Database rejected menu item creation for branch {BranchId}.", branchId);
            return SqlProblemMapper.ToProblem(sqlException);
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(AdminMenuEndpoints)).LogError(ex, "Failed to create menu item for branch {BranchId}.", branchId);
            return Results.Problem("Menu item could not be created.");
        }
    }

    private static async Task<IResult> GetItemsAsync(
        Guid branchId,
        bool? includeInactive,
        ITenantContext tenantContext,
        IMenuItemService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var items = await service.GetListByBranchAsync(
                tenantContext.TenantId,
                branchId,
                includeInactive.GetValueOrDefault(),
                cancellationToken);

            return Results.Ok(items);
        }
        catch (Exception ex)
        when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(AdminMenuEndpoints)).LogWarning(sqlException, "Database failed while listing menu items for branch {BranchId}.", branchId);
            return SqlProblemMapper.ToProblem(sqlException);
        }
    }

    private static async Task<IResult> UpdateItemAsync(
        Guid branchId,
        Guid menuItemId,
        UpdateMenuItemRequest request,
        ITenantContext tenantContext,
        IMenuItemService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await service.UpdateAsync(tenantContext.TenantId, branchId, menuItemId, request, cancellationToken);
            return result.IsSuccess ? Results.Ok(result.Value) : ValidationProblem(result.Errors);
        }
        catch (Exception ex)
        when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(AdminMenuEndpoints)).LogWarning(sqlException, "Database rejected menu item update for item {MenuItemId}.", menuItemId);
            return SqlProblemMapper.ToProblem(sqlException);
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(AdminMenuEndpoints)).LogError(ex, "Failed to update menu item {MenuItemId}.", menuItemId);
            return Results.Problem("Menu item could not be updated.");
        }
    }

    private static async Task<IResult> DeactivateItemAsync(
        Guid branchId,
        Guid menuItemId,
        ITenantContext tenantContext,
        IMenuItemService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            await service.DeactivateAsync(tenantContext.TenantId, branchId, menuItemId, cancellationToken);
            return Results.NoContent();
        }
        catch (Exception ex)
        when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(AdminMenuEndpoints)).LogWarning(sqlException, "Database rejected menu item deactivation for item {MenuItemId}.", menuItemId);
            return SqlProblemMapper.ToProblem(sqlException);
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(AdminMenuEndpoints)).LogError(ex, "Failed to deactivate menu item {MenuItemId}.", menuItemId);
            return Results.Problem("Menu item could not be deactivated.");
        }
    }

    private static IResult ValidationProblem(IReadOnlyCollection<ValidationFailure> errors)
    {
        return Results.ValidationProblem(errors
            .GroupBy(error => error.Field)
            .ToDictionary(group => group.Key, group => group.Select(error => error.Message).ToArray()));
    }
}

