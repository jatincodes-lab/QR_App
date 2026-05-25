using QRApp.Application.Common;
using QRApp.Shared.Results;

namespace QRApp.Application.Menus;

public sealed class MenuCategoryService(IMenuCategoryRepository repository) : IMenuCategoryService
{
    public async Task<OperationResult<MenuCategoryResponse>> CreateAsync(
        Guid tenantId,
        Guid branchId,
        CreateMenuCategoryRequest request,
        CancellationToken cancellationToken)
    {
        var errors = Validate(request.Name, request.DisplayOrder);
        if (errors.Count > 0)
        {
            return OperationResult<MenuCategoryResponse>.Failed(errors.ToArray());
        }

        var cleaned = new CreateMenuCategoryRequest(TextRules.CleanRequired(request.Name), request.DisplayOrder);
        var category = await repository.CreateAsync(tenantId, branchId, Guid.NewGuid(), cleaned, cancellationToken);
        return OperationResult<MenuCategoryResponse>.Success(category);
    }

    public async Task<OperationResult<MenuCategoryResponse>> UpdateAsync(
        Guid tenantId,
        Guid branchId,
        Guid menuCategoryId,
        UpdateMenuCategoryRequest request,
        CancellationToken cancellationToken)
    {
        var errors = Validate(request.Name, request.DisplayOrder);
        if (errors.Count > 0)
        {
            return OperationResult<MenuCategoryResponse>.Failed(errors.ToArray());
        }

        var cleaned = new UpdateMenuCategoryRequest(
            TextRules.CleanRequired(request.Name),
            request.DisplayOrder,
            request.IsActive);

        var category = await repository.UpdateAsync(tenantId, branchId, menuCategoryId, cleaned, cancellationToken);
        return OperationResult<MenuCategoryResponse>.Success(category);
    }

    public Task<IReadOnlyCollection<MenuCategoryResponse>> GetListByBranchAsync(
        Guid tenantId,
        Guid branchId,
        bool includeInactive,
        CancellationToken cancellationToken)
    {
        return repository.GetListByBranchAsync(tenantId, branchId, includeInactive, cancellationToken);
    }

    public Task DeactivateAsync(Guid tenantId, Guid branchId, Guid menuCategoryId, CancellationToken cancellationToken)
    {
        return repository.DeactivateAsync(tenantId, branchId, menuCategoryId, cancellationToken);
    }

    private static List<ValidationFailure> Validate(string name, int displayOrder)
    {
        var errors = new List<ValidationFailure>();
        var cleanName = TextRules.CleanRequired(name);

        if (cleanName.Length is < 2 or > 120)
        {
            errors.Add(new ValidationFailure(nameof(CreateMenuCategoryRequest.Name), "Menu category name must be between 2 and 120 characters."));
        }

        if (displayOrder < 0)
        {
            errors.Add(new ValidationFailure(nameof(CreateMenuCategoryRequest.DisplayOrder), "Display order cannot be negative."));
        }

        return errors;
    }
}

