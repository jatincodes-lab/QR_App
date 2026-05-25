namespace QRApp.Application.Menus;

public interface IMenuCategoryRepository
{
    Task<MenuCategoryResponse> CreateAsync(
        Guid tenantId,
        Guid branchId,
        Guid menuCategoryId,
        CreateMenuCategoryRequest request,
        CancellationToken cancellationToken);

    Task<MenuCategoryResponse> UpdateAsync(
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

