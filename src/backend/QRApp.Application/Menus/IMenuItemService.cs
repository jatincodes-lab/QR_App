using QRApp.Shared.Results;

namespace QRApp.Application.Menus;

public interface IMenuItemService
{
    Task<OperationResult<MenuItemResponse>> CreateAsync(
        Guid tenantId,
        Guid branchId,
        CreateMenuItemRequest request,
        CancellationToken cancellationToken);

    Task<OperationResult<MenuItemResponse>> UpdateAsync(
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

    Task<PublicMenuResponse?> GetPublicMenuByBranchAsync(Guid branchId, CancellationToken cancellationToken);
}

