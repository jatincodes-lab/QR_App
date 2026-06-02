using QRApp.Application.Common;
using QRApp.Shared.Results;

namespace QRApp.Application.Menus;

public sealed class BranchOfferService(IBranchOfferRepository repository) : IBranchOfferService
{
    public async Task<OperationResult<BranchOfferResponse>> CreateAsync(
        Guid tenantId,
        Guid branchId,
        CreateBranchOfferRequest request,
        CancellationToken cancellationToken)
    {
        var errors = Validate(request.Title, request.Subtitle, request.DiscountText, request.ImageUrl, request.ImageAltText, request.DisplayOrder, request.StartsAtUtc, request.EndsAtUtc);
        if (errors.Count > 0)
        {
            return OperationResult<BranchOfferResponse>.Failed(errors.ToArray());
        }

        var cleaned = new CreateBranchOfferRequest(
            TextRules.CleanRequired(request.Title),
            TextRules.CleanOptional(request.Subtitle),
            TextRules.CleanOptional(request.DiscountText),
            TextRules.CleanOptional(request.ImageUrl),
            TextRules.CleanOptional(request.ImageAltText),
            request.DisplayOrder,
            request.StartsAtUtc,
            request.EndsAtUtc);

        var offer = await repository.CreateAsync(tenantId, branchId, Guid.NewGuid(), cleaned, cancellationToken);
        return OperationResult<BranchOfferResponse>.Success(offer);
    }

    public async Task<OperationResult<BranchOfferResponse>> UpdateAsync(
        Guid tenantId,
        Guid branchId,
        Guid branchOfferId,
        UpdateBranchOfferRequest request,
        CancellationToken cancellationToken)
    {
        var errors = Validate(request.Title, request.Subtitle, request.DiscountText, request.ImageUrl, request.ImageAltText, request.DisplayOrder, request.StartsAtUtc, request.EndsAtUtc);
        if (errors.Count > 0)
        {
            return OperationResult<BranchOfferResponse>.Failed(errors.ToArray());
        }

        var cleaned = new UpdateBranchOfferRequest(
            TextRules.CleanRequired(request.Title),
            TextRules.CleanOptional(request.Subtitle),
            TextRules.CleanOptional(request.DiscountText),
            TextRules.CleanOptional(request.ImageUrl),
            TextRules.CleanOptional(request.ImageAltText),
            request.DisplayOrder,
            request.IsActive,
            request.StartsAtUtc,
            request.EndsAtUtc);

        var offer = await repository.UpdateAsync(tenantId, branchId, branchOfferId, cleaned, cancellationToken);
        return OperationResult<BranchOfferResponse>.Success(offer);
    }

    public Task<IReadOnlyCollection<BranchOfferResponse>> GetListByBranchAsync(Guid tenantId, Guid branchId, bool includeInactive, CancellationToken cancellationToken)
    {
        return repository.GetListByBranchAsync(tenantId, branchId, includeInactive, cancellationToken);
    }

    public Task<IReadOnlyCollection<PublicMenuOfferResponse>> GetPublicByQrTokenAsync(string qrToken, CancellationToken cancellationToken)
    {
        return repository.GetPublicByQrTokenAsync(TextRules.CleanRequired(qrToken), cancellationToken);
    }

    public Task DeactivateAsync(Guid tenantId, Guid branchId, Guid branchOfferId, CancellationToken cancellationToken)
    {
        return repository.DeactivateAsync(tenantId, branchId, branchOfferId, cancellationToken);
    }

    private static List<ValidationFailure> Validate(
        string title,
        string? subtitle,
        string? discountText,
        string? imageUrl,
        string? imageAltText,
        int displayOrder,
        DateTime? startsAtUtc,
        DateTime? endsAtUtc)
    {
        var errors = new List<ValidationFailure>();
        var cleanTitle = TextRules.CleanRequired(title);

        if (cleanTitle.Length is < 2 or > 160)
        {
            errors.Add(new ValidationFailure(nameof(CreateBranchOfferRequest.Title), "Offer title must be between 2 and 160 characters."));
        }

        if (TextRules.CleanOptional(subtitle)?.Length > 300)
        {
            errors.Add(new ValidationFailure(nameof(CreateBranchOfferRequest.Subtitle), "Offer subtitle cannot exceed 300 characters."));
        }

        if (TextRules.CleanOptional(discountText)?.Length > 80)
        {
            errors.Add(new ValidationFailure(nameof(CreateBranchOfferRequest.DiscountText), "Offer discount text cannot exceed 80 characters."));
        }

        if (TextRules.CleanOptional(imageUrl)?.Length > 1000)
        {
            errors.Add(new ValidationFailure(nameof(CreateBranchOfferRequest.ImageUrl), "Offer image URL cannot exceed 1000 characters."));
        }

        if (TextRules.CleanOptional(imageAltText)?.Length > 200)
        {
            errors.Add(new ValidationFailure(nameof(CreateBranchOfferRequest.ImageAltText), "Offer image alt text cannot exceed 200 characters."));
        }

        if (displayOrder < 0)
        {
            errors.Add(new ValidationFailure(nameof(CreateBranchOfferRequest.DisplayOrder), "Display order cannot be negative."));
        }

        if (startsAtUtc.HasValue && endsAtUtc.HasValue && startsAtUtc.Value > endsAtUtc.Value)
        {
            errors.Add(new ValidationFailure(nameof(CreateBranchOfferRequest.EndsAtUtc), "Offer end date must be after the start date."));
        }

        return errors;
    }
}
