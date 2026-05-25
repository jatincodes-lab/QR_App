using QRApp.Shared.Results;

namespace QRApp.Application.Menus;

public interface IMenuCategoryService
{
    Task<OperationResult<MenuCategoryResponse>> CreateAsync(
        Guid tenantId,
        Guid branchId,
        CreateMenuCategoryRequest request,
        CancellationToken cancellationToken);

    Task<OperationResult<MenuCategoryResponse>> UpdateAsync(
        Guid tenantId,
        Guid branchId,
        Guid menuCategoryId,
        UpdateMenuCategoryRequest request,
        CancellationToken cancellationToken);

    Task<IReadOnlyCollection<MenuCategoryResponse>> GetListByBranchAsync(
        Guid tenantId,
        Guid branchId,
        bool includeInactive,
        CancellationToken cancellationToken);

    Task DeactivateAsync(Guid tenantId, Guid branchId, Guid menuCategoryId, CancellationToken cancellationToken);
}

