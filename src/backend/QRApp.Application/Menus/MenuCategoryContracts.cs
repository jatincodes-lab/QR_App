namespace QRApp.Application.Menus;

public sealed record CreateMenuCategoryRequest(string Name, int DisplayOrder);

public sealed record UpdateMenuCategoryRequest(string Name, int DisplayOrder, bool IsActive);

public sealed record MenuCategoryResponse(
    Guid MenuCategoryId,
    Guid TenantId,
    Guid BranchId,
    string Name,
    int DisplayOrder,
    bool IsActive,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc);

