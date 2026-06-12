using Microsoft.Data.SqlClient;
using QRApp.Api.Auth;
using QRApp.Api.Errors;
using QRApp.Application.Auth;
using QRApp.Application.Feedback;

namespace QRApp.Api.Endpoints;

public static class FeedbackEndpoints
{
    public static IEndpointRouteBuilder MapFeedbackEndpoints(this IEndpointRouteBuilder app)
    {
        var publicGroup = app.MapGroup("/api/v1/public").AllowAnonymous();
        publicGroup.MapGet("/qr/{qrToken}/orders/{orderId:guid}/feedback", GetPublicFeedbackAsync);
        publicGroup.MapPost("/qr/{qrToken}/orders/{orderId:guid}/feedback", CreatePublicFeedbackAsync);

        var adminGroup = app.MapGroup("/api/v1/admin").RequireAuthorization();
        adminGroup.MapGet("/feedback", GetAdminFeedbackAsync);

        return app;
    }

    private static async Task<IResult> CreatePublicFeedbackAsync(
        string qrToken,
        Guid orderId,
        CreateOrderFeedbackRequest request,
        IFeedbackService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await service.CreatePublicAsync(qrToken, orderId, request, cancellationToken);
            return result.IsSuccess
                ? Results.Created($"/api/v1/public/qr/{qrToken}/orders/{orderId}/feedback", result.Value)
                : ApiProblemResponses.Validation(result.Errors);
        }
        catch (Exception ex) when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(FeedbackEndpoints)).LogWarning(sqlException, "Database rejected order feedback creation.");
            return SqlProblemMapper.ToProblem(sqlException);
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(FeedbackEndpoints)).LogError(ex, "Failed to create order feedback.");
            return ApiProblemResponses.ServerError("Feedback could not be saved.");
        }
    }

    private static async Task<IResult> GetPublicFeedbackAsync(
        string qrToken,
        Guid orderId,
        IFeedbackService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await service.GetPublicByOrderAsync(qrToken, orderId, cancellationToken);
            return result.IsSuccess ? Results.Ok(result.Value) : ApiProblemResponses.Validation(result.Errors);
        }
        catch (Exception ex) when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(FeedbackEndpoints)).LogWarning(sqlException, "Database rejected order feedback lookup.");
            return SqlProblemMapper.ToProblem(sqlException);
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(FeedbackEndpoints)).LogError(ex, "Failed to read order feedback.");
            return ApiProblemResponses.ServerError("Feedback could not be read.");
        }
    }

    private static async Task<IResult> GetAdminFeedbackAsync(
        Guid? branchId,
        ITenantContext tenantContext,
        IFeedbackService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var feedback = await service.GetAdminListAsync(tenantContext.TenantId, branchId, cancellationToken);
            return Results.Ok(feedback);
        }
        catch (Exception ex) when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(FeedbackEndpoints)).LogWarning(sqlException, "Database failed while listing feedback.");
            return SqlProblemMapper.ToProblem(sqlException);
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(FeedbackEndpoints)).LogError(ex, "Failed to list feedback.");
            return ApiProblemResponses.ServerError("Feedback could not be read.");
        }
    }
}
