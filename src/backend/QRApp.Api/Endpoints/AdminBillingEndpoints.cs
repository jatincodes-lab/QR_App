using Microsoft.Data.SqlClient;
using QRApp.Api.Errors;
using QRApp.Application.Auth;
using QRApp.Application.Tenants;

namespace QRApp.Api.Endpoints;

public static class AdminBillingEndpoints
{
    public static IEndpointRouteBuilder MapAdminBillingEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/admin/billing").RequireAuthorization();

        group.MapGet("/subscription", GetSubscriptionAsync);
        group.MapPut("/subscription", UpdateSubscriptionAsync);
        group.MapPost("/subscription/extend-trial", ExtendTrialAsync);
        group.MapPost("/subscription/reactivate", ReactivateAsync);
        group.MapPost("/subscription/suspend", SuspendAsync);

        return app;
    }

    private static async Task<IResult> GetSubscriptionAsync(
        ITenantContext tenantContext,
        ITenantSubscriptionService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        if (!IsOwner(tenantContext))
        {
            return ApiProblemResponses.Forbidden("Only owner accounts can manage subscription access.");
        }

        try
        {
            var subscription = await service.GetCurrentAsync(tenantContext.TenantId, cancellationToken);
            return subscription is null
                ? ApiProblemResponses.NotFound("Tenant subscription was not found.")
                : Results.Ok(subscription);
        }
        catch (Exception ex) when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(AdminBillingEndpoints)).LogWarning(sqlException, "Database failed while reading tenant subscription.");
            return SqlProblemMapper.ToProblem(sqlException);
        }
    }

    private static async Task<IResult> UpdateSubscriptionAsync(
        UpdateTenantSubscriptionRequest request,
        ITenantContext tenantContext,
        ITenantSubscriptionService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        return await ExecuteChangeAsync(
            tenantContext,
            loggerFactory,
            () => service.UpdateManualAsync(tenantContext.TenantId, request, cancellationToken),
            "Tenant subscription could not be updated.");
    }

    private static async Task<IResult> ExtendTrialAsync(
        ExtendTenantTrialRequest request,
        ITenantContext tenantContext,
        ITenantSubscriptionService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        return await ExecuteChangeAsync(
            tenantContext,
            loggerFactory,
            () => service.ExtendTrialAsync(tenantContext.TenantId, request, cancellationToken),
            "Tenant trial could not be extended.");
    }

    private static async Task<IResult> ReactivateAsync(
        TenantSubscriptionActionRequest request,
        ITenantContext tenantContext,
        ITenantSubscriptionService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        return await ExecuteChangeAsync(
            tenantContext,
            loggerFactory,
            () => service.ReactivateManualAsync(tenantContext.TenantId, request, cancellationToken),
            "Tenant subscription could not be reactivated.");
    }

    private static async Task<IResult> SuspendAsync(
        TenantSubscriptionActionRequest request,
        ITenantContext tenantContext,
        ITenantSubscriptionService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        return await ExecuteChangeAsync(
            tenantContext,
            loggerFactory,
            () => service.SuspendAsync(tenantContext.TenantId, request, cancellationToken),
            "Tenant subscription could not be suspended.");
    }

    private static async Task<IResult> ExecuteChangeAsync(
        ITenantContext tenantContext,
        ILoggerFactory loggerFactory,
        Func<Task<QRApp.Shared.Results.OperationResult<TenantSubscriptionResponse>>> action,
        string fallbackMessage)
    {
        if (!IsOwner(tenantContext))
        {
            return ApiProblemResponses.Forbidden("Only owner accounts can manage subscription access.");
        }

        try
        {
            var result = await action();
            return result.IsSuccess ? Results.Ok(result.Value) : ApiProblemResponses.Validation(result.Errors);
        }
        catch (Exception ex) when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(AdminBillingEndpoints)).LogWarning(sqlException, "Database rejected tenant subscription update.");
            return SqlProblemMapper.ToProblem(sqlException);
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(AdminBillingEndpoints)).LogError(ex, "Failed to update tenant subscription.");
            return ApiProblemResponses.ServerError(fallbackMessage);
        }
    }

    private static bool IsOwner(ITenantContext tenantContext)
    {
        return string.Equals(tenantContext.RoleCode, "owner", StringComparison.OrdinalIgnoreCase);
    }
}
