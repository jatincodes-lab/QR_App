namespace QRApp.Application.Menus;

public interface IMenuItemRepository
{
    Task<MenuItemResponse> CreateAsync(
        Guid tenantId,
        Guid branchId,
        Guid menuItemId,
        CreateMenuItemRequest request,
        CancellationToken cancellationToken);

    Task<MenuItemResponse> UpdateAsync(
        Guid tenantId,
        Guid branchId,
        Guid menuItemId,
        UpdateMenuItemRequest request,
        CancellationToken cancellationToken);

    Task<IReadOnlyCollection<MenuItemResponse>> GetListByBranchAsync(
        Guid tenantId,
        Guid branchId,
        bool includeInactive,
        CancellationToken cancellationToken);

    Task DeactivateAsync(Guid tenantId, Guid branchId, Guid menuItemId, CancellationToken cancellationToken);

    Task<IReadOnlyCollection<PublicMenuItemRecord>> GetPublicMenuByBranchAsync(
        Guid branchId,
        CancellationToken cancellationToken);
}

