namespace QRApp.Application.Campaigns;

public interface ICampaignRepository
{
    Task<CampaignPreviewResponse> PreviewRecipientsAsync(Guid tenantId, Guid? branchId, string targetSegment, CancellationToken cancellationToken);

    Task<CampaignResponse> CreateAsync(Guid tenantId, Guid campaignId, CreateCampaignRequest request, CancellationToken cancellationToken);

    Task<IReadOnlyCollection<CampaignResponse>> GetListAsync(Guid tenantId, Guid? branchId, CancellationToken cancellationToken);
}
