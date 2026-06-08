using Microsoft.Data.SqlClient;
using QRApp.Api.Errors;
using QRApp.Application.Auth;
using QRApp.Application.Campaigns;

namespace QRApp.Api.Endpoints;

public static class AdminCampaignEndpoints
{
    public static IEndpointRouteBuilder MapAdminCampaignEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/admin/campaigns").RequireAuthorization();

        group.MapGet("", GetListAsync);
        group.MapGet("/preview", PreviewAsync);
        group.MapPost("", CreateAsync);

        return app;
    }

    private static async Task<IResult> GetListAsync(
        Guid? branchId,
        ITenantContext tenantContext,
        ICampaignService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            return Results.Ok(await service.GetListAsync(tenantContext.TenantId, branchId, cancellationToken));
        }
        catch (Exception ex) when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(AdminCampaignEndpoints)).LogWarning(sqlException, "Database failed while listing campaigns.");
            return SqlProblemMapper.ToProblem(sqlException);
        }
    }

    private static async Task<IResult> PreviewAsync(
        Guid? branchId,
        string targetSegment,
        ITenantContext tenantContext,
        ICampaignService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await service.PreviewRecipientsAsync(tenantContext.TenantId, branchId, targetSegment, cancellationToken);
            if (!result.IsSuccess)
            {
                return ApiProblemResponses.Validation(result.Errors);
            }

            return Results.Ok(result.Value);
        }
        catch (Exception ex) when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(AdminCampaignEndpoints)).LogWarning(sqlException, "Database failed while previewing campaign recipients.");
            return SqlProblemMapper.ToProblem(sqlException);
        }
    }

    private static async Task<IResult> CreateAsync(
        CreateCampaignRequest request,
        ITenantContext tenantContext,
        ICampaignService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await service.CreateAsync(tenantContext.TenantId, request, cancellationToken);
            if (!result.IsSuccess)
            {
                return ApiProblemResponses.Validation(result.Errors);
            }

            return Results.Created($"/api/v1/admin/campaigns/{result.Value!.CampaignId}", result.Value);
        }
        catch (Exception ex) when (ex is SqlException)
        {
            var sqlException = (SqlException)ex;
            loggerFactory.CreateLogger(nameof(AdminCampaignEndpoints)).LogWarning(sqlException, "Database rejected campaign creation.");
            return SqlProblemMapper.ToProblem(sqlException);
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(AdminCampaignEndpoints)).LogError(ex, "Failed to create campaign.");
            return ApiProblemResponses.ServerError("Campaign could not be created.");
        }
    }
}
