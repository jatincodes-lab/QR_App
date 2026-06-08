using Microsoft.Data.SqlClient;
using QRApp.Api.Errors;
using QRApp.Application.Auth;
using QRApp.Application.Staff;

namespace QRApp.Api.Endpoints;

public static class AdminStaffEndpoints
{
    public static IEndpointRouteBuilder MapAdminStaffEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/admin/staff").RequireAuthorization();

        group.MapGet("", GetListAsync);
        group.MapPost("", CreateAsync);
        group.MapPut("/{userId:guid}", UpdateAsync);

        return app;
    }

    private static async Task<IResult> GetListAsync(
        bool? includeInactive,
        ITenantContext tenantContext,
        IStaffUserService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        if (!IsOwner(tenantContext))
        {
            return ApiProblemResponses.Forbidden("Only owner accounts can manage staff.");
        }

        try
        {
            return Results.Ok(await service.GetListAsync(tenantContext.TenantId, includeInactive.GetValueOrDefault(), cancellationToken));
        }
        catch (Exception ex) when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(AdminStaffEndpoints)).LogWarning(sqlException, "Database failed while listing staff users.");
            return SqlProblemMapper.ToProblem(sqlException);
        }
    }

    private static async Task<IResult> CreateAsync(
        CreateStaffUserRequest request,
        ITenantContext tenantContext,
        IStaffUserService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        if (!IsOwner(tenantContext))
        {
            return ApiProblemResponses.Forbidden("Only owner accounts can create staff.");
        }

        try
        {
            var result = await service.CreateAsync(tenantContext.TenantId, request, cancellationToken);
            return result.IsSuccess
                ? Results.Created($"/api/v1/admin/staff/{result.Value!.UserId}", result.Value)
                : ApiProblemResponses.Validation(result.Errors);
        }
        catch (Exception ex) when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(AdminStaffEndpoints)).LogWarning(sqlException, "Database rejected staff user creation.");
            return SqlProblemMapper.ToProblem(sqlException);
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(AdminStaffEndpoints)).LogError(ex, "Failed to create staff user.");
            return ApiProblemResponses.ServerError("Staff user could not be created.");
        }
    }

    private static async Task<IResult> UpdateAsync(
        Guid userId,
        UpdateStaffUserRequest request,
        ITenantContext tenantContext,
        IStaffUserService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        if (!IsOwner(tenantContext))
        {
            return ApiProblemResponses.Forbidden("Only owner accounts can update staff.");
        }

        try
        {
            var result = await service.UpdateAsync(tenantContext.TenantId, userId, request, cancellationToken);
            return result.IsSuccess ? Results.Ok(result.Value) : ApiProblemResponses.Validation(result.Errors);
        }
        catch (Exception ex) when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(AdminStaffEndpoints)).LogWarning(sqlException, "Database rejected staff user update for {UserId}.", userId);
            return SqlProblemMapper.ToProblem(sqlException);
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(AdminStaffEndpoints)).LogError(ex, "Failed to update staff user {UserId}.", userId);
            return ApiProblemResponses.ServerError("Staff user could not be updated.");
        }
    }

    private static bool IsOwner(ITenantContext tenantContext)
    {
        return string.Equals(tenantContext.RoleCode, "owner", StringComparison.OrdinalIgnoreCase);
    }
}
