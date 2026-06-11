using QRApp.Shared.Results;

namespace QRApp.Application.Menus;

public sealed record CreateBranchOfferRequest(
    string Title,
    string? Subtitle,
    string? DiscountText,
    string? ImageUrl,
    string? ImageAltText,
    int DisplayOrder,
    DateTime? StartsAtUtc = null,
    DateTime? EndsAtUtc = null,
    string DiscountTypeCode = "DisplayOnly",
    decimal DiscountValue = 0,
    decimal MinimumOrderAmount = 0,
    decimal? MaxDiscountAmount = null,
    bool AutoApply = false);

public sealed record UpdateBranchOfferRequest(
    string Title,
    string? Subtitle,
    string? DiscountText,
    string? ImageUrl,
    string? ImageAltText,
    int DisplayOrder,
    bool IsActive,
    DateTime? StartsAtUtc = null,
    DateTime? EndsAtUtc = null,
    string DiscountTypeCode = "DisplayOnly",
    decimal DiscountValue = 0,
    decimal MinimumOrderAmount = 0,
    decimal? MaxDiscountAmount = null,
    bool AutoApply = false);

public sealed record BranchOfferResponse(
    Guid BranchOfferId,
    Guid TenantId,
    Guid BranchId,
    string Title,
    string? Subtitle,
    string? DiscountText,
    string? ImageUrl,
    string? ImageAltText,
    int DisplayOrder,
    bool IsActive,
    DateTime? StartsAtUtc,
    DateTime? EndsAtUtc,
    string DiscountTypeCode,
    decimal DiscountValue,
    decimal MinimumOrderAmount,
    decimal? MaxDiscountAmount,
    bool AutoApply,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc);

public interface IBranchOfferRepository
{
    Task<BranchOfferResponse> CreateAsync(Guid tenantId, Guid branchId, Guid branchOfferId, CreateBranchOfferRequest request, CancellationToken cancellationToken);

    Task<BranchOfferResponse> UpdateAsync(Guid tenantId, Guid branchId, Guid branchOfferId, UpdateBranchOfferRequest request, CancellationToken cancellationToken);

    Task<IReadOnlyCollection<BranchOfferResponse>> GetListByBranchAsync(Guid tenantId, Guid branchId, bool includeInactive, CancellationToken cancellationToken);

    Task<IReadOnlyCollection<PublicMenuOfferResponse>> GetPublicByQrTokenAsync(string qrToken, CancellationToken cancellationToken);

    Task DeactivateAsync(Guid tenantId, Guid branchId, Guid branchOfferId, CancellationToken cancellationToken);
}

public interface IBranchOfferService
{
    Task<OperationResult<BranchOfferResponse>> CreateAsync(Guid tenantId, Guid branchId, CreateBranchOfferRequest request, CancellationToken cancellationToken);

    Task<OperationResult<BranchOfferResponse>> UpdateAsync(Guid tenantId, Guid branchId, Guid branchOfferId, UpdateBranchOfferRequest request, CancellationToken cancellationToken);

    Task<IReadOnlyCollection<BranchOfferResponse>> GetListByBranchAsync(Guid tenantId, Guid branchId, bool includeInactive, CancellationToken cancellationToken);

    Task<IReadOnlyCollection<PublicMenuOfferResponse>> GetPublicByQrTokenAsync(string qrToken, CancellationToken cancellationToken);

    Task DeactivateAsync(Guid tenantId, Guid branchId, Guid branchOfferId, CancellationToken cancellationToken);
}
