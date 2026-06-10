using Microsoft.Data.SqlClient;
using QRApp.Api.Errors;
using QRApp.Api.Hubs;
using QRApp.Application.Notifications;
using QRApp.Application.Orders;

namespace QRApp.Api.Endpoints;

public static class PublicOrderEndpoints
{
    public static IEndpointRouteBuilder MapPublicOrderEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/public");

        group.MapPost("/qr/{qrToken}/orders", CreateOrderAsync).AllowAnonymous();
        group.MapGet("/qr/{qrToken}/orders/{orderId:guid}", GetOrderAsync).AllowAnonymous();

        return app;
    }

    private static async Task<IResult> CreateOrderAsync(
        string qrToken,
        CreatePublicQrOrderRequest request,
        IOrderService orderService,
        IAdminNotificationService notificationService,
        IAdminOrderRealtimeNotifier realtimeNotifier,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await orderService.CreateFromQrTokenAsync(qrToken, request, cancellationToken);
            if (!result.IsSuccess)
            {
                return ApiProblemResponses.Validation(result.Errors);
            }

            var order = result.Value!;
            try
            {
                await notificationService.CreateAsync(
                    order.TenantId,
                    new CreateAdminNotificationRequest(
                        order.BranchId,
                        "order-created",
                        "New order received",
                        $"Order {ShortId(order.OrderId)} placed with {order.Items.Count} item{(order.Items.Count == 1 ? "" : "s")}.",
                        "/admin/orders"),
                    cancellationToken);
            }
            catch (Exception notificationException)
            {
                loggerFactory.CreateLogger(nameof(PublicOrderEndpoints)).LogWarning(notificationException, "Order {OrderId} was created, but its admin notification could not be stored.", order.OrderId);
            }

            await realtimeNotifier.OrderCreatedAsync(order, cancellationToken);
            return Results.Created($"/api/v1/public/orders/{order.OrderId}", order);
        }
        catch (Exception ex)
        when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(PublicOrderEndpoints)).LogWarning(sqlException, "Database rejected public QR order creation.");
            return SqlProblemMapper.ToProblem(sqlException);
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(PublicOrderEndpoints)).LogError(ex, "Failed to create public QR order.");
            return ApiProblemResponses.ServerError("Order could not be created.");
        }
    }

    private static async Task<IResult> GetOrderAsync(
        string qrToken,
        Guid orderId,
        IOrderService orderService,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await orderService.GetByQrTokenAsync(qrToken, orderId, cancellationToken);
            return result.IsSuccess
                ? Results.Ok(result.Value)
                : ApiProblemResponses.Validation(result.Errors);
        }
        catch (Exception ex)
        when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(PublicOrderEndpoints)).LogWarning(sqlException, "Database rejected public QR order lookup.");
            return SqlProblemMapper.ToProblem(sqlException);
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(PublicOrderEndpoints)).LogError(ex, "Failed to read public QR order.");
            return ApiProblemResponses.ServerError("Order could not be read.");
        }
    }

    private static string ShortId(Guid id)
    {
        return id.ToString("N")[^6..].ToUpperInvariant();
    }
}
