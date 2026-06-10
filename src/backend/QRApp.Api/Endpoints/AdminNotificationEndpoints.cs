using Microsoft.Data.SqlClient;
using QRApp.Api.Errors;
using QRApp.Application.Auth;
using QRApp.Application.Notifications;

namespace QRApp.Api.Endpoints;

public static class AdminNotificationEndpoints
{
    public static IEndpointRouteBuilder MapAdminNotificationEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/admin").RequireAuthorization();

        group.MapGet("/notifications", GetNotificationsAsync);
        group.MapPost("/notifications/{notificationId:guid}/read", MarkReadAsync);
        group.MapPost("/notifications/read-all", MarkAllReadAsync);
        group.MapGet("/search", SearchAsync);

        return app;
    }

    private static async Task<IResult> GetNotificationsAsync(
        Guid? branchId,
        ITenantContext tenantContext,
        IAdminNotificationService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var notifications = await service.GetListAsync(tenantContext.TenantId, branchId, cancellationToken);
            return Results.Ok(notifications);
        }
        catch (Exception ex)
        when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(AdminNotificationEndpoints)).LogWarning(sqlException, "Database failed while listing admin notifications.");
            return SqlProblemMapper.ToProblem(sqlException);
        }
    }

    private static async Task<IResult> MarkReadAsync(
        Guid notificationId,
        ITenantContext tenantContext,
        IAdminNotificationService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            await service.MarkReadAsync(tenantContext.TenantId, notificationId, cancellationToken);
            return Results.NoContent();
        }
        catch (Exception ex)
        when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(AdminNotificationEndpoints)).LogWarning(sqlException, "Database failed while marking notification {NotificationId} read.", notificationId);
            return SqlProblemMapper.ToProblem(sqlException);
        }
    }

    private static async Task<IResult> MarkAllReadAsync(
        Guid? branchId,
        ITenantContext tenantContext,
        IAdminNotificationService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            await service.MarkAllReadAsync(tenantContext.TenantId, branchId, cancellationToken);
            return Results.NoContent();
        }
        catch (Exception ex)
        when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(AdminNotificationEndpoints)).LogWarning(sqlException, "Database failed while marking notifications read.");
            return SqlProblemMapper.ToProblem(sqlException);
        }
    }

    private static async Task<IResult> SearchAsync(
        string q,
        Guid? branchId,
        ITenantContext tenantContext,
        IAdminNotificationService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var results = await service.SearchAsync(tenantContext.TenantId, branchId, q, cancellationToken);
            return Results.Ok(results);
        }
        catch (Exception ex)
        when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(AdminNotificationEndpoints)).LogWarning(sqlException, "Database failed while running admin search.");
            return SqlProblemMapper.ToProblem(sqlException);
        }
    }
}
