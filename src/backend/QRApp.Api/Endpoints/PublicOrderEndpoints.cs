using Microsoft.Data.SqlClient;
using QRApp.Api.Errors;
using QRApp.Application.Orders;

namespace QRApp.Api.Endpoints;

public static class PublicOrderEndpoints
{
    public static IEndpointRouteBuilder MapPublicOrderEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/public");

        group.MapPost("/qr/{qrToken}/orders", CreateOrderAsync).AllowAnonymous();

        return app;
    }

    private static async Task<IResult> CreateOrderAsync(
        string qrToken,
        CreatePublicQrOrderRequest request,
        IOrderService orderService,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await orderService.CreateFromQrTokenAsync(qrToken, request, cancellationToken);
            return result.IsSuccess
                ? Results.Created($"/api/v1/public/orders/{result.Value!.OrderId}", result.Value)
                : ApiProblemResponses.Validation(result.Errors);
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
}
