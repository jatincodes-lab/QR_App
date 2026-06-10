using Microsoft.Data.SqlClient;
using QRApp.Api.Errors;
using QRApp.Api.Hubs;
using QRApp.Application.Auth;
using QRApp.Application.Notifications;
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
        IAdminNotificationService notificationService,
        IAdminOrderRealtimeNotifier realtimeNotifier,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await service.UpdateStatusAsync(tenantContext.TenantId, branchId, orderId, request, cancellationToken);
            if (!result.IsSuccess)
            {
                return ApiProblemResponses.Validation(result.Errors);
            }

            try
            {
                await notificationService.CreateAsync(
                    tenantContext.TenantId,
                    new CreateAdminNotificationRequest(
                        branchId,
                        "order-status-updated",
                        "Order status updated",
                        $"Order {ShortId(orderId)} is now {result.Value!.OrderStatusCode}.",
                        "/admin/orders"),
                    cancellationToken);
            }
            catch (Exception notificationException)
            {
                loggerFactory.CreateLogger(nameof(AdminOrderEndpoints)).LogWarning(notificationException, "Order {OrderId} status was updated, but its admin notification could not be stored.", orderId);
            }

            await realtimeNotifier.OrderStatusUpdatedAsync(result.Value!, cancellationToken);
            return Results.Ok(result.Value);
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

    private static string ShortId(Guid id)
    {
        return id.ToString("N")[^6..].ToUpperInvariant();
    }
}
