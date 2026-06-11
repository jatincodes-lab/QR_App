namespace QRApp.Application.Menus;

public sealed record CreateMenuItemRequest(
    Guid MenuCategoryId,
    string Name,
    string? Description,
    decimal Price,
    bool IsAvailable,
    int DisplayOrder,
    string? ImageUrl = null,
    string? ImageAltText = null,
    IReadOnlyCollection<MenuItemVariantRequest>? Variants = null);

public sealed record UpdateMenuItemRequest(
    Guid MenuCategoryId,
    string Name,
    string? Description,
    decimal Price,
    bool IsAvailable,
    bool IsActive,
    int DisplayOrder,
    string? ImageUrl = null,
    string? ImageAltText = null,
    IReadOnlyCollection<MenuItemVariantRequest>? Variants = null);

public sealed record MenuItemVariantRequest(
    Guid? MenuItemVariantId,
    string Name,
    decimal Price,
    bool IsAvailable,
    int DisplayOrder);

public sealed record MenuItemVariantResponse(
    Guid MenuItemVariantId,
    Guid MenuItemId,
    string Name,
    decimal Price,
    bool IsAvailable,
    bool IsActive,
    int DisplayOrder);

public sealed record MenuItemResponse(
    Guid MenuItemId,
    Guid TenantId,
    Guid BranchId,
    Guid MenuCategoryId,
    string CategoryName,
    string Name,
    string? Description,
    decimal Price,
    bool IsAvailable,
    bool IsActive,
    int DisplayOrder,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc,
    string? ImageUrl = null,
    string? ImageAltText = null,
    IReadOnlyCollection<MenuItemVariantResponse>? Variants = null);

public sealed record PublicMenuResponse(
    Guid BranchId,
    string BranchName,
    string? BranchLogoUrl,
    IReadOnlyCollection<PublicMenuCategoryResponse> Categories)
{
    public IReadOnlyCollection<PublicMenuOfferResponse> Offers { get; init; } = Array.Empty<PublicMenuOfferResponse>();
}

public sealed record PublicMenuCategoryResponse(
    Guid MenuCategoryId,
    string Name,
    int DisplayOrder,
    IReadOnlyCollection<PublicMenuItemResponse> Items);

public sealed record PublicMenuItemResponse(
    Guid MenuItemId,
    string Name,
    string? Description,
    decimal Price,
    int DisplayOrder,
    string? ImageUrl = null,
    string? ImageAltText = null,
    IReadOnlyCollection<PublicMenuItemVariantResponse>? Variants = null);

public sealed record PublicMenuItemVariantResponse(
    Guid MenuItemVariantId,
    string Name,
    decimal Price,
    int DisplayOrder);

public sealed record PublicMenuItemRecord(
    Guid BranchId,
    string BranchName,
    string? BranchLogoUrl,
    Guid MenuCategoryId,
    string CategoryName,
    int CategoryDisplayOrder,
    Guid MenuItemId,
    string ItemName,
    string? Description,
    decimal Price,
    int ItemDisplayOrder,
    string? ImageUrl = null,
    string? ImageAltText = null,
    string? VariantsJson = null);

public sealed record PublicMenuOfferResponse(
    Guid BranchOfferId,
    string Title,
    string? Subtitle,
    string? DiscountText,
    string? ImageUrl,
    string? ImageAltText,
    int DisplayOrder,
    string DiscountTypeCode,
    decimal DiscountValue,
    decimal MinimumOrderAmount,
    decimal? MaxDiscountAmount,
    bool AutoApply);
