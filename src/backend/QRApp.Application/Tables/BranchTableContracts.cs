using QRApp.Application.Menus;

namespace QRApp.Application.Tables;

public sealed record CreateBranchTableRequest(string Name, int DisplayOrder);

public sealed record UpdateBranchTableRequest(string Name, int DisplayOrder, bool IsActive);

public sealed record BranchTableResponse(
    Guid TableId,
    Guid TenantId,
    Guid BranchId,
    string Name,
    int DisplayOrder,
    string QrToken,
    bool IsActive,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc);

public sealed record PublicQrOrderSettingsResponse(
    bool EnableDirectQrOrdering,
    bool RequireCustomerName,
    bool RequireCustomerWhatsApp,
    bool WaiterCallEnabled);

public sealed record PublicQrBillingSettingsResponse(
    bool TaxEnabled,
    string TaxName,
    decimal TaxRate,
    string TaxMode,
    bool ServiceChargeEnabled,
    string ServiceChargeName,
    decimal ServiceChargeRate,
    string RoundingMode);

public sealed record PublicQrMenuResponse(
    Guid BranchId,
    string BranchName,
    string? BranchLogoUrl,
    Guid TableId,
    string TableName,
    string QrToken,
    PublicQrOrderSettingsResponse OrderSettings,
    PublicQrBillingSettingsResponse BillingSettings,
    IReadOnlyCollection<PublicMenuCategoryResponse> Categories)
{
    public IReadOnlyCollection<PublicMenuOfferResponse> Offers { get; init; } = Array.Empty<PublicMenuOfferResponse>();
}

public sealed record PublicQrMenuRecord(
    Guid BranchId,
    string BranchName,
    string? BranchLogoUrl,
    Guid TableId,
    string TableName,
    string QrToken,
    bool EnableDirectQrOrdering,
    bool RequireCustomerName,
    bool RequireCustomerWhatsApp,
    bool WaiterCallEnabled,
    bool TaxEnabled,
    string TaxName,
    decimal TaxRate,
    string TaxMode,
    bool ServiceChargeEnabled,
    string ServiceChargeName,
    decimal ServiceChargeRate,
    string RoundingMode,
    Guid? MenuCategoryId,
    string? CategoryName,
    int? CategoryDisplayOrder,
    Guid? MenuItemId,
    string? ItemName,
    string? Description,
    decimal? Price,
    int? ItemDisplayOrder,
    string? ImageUrl = null,
    string? ImageAltText = null,
    string? VariantsJson = null);
