namespace QRApp.Application.Campaigns;

public sealed record CreateCampaignRequest(
    Guid? BranchId,
    string Name,
    string TargetSegment,
    string MessageText);

public sealed record CampaignPreviewResponse(int RecipientCount);

public sealed record CampaignResponse(
    Guid CampaignId,
    Guid TenantId,
    Guid? BranchId,
    string? BranchName,
    string Name,
    string TargetSegment,
    string MessageText,
    string StatusCode,
    int RecipientCount,
    int SentCount,
    int FailedCount,
    DateTime CreatedAtUtc,
    DateTime? QueuedAtUtc,
    DateTime? StartedAtUtc,
    DateTime? CompletedAtUtc,
    DateTime? UpdatedAtUtc);
