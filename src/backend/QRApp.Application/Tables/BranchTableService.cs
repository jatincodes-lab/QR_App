using System.Security.Cryptography;
using System.Text.Json;
using QRApp.Application.Common;
using QRApp.Application.Menus;
using QRApp.Shared.Results;

namespace QRApp.Application.Tables;

public sealed class BranchTableService(IBranchTableRepository repository, IBranchOfferRepository offerRepository) : IBranchTableService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private const int MinQrTokenLength = 8;
    private const int MaxQrTokenLength = 80;

    public async Task<OperationResult<BranchTableResponse>> CreateAsync(
        Guid tenantId,
        Guid branchId,
        CreateBranchTableRequest request,
        CancellationToken cancellationToken)
    {
        var errors = Validate(request.Name, request.DisplayOrder);
        if (errors.Count > 0)
        {
            return OperationResult<BranchTableResponse>.Failed(errors.ToArray());
        }

        var cleaned = new CreateBranchTableRequest(
            TextRules.CleanRequired(request.Name),
            request.DisplayOrder);

        var table = await repository.CreateAsync(
            tenantId,
            branchId,
            Guid.NewGuid(),
            CreateQrToken(),
            cleaned,
            cancellationToken);

        return OperationResult<BranchTableResponse>.Success(table);
    }

    public async Task<OperationResult<BranchTableResponse>> UpdateAsync(
        Guid tenantId,
        Guid branchId,
        Guid tableId,
        UpdateBranchTableRequest request,
        CancellationToken cancellationToken)
    {
        var errors = Validate(request.Name, request.DisplayOrder);
        if (errors.Count > 0)
        {
            return OperationResult<BranchTableResponse>.Failed(errors.ToArray());
        }

        var cleaned = new UpdateBranchTableRequest(
            TextRules.CleanRequired(request.Name),
            request.DisplayOrder,
            request.IsActive);

        var table = await repository.UpdateAsync(tenantId, branchId, tableId, cleaned, cancellationToken);
        return OperationResult<BranchTableResponse>.Success(table);
    }

    public Task<IReadOnlyCollection<BranchTableResponse>> GetListByBranchAsync(
        Guid tenantId,
        Guid branchId,
        bool includeInactive,
        CancellationToken cancellationToken)
    {
        return repository.GetListByBranchAsync(tenantId, branchId, includeInactive, cancellationToken);
    }

    public Task DeactivateAsync(Guid tenantId, Guid branchId, Guid tableId, CancellationToken cancellationToken)
    {
        return repository.DeactivateAsync(tenantId, branchId, tableId, cancellationToken);
    }

    public Task<BranchTableResponse> RegenerateQrTokenAsync(
        Guid tenantId,
        Guid branchId,
        Guid tableId,
        CancellationToken cancellationToken)
    {
        return repository.RegenerateQrTokenAsync(tenantId, branchId, tableId, CreateQrToken(), cancellationToken);
    }

    public async Task<PublicQrMenuResponse?> GetPublicMenuByQrTokenAsync(string qrToken, CancellationToken cancellationToken)
    {
        var cleanToken = TextRules.CleanRequired(qrToken);
        if (cleanToken.Length is < MinQrTokenLength or > MaxQrTokenLength)
        {
            return null;
        }

        var rows = await repository.GetPublicMenuByQrTokenAsync(cleanToken, cancellationToken);
        var offers = await offerRepository.GetPublicByQrTokenAsync(cleanToken, cancellationToken);
        var first = rows.FirstOrDefault();
        if (first is null)
        {
            return null;
        }

        var categories = rows
            .Where(row => row.MenuCategoryId.HasValue && row.MenuItemId.HasValue)
            .GroupBy(row => new
            {
                MenuCategoryId = row.MenuCategoryId!.Value,
                row.CategoryName,
                CategoryDisplayOrder = row.CategoryDisplayOrder!.Value
            })
            .Select(group => new PublicMenuCategoryResponse(
                group.Key.MenuCategoryId,
                group.Key.CategoryName!,
                group.Key.CategoryDisplayOrder,
                group.Select(row => new PublicMenuItemResponse(
                    row.MenuItemId!.Value,
                    row.ItemName!,
                    row.Description,
                    row.Price!.Value,
                    row.ItemDisplayOrder!.Value,
                    row.ImageUrl,
                    row.ImageAltText,
                    ReadPublicVariants(row.VariantsJson))).ToArray()))
            .ToArray();

        return new PublicQrMenuResponse(
            first.BranchId,
            first.BranchName,
            first.BranchLogoUrl,
            first.TableId,
            first.TableName,
            first.QrToken,
            new PublicQrOrderSettingsResponse(
                first.EnableDirectQrOrdering,
                first.RequireCustomerName,
                first.RequireCustomerWhatsApp,
                first.WaiterCallEnabled),
            new PublicQrBillingSettingsResponse(
                first.TaxEnabled,
                first.TaxName,
                first.TaxRate,
                first.TaxMode,
                first.ServiceChargeEnabled,
                first.ServiceChargeName,
                first.ServiceChargeRate,
                first.RoundingMode),
            categories)
        {
            Offers = offers
        };
    }

    private static List<ValidationFailure> Validate(string name, int displayOrder)
    {
        var errors = new List<ValidationFailure>();
        var cleanName = TextRules.CleanRequired(name);

        if (cleanName.Length is < 1 or > 80)
        {
            errors.Add(new ValidationFailure(nameof(CreateBranchTableRequest.Name), "Table name must be between 1 and 80 characters."));
        }

        if (displayOrder < 0)
        {
            errors.Add(new ValidationFailure(nameof(CreateBranchTableRequest.DisplayOrder), "Display order cannot be negative."));
        }

        return errors;
    }

    private static string CreateQrToken()
    {
        return Convert.ToHexString(RandomNumberGenerator.GetBytes(24)).ToLowerInvariant();
    }

    private static IReadOnlyCollection<PublicMenuItemVariantResponse> ReadPublicVariants(string? variantsJson)
    {
        if (string.IsNullOrWhiteSpace(variantsJson))
        {
            return Array.Empty<PublicMenuItemVariantResponse>();
        }

        return JsonSerializer.Deserialize<PublicMenuItemVariantResponse[]>(variantsJson, JsonOptions) ?? Array.Empty<PublicMenuItemVariantResponse>();
    }
}
