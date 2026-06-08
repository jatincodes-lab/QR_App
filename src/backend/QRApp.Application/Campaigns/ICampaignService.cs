using QRApp.Shared.Results;

namespace QRApp.Application.Campaigns;

public interface ICampaignService
{
    Task<OperationResult<CampaignPreviewResponse>> PreviewRecipientsAsync(Guid tenantId, Guid? branchId, string targetSegment, CancellationToken cancellationToken);

    Task<OperationResult<CampaignResponse>> CreateAsync(Guid tenantId, CreateCampaignRequest request, CancellationToken cancellationToken);

    Task<IReadOnlyCollection<CampaignResponse>> GetListAsync(Guid tenantId, Guid? branchId, CancellationToken cancellationToken);
}
