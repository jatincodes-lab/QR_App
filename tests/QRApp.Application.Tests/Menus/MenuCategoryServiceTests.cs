using QRApp.Application.Menus;

namespace QRApp.Application.Tests.Menus;

public sealed class MenuCategoryServiceTests
{
    [Fact]
    public async Task CreateAsync_WhenRequestIsValid_NormalizesCategoryName()
    {
        var repository = new FakeMenuCategoryRepository();
        var service = new MenuCategoryService(repository);

        var result = await service.CreateAsync(
            Guid.NewGuid(),
            Guid.NewGuid(),
            new CreateMenuCategoryRequest(" Starters ", 10),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("Starters", repository.CreatedRequest!.Name);
        Assert.Equal(10, repository.CreatedRequest.DisplayOrder);
    }

    [Fact]
    public async Task CreateAsync_WhenDisplayOrderIsNegative_ReturnsValidationError()
    {
        var service = new MenuCategoryService(new FakeMenuCategoryRepository());

        var result = await service.CreateAsync(
            Guid.NewGuid(),
            Guid.NewGuid(),
            new CreateMenuCategoryRequest("Starters", -1),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains(result.Errors, error => error.Field == nameof(CreateMenuCategoryRequest.DisplayOrder));
    }

    private sealed class FakeMenuCategoryRepository : IMenuCategoryRepository
    {
        public CreateMenuCategoryRequest? CreatedRequest { get; private set; }

        public Task<MenuCategoryResponse> CreateAsync(
            Guid tenantId,
            Guid branchId,
            Guid menuCategoryId,
            CreateMenuCategoryRequest request,
            CancellationToken cancellationToken)
        {
            CreatedRequest = request;
            return Task.FromResult(new MenuCategoryResponse(menuCategoryId, tenantId, branchId, request.Name, request.DisplayOrder, true, DateTime.UtcNow, null));
        }

        public Task<MenuCategoryResponse> UpdateAsync(
            Guid tenantId,
            Guid branchId,
            Guid menuCategoryId,
            UpdateMenuCategoryRequest request,
            CancellationToken cancellationToken)
        {
            return Task.FromResult(new MenuCategoryResponse(menuCategoryId, tenantId, branchId, request.Name, request.DisplayOrder, request.IsActive, DateTime.UtcNow, null));
        }

        public Task<IReadOnlyCollection<MenuCategoryResponse>> GetListByBranchAsync(
            Guid tenantId,
            Guid branchId,
            bool includeInactive,
            CancellationToken cancellationToken)
        {
            return Task.FromResult<IReadOnlyCollection<MenuCategoryResponse>>(Array.Empty<MenuCategoryResponse>());
        }

        public Task DeactivateAsync(Guid tenantId, Guid branchId, Guid menuCategoryId, CancellationToken cancellationToken)
        {
            return Task.CompletedTask;
        }
    }
}

