namespace QRApp.Application.Menus;

public sealed record CreateMenuItemRequest(
    Guid MenuCategoryId,
    string Name,
    string? Description,
    decimal Price,
    bool IsAvailable,
    int DisplayOrder);

public sealed record UpdateMenuItemRequest(
    Guid MenuCategoryId,
    string Name,
    string? Description,
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
    DateTime? UpdatedAtUtc);

public sealed record PublicMenuResponse(
    Guid BranchId,
    string BranchName,
    IReadOnlyCollection<PublicMenuCategoryResponse> Categories);

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
    int DisplayOrder);

public sealed record PublicMenuItemRecord(
    Guid BranchId,
    string BranchName,
    Guid MenuCategoryId,
    string CategoryName,
    int CategoryDisplayOrder,
    Guid MenuItemId,
    string ItemName,
    string? Description,
    decimal Price,
    int ItemDisplayOrder);

