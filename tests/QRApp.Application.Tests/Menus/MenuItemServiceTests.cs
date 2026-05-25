using QRApp.Application.Menus;

namespace QRApp.Application.Tests.Menus;

public sealed class MenuItemServiceTests
{
    [Fact]
    public async Task CreateAsync_WhenRequestIsValid_NormalizesItemText()
    {
        var repository = new FakeMenuItemRepository();
        var service = new MenuItemService(repository);
        var categoryId = Guid.NewGuid();

        var result = await service.CreateAsync(
            Guid.NewGuid(),
            Guid.NewGuid(),
            new CreateMenuItemRequest(categoryId, " Masala Dosa ", "  Crispy dosa  ", 120.50m, true, 5),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("Masala Dosa", repository.CreatedRequest!.Name);
        Assert.Equal("Crispy dosa", repository.CreatedRequest.Description);
        Assert.Equal(120.50m, repository.CreatedRequest.Price);
    }

    [Fact]
    public async Task CreateAsync_WhenPriceIsNegative_ReturnsValidationError()
    {
        var service = new MenuItemService(new FakeMenuItemRepository());

        var result = await service.CreateAsync(
            Guid.NewGuid(),
            Guid.NewGuid(),
            new CreateMenuItemRequest(Guid.NewGuid(), "Masala Dosa", null, -1m, true, 0),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains(result.Errors, error => error.Field == nameof(CreateMenuItemRequest.Price));
    }

    private sealed class FakeMenuItemRepository : IMenuItemRepository
    {
        public CreateMenuItemRequest? CreatedRequest { get; private set; }

        public Task<MenuItemResponse> CreateAsync(
            Guid tenantId,
            Guid branchId,
            Guid menuItemId,
            CreateMenuItemRequest request,
            CancellationToken cancellationToken)
        {
            CreatedRequest = request;
            return Task.FromResult(new MenuItemResponse(menuItemId, tenantId, branchId, request.MenuCategoryId, "Starters", request.Name, request.Description, request.Price, request.IsAvailable, true, request.DisplayOrder, DateTime.UtcNow, null));
        }

        public Task<MenuItemResponse> UpdateAsync(
            Guid tenantId,
            Guid branchId,
            Guid menuItemId,
            UpdateMenuItemRequest request,
            CancellationToken cancellationToken)
        {
            return Task.FromResult(new MenuItemResponse(menuItemId, tenantId, branchId, request.MenuCategoryId, "Starters", request.Name, request.Description, request.Price, request.IsAvailable, request.IsActive, request.DisplayOrder, DateTime.UtcNow, null));
        }

        public Task<IReadOnlyCollection<MenuItemResponse>> GetListByBranchAsync(
            Guid tenantId,
            Guid branchId,
            bool includeInactive,
            CancellationToken cancellationToken)
        {
            return Task.FromResult<IReadOnlyCollection<MenuItemResponse>>(Array.Empty<MenuItemResponse>());
        }

        public Task DeactivateAsync(Guid tenantId, Guid branchId, Guid menuItemId, CancellationToken cancellationToken)
        {
            return Task.CompletedTask;
        }

        public Task<IReadOnlyCollection<PublicMenuItemRecord>> GetPublicMenuByBranchAsync(
            Guid branchId,
            CancellationToken cancellationToken)
        {
            return Task.FromResult<IReadOnlyCollection<PublicMenuItemRecord>>(Array.Empty<PublicMenuItemRecord>());
        }
    }
}

