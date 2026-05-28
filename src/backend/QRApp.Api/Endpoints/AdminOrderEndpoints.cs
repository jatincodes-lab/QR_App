using Microsoft.Data.SqlClient;
using QRApp.Api.Errors;
using QRApp.Application.Auth;
using QRApp.Application.Orders;

namespace QRApp.Api.Endpoints;

public static class AdminOrderEndpoints
{
    public static IEndpointRouteBuilder MapAdminOrderEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/admin").RequireAuthorization();

        group.MapGet("/branches/{branchId:guid}/orders", GetOrdersAsync);
        group.MapPut("/branches/{branchId:guid}/orders/{orderId:guid}/status", UpdateStatusAsync);

        return app;
    }

    private static async Task<IResult> GetOrdersAsync(
        Guid branchId,
        bool? includeCompleted,
        ITenantContext tenantContext,
        IAdminOrderService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var orders = await service.GetListByBranchAsync(
                tenantContext.TenantId,
                branchId,
                includeCompleted.GetValueOrDefault(),
                cancellationToken);

            return Results.Ok(orders);
        }
        catch (Exception ex)
        when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(AdminOrderEndpoints)).LogWarning(sqlException, "Database failed while listing orders for branch {BranchId}.", branchId);
            return SqlProblemMapper.ToProblem(sqlException);
        }
    }

    private static async Task<IResult> UpdateStatusAsync(
        Guid branchId,
        Guid orderId,
        UpdateAdminOrderStatusRequest request,
        ITenantContext tenantContext,
        IAdminOrderService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await service.UpdateStatusAsync(tenantContext.TenantId, branchId, orderId, request, cancellationToken);
            return result.IsSuccess ? Results.Ok(result.Value) : ApiProblemResponses.Validation(result.Errors);
        }
        catch (Exception ex)
        when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(AdminOrderEndpoints)).LogWarning(sqlException, "Database rejected order status update for order {OrderId}.", orderId);
            return SqlProblemMapper.ToProblem(sqlException);
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(AdminOrderEndpoints)).LogError(ex, "Failed to update order {OrderId}.", orderId);
            return ApiProblemResponses.ServerError("Order status could not be updated.");
        }
    }
}
