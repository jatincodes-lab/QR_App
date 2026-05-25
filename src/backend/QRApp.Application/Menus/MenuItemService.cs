using QRApp.Application.Common;
using QRApp.Shared.Results;

namespace QRApp.Application.Menus;

public sealed class MenuItemService(IMenuItemRepository repository) : IMenuItemService
{
    public async Task<OperationResult<MenuItemResponse>> CreateAsync(
        Guid tenantId,
        Guid branchId,
        CreateMenuItemRequest request,
        CancellationToken cancellationToken)
    {
        var errors = Validate(request.MenuCategoryId, request.Name, request.Description, request.Price, request.DisplayOrder);
        if (errors.Count > 0)
        {
            return OperationResult<MenuItemResponse>.Failed(errors.ToArray());
        }

        var cleaned = new CreateMenuItemRequest(
            request.MenuCategoryId,
            TextRules.CleanRequired(request.Name),
            TextRules.CleanOptional(request.Description),
            request.Price,
            request.IsAvailable,
            request.DisplayOrder);

        var item = await repository.CreateAsync(tenantId, branchId, Guid.NewGuid(), cleaned, cancellationToken);
        return OperationResult<MenuItemResponse>.Success(item);
    }

    public async Task<OperationResult<MenuItemResponse>> UpdateAsync(
        Guid tenantId,
        Guid branchId,
        Guid menuItemId,
        UpdateMenuItemRequest request,
        CancellationToken cancellationToken)
    {
        var errors = Validate(request.MenuCategoryId, request.Name, request.Description, request.Price, request.DisplayOrder);
        if (errors.Count > 0)
        {
            return OperationResult<MenuItemResponse>.Failed(errors.ToArray());
        }

        var cleaned = new UpdateMenuItemRequest(
            request.MenuCategoryId,
            TextRules.CleanRequired(request.Name),
            TextRules.CleanOptional(request.Description),
            request.Price,
            request.IsAvailable,
            request.IsActive,
            request.DisplayOrder);

        var item = await repository.UpdateAsync(tenantId, branchId, menuItemId, cleaned, cancellationToken);
        return OperationResult<MenuItemResponse>.Success(item);
    }

    public Task<IReadOnlyCollection<MenuItemResponse>> GetListByBranchAsync(
        Guid tenantId,
        Guid branchId,
        bool includeInactive,
        CancellationToken cancellationToken)
    {
        return repository.GetListByBranchAsync(tenantId, branchId, includeInactive, cancellationToken);
    }

    public Task DeactivateAsync(Guid tenantId, Guid branchId, Guid menuItemId, CancellationToken cancellationToken)
    {
        return repository.DeactivateAsync(tenantId, branchId, menuItemId, cancellationToken);
    }

    public async Task<PublicMenuResponse?> GetPublicMenuByBranchAsync(Guid branchId, CancellationToken cancellationToken)
    {
        var rows = await repository.GetPublicMenuByBranchAsync(branchId, cancellationToken);
        var first = rows.FirstOrDefault();
        if (first is null)
        {
            return null;
        }

        var categories = rows
            .GroupBy(row => new { row.MenuCategoryId, row.CategoryName, row.CategoryDisplayOrder })
            .Select(group => new PublicMenuCategoryResponse(
                group.Key.MenuCategoryId,
                group.Key.CategoryName,
                group.Key.CategoryDisplayOrder,
                group.Select(row => new PublicMenuItemResponse(
                    row.MenuItemId,
                    row.ItemName,
                    row.Description,
                    row.Price,
                    row.ItemDisplayOrder)).ToArray()))
            .ToArray();

        return new PublicMenuResponse(first.BranchId, first.BranchName, categories);
    }

    private static List<ValidationFailure> Validate(
        Guid menuCategoryId,
        string name,
        string? description,
        decimal price,
        int displayOrder)
    {
        var errors = new List<ValidationFailure>();
        var cleanName = TextRules.CleanRequired(name);
        var cleanDescription = TextRules.CleanOptional(description);

        if (menuCategoryId == Guid.Empty)
        {
            errors.Add(new ValidationFailure(nameof(CreateMenuItemRequest.MenuCategoryId), "Menu category is required."));
        }

        if (cleanName.Length is < 2 or > 160)
        {
            errors.Add(new ValidationFailure(nameof(CreateMenuItemRequest.Name), "Menu item name must be between 2 and 160 characters."));
        }

        if (cleanDescription?.Length > 1000)
        {
            errors.Add(new ValidationFailure(nameof(CreateMenuItemRequest.Description), "Menu item description cannot exceed 1000 characters."));
        }

        if (price is < 0 or > 99999999.99m)
        {
            errors.Add(new ValidationFailure(nameof(CreateMenuItemRequest.Price), "Menu item price must be between 0 and 99999999.99."));
        }

        if (displayOrder < 0)
        {
            errors.Add(new ValidationFailure(nameof(CreateMenuItemRequest.DisplayOrder), "Display order cannot be negative."));
        }

        return errors;
    }
}

