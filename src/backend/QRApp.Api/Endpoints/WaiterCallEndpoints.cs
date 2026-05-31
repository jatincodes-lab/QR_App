using Microsoft.Data.SqlClient;
using QRApp.Api.Errors;
using QRApp.Api.Hubs;
using QRApp.Application.Auth;
using QRApp.Application.WaiterCalls;

namespace QRApp.Api.Endpoints;

public static class WaiterCallEndpoints
{
    public static IEndpointRouteBuilder MapWaiterCallEndpoints(this IEndpointRouteBuilder app)
    {
        var publicGroup = app.MapGroup("/api/v1/public").AllowAnonymous();
        publicGroup.MapPost("/qr/{qrToken}/waiter-calls", CreateAsync);

        var adminGroup = app.MapGroup("/api/v1/admin").RequireAuthorization();
        adminGroup.MapGet("/branches/{branchId:guid}/waiter-calls", GetListAsync);
        adminGroup.MapPut("/branches/{branchId:guid}/waiter-calls/{waiterCallId:guid}/status", UpdateStatusAsync);

        return app;
    }

    private static async Task<IResult> CreateAsync(
        string qrToken,
        CreateWaiterCallRequest request,
        IWaiterCallService service,
        IAdminOrderRealtimeNotifier realtimeNotifier,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await service.CreateFromQrTokenAsync(qrToken, request, cancellationToken);
            if (!result.IsSuccess)
            {
                return ApiProblemResponses.Validation(result.Errors);
            }

            var waiterCall = result.Value!;
            await realtimeNotifier.WaiterCallCreatedAsync(waiterCall, cancellationToken);
            return Results.Created($"/api/v1/public/waiter-calls/{waiterCall.WaiterCallId}", waiterCall);
        }
        catch (Exception ex)
        when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(WaiterCallEndpoints)).LogWarning(sqlException, "Database rejected waiter call creation.");
            return SqlProblemMapper.ToProblem(sqlException);
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(WaiterCallEndpoints)).LogError(ex, "Failed to create waiter call.");
            return ApiProblemResponses.ServerError("Waiter call could not be created.");
        }
    }

    private static async Task<IResult> GetListAsync(
        Guid branchId,
        bool? includeResolved,
        ITenantContext tenantContext,
        IWaiterCallService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var calls = await service.GetListByBranchAsync(
                tenantContext.TenantId,
                branchId,
                includeResolved.GetValueOrDefault(),
                cancellationToken);

            return Results.Ok(calls);
        }
        catch (Exception ex)
        when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(WaiterCallEndpoints)).LogWarning(sqlException, "Database failed while listing waiter calls for branch {BranchId}.", branchId);
            return SqlProblemMapper.ToProblem(sqlException);
        }
    }

    private static async Task<IResult> UpdateStatusAsync(
        Guid branchId,
        Guid waiterCallId,
        UpdateWaiterCallStatusRequest request,
        ITenantContext tenantContext,
        IWaiterCallService service,
        IAdminOrderRealtimeNotifier realtimeNotifier,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await service.UpdateStatusAsync(tenantContext.TenantId, branchId, waiterCallId, request, cancellationToken);
            if (!result.IsSuccess)
            {
                return ApiProblemResponses.Validation(result.Errors);
            }

            await realtimeNotifier.WaiterCallStatusUpdatedAsync(result.Value!, cancellationToken);
            return Results.Ok(result.Value);
        }
        catch (Exception ex)
        when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(WaiterCallEndpoints)).LogWarning(sqlException, "Database rejected waiter call status update for {WaiterCallId}.", waiterCallId);
            return SqlProblemMapper.ToProblem(sqlException);
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(WaiterCallEndpoints)).LogError(ex, "Failed to update waiter call {WaiterCallId}.", waiterCallId);
            return ApiProblemResponses.ServerError("Waiter call status could not be updated.");
        }
    }
}
