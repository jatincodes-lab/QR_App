using QRApp.Application.Common;
using QRApp.Shared.Results;

namespace QRApp.Application.Campaigns;

public sealed class CampaignService(ICampaignRepository repository) : ICampaignService
{
    private static readonly HashSet<string> AllowedSegments = new(StringComparer.OrdinalIgnoreCase)
    {
        "AllOptedIn",
        "RepeatCustomers",
        "InactiveCustomers",
        "HighValueCustomers"
    };

    public async Task<OperationResult<CampaignPreviewResponse>> PreviewRecipientsAsync(Guid tenantId, Guid? branchId, string targetSegment, CancellationToken cancellationToken)
    {
        var segment = TextRules.CleanRequired(targetSegment);
        if (!AllowedSegments.Contains(segment))
        {
            return OperationResult<CampaignPreviewResponse>.Failed(new ValidationFailure("TargetSegment", "Campaign target segment is invalid."));
        }

        var normalizedSegment = NormalizeSegment(segment);
        var preview = await repository.PreviewRecipientsAsync(tenantId, branchId, normalizedSegment, cancellationToken);
        return OperationResult<CampaignPreviewResponse>.Success(preview);
    }

    public async Task<OperationResult<CampaignResponse>> CreateAsync(Guid tenantId, CreateCampaignRequest request, CancellationToken cancellationToken)
    {
        var cleanName = TextRules.CleanRequired(request.Name);
        var cleanSegment = TextRules.CleanRequired(request.TargetSegment);
        var cleanMessage = TextRules.CleanRequired(request.MessageText);
        var errors = new List<ValidationFailure>();

        if (cleanName.Length is < 3 or > 120)
        {
            errors.Add(new ValidationFailure(nameof(CreateCampaignRequest.Name), "Campaign name must be between 3 and 120 characters."));
        }

        if (!AllowedSegments.Contains(cleanSegment))
        {
            errors.Add(new ValidationFailure(nameof(CreateCampaignRequest.TargetSegment), "Campaign target segment is invalid."));
        }

        if (cleanMessage.Length is < 5 or > 1000)
        {
            errors.Add(new ValidationFailure(nameof(CreateCampaignRequest.MessageText), "Campaign message must be between 5 and 1000 characters."));
        }

        if (errors.Count > 0)
        {
            return OperationResult<CampaignResponse>.Failed(errors.ToArray());
        }

        var cleaned = new CreateCampaignRequest(
            request.BranchId,
            cleanName,
            NormalizeSegment(cleanSegment),
            cleanMessage);

        var campaign = await repository.CreateAsync(tenantId, Guid.NewGuid(), cleaned, cancellationToken);
        return OperationResult<CampaignResponse>.Success(campaign);
    }

    public Task<IReadOnlyCollection<CampaignResponse>> GetListAsync(Guid tenantId, Guid? branchId, CancellationToken cancellationToken)
    {
        return repository.GetListAsync(tenantId, branchId, cancellationToken);
    }

    private static string NormalizeSegment(string segment)
    {
        return AllowedSegments.First(item => string.Equals(item, segment, StringComparison.OrdinalIgnoreCase));
    }
}
