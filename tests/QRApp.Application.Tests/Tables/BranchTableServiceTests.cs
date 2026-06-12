using QRApp.Application.Menus;
using QRApp.Application.Tables;

namespace QRApp.Application.Tests.Tables;

public sealed class BranchTableServiceTests
{
    [Fact]
    public async Task CreateAsync_WhenRequestIsValid_NormalizesNameAndGeneratesQrToken()
    {
        var repository = new FakeBranchTableRepository();
        var service = new BranchTableService(repository, new FakeBranchOfferRepository());

        var result = await service.CreateAsync(
            Guid.NewGuid(),
            Guid.NewGuid(),
            new CreateBranchTableRequest(" Table 7 ", 20),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("Table 7", repository.CreatedRequest!.Name);
        Assert.Equal(20, repository.CreatedRequest.DisplayOrder);
        Assert.Equal(48, repository.CreatedQrToken!.Length);
    }

    [Fact]
    public async Task CreateAsync_WhenDisplayOrderIsNegative_ReturnsValidationError()
    {
        var service = new BranchTableService(new FakeBranchTableRepository(), new FakeBranchOfferRepository());

        var result = await service.CreateAsync(
            Guid.NewGuid(),
            Guid.NewGuid(),
            new CreateBranchTableRequest("Table 1", -1),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains(result.Errors, error => error.Field == nameof(CreateBranchTableRequest.DisplayOrder));
    }

    [Fact]
    public async Task GetPublicMenuByQrTokenAsync_WhenTokenExists_ReturnsTableContextAndGroupedMenu()
    {
        var branchId = Guid.NewGuid();
        var tableId = Guid.NewGuid();
        var categoryId = Guid.NewGuid();
        var firstItemId = Guid.NewGuid();
        var secondItemId = Guid.NewGuid();
        var repository = new FakeBranchTableRepository
        {
            PublicRows =
            [
                new PublicQrMenuRecord(branchId, "Cafe", null, tableId, "Table 1", "token-123456789012", true, true, false, true, false, "GST", 0m, "Exclusive", false, "Service charge", 0m, "None", categoryId, "Mains", 1, firstItemId, "Paneer Roll", null, 120m, 1),
                new PublicQrMenuRecord(branchId, "Cafe", null, tableId, "Table 1", "token-123456789012", true, true, false, true, false, "GST", 0m, "Exclusive", false, "Service charge", 0m, "None", categoryId, "Mains", 1, secondItemId, "Veg Burger", "With fries", 180m, 2)
            ]
        };
        var service = new BranchTableService(repository, new FakeBranchOfferRepository());

        var menu = await service.GetPublicMenuByQrTokenAsync(" token-123456789012 ", CancellationToken.None);

        Assert.NotNull(menu);
        Assert.Equal(tableId, menu.TableId);
        Assert.True(menu.OrderSettings.EnableDirectQrOrdering);
        var category = Assert.Single(menu.Categories);
        Assert.Equal("Mains", category.Name);
        Assert.Equal(2, category.Items.Count);
    }

    [Fact]
    public async Task GetPublicMenuByQrTokenAsync_WhenDemoTokenExists_NormalizesAndReadsMenu()
    {
        var branchId = Guid.NewGuid();
        var tableId = Guid.NewGuid();
        var categoryId = Guid.NewGuid();
        var itemId = Guid.NewGuid();
        var repository = new FakeBranchTableRepository
        {
            PublicRows =
            [
                new PublicQrMenuRecord(branchId, "Cafe", null, tableId, "Table 1", "demo-table-1", true, true, false, true, false, "GST", 0m, "Exclusive", false, "Service charge", 0m, "None", categoryId, "Beverages", 1, itemId, "Masala Tea", null, 25m, 1)
            ]
        };
        var service = new BranchTableService(repository, new FakeBranchOfferRepository());

        var menu = await service.GetPublicMenuByQrTokenAsync(" demo-table-1 ", CancellationToken.None);

        Assert.NotNull(menu);
        Assert.Equal("demo-table-1", repository.PublicQrToken);
        Assert.Equal("demo-table-1", menu.QrToken);
    }

    private sealed class FakeBranchTableRepository : IBranchTableRepository
    {
        public CreateBranchTableRequest? CreatedRequest { get; private set; }
        public string? CreatedQrToken { get; private set; }
        public string? PublicQrToken { get; private set; }
        public IReadOnlyCollection<PublicQrMenuRecord> PublicRows { get; init; } = Array.Empty<PublicQrMenuRecord>();

        public Task<BranchTableResponse> CreateAsync(
            Guid tenantId,
            Guid branchId,
            Guid tableId,
            string qrToken,
            CreateBranchTableRequest request,
            CancellationToken cancellationToken)
        {
            CreatedRequest = request;
            CreatedQrToken = qrToken;
            return Task.FromResult(new BranchTableResponse(tableId, tenantId, branchId, request.Name, request.DisplayOrder, qrToken, true, DateTime.UtcNow, null));
        }

        public Task<BranchTableResponse> UpdateAsync(
            Guid tenantId,
            Guid branchId,
            Guid tableId,
            UpdateBranchTableRequest request,
            CancellationToken cancellationToken)
        {
            return Task.FromResult(new BranchTableResponse(tableId, tenantId, branchId, request.Name, request.DisplayOrder, "token", request.IsActive, DateTime.UtcNow, null));
        }

        public Task<IReadOnlyCollection<BranchTableResponse>> GetListByBranchAsync(
            Guid tenantId,
            Guid branchId,
            bool includeInactive,
            CancellationToken cancellationToken)
        {
            return Task.FromResult<IReadOnlyCollection<BranchTableResponse>>(Array.Empty<BranchTableResponse>());
        }

        public Task DeactivateAsync(Guid tenantId, Guid branchId, Guid tableId, CancellationToken cancellationToken)
        {
            return Task.CompletedTask;
        }

        public Task<BranchTableResponse> RegenerateQrTokenAsync(
            Guid tenantId,
            Guid branchId,
            Guid tableId,
            string qrToken,
            CancellationToken cancellationToken)
        {
            return Task.FromResult(new BranchTableResponse(tableId, tenantId, branchId, "Table 1", 0, qrToken, true, DateTime.UtcNow, null));
        }

        public Task<IReadOnlyCollection<PublicQrMenuRecord>> GetPublicMenuByQrTokenAsync(
            string qrToken,
            CancellationToken cancellationToken)
        {
            PublicQrToken = qrToken;
            return Task.FromResult(PublicRows);
        }
    }

    private sealed class FakeBranchOfferRepository : IBranchOfferRepository
    {
        public Task<BranchOfferResponse> CreateAsync(Guid tenantId, Guid branchId, Guid branchOfferId, CreateBranchOfferRequest request, CancellationToken cancellationToken)
        {
            throw new NotImplementedException();
        }

        public Task<BranchOfferResponse> UpdateAsync(Guid tenantId, Guid branchId, Guid branchOfferId, UpdateBranchOfferRequest request, CancellationToken cancellationToken)
        {
            throw new NotImplementedException();
        }

        public Task<IReadOnlyCollection<BranchOfferResponse>> GetListByBranchAsync(Guid tenantId, Guid branchId, bool includeInactive, CancellationToken cancellationToken)
        {
            return Task.FromResult<IReadOnlyCollection<BranchOfferResponse>>(Array.Empty<BranchOfferResponse>());
        }

        public Task<IReadOnlyCollection<PublicMenuOfferResponse>> GetPublicByQrTokenAsync(string qrToken, CancellationToken cancellationToken)
        {
            return Task.FromResult<IReadOnlyCollection<PublicMenuOfferResponse>>(Array.Empty<PublicMenuOfferResponse>());
        }

        public Task DeactivateAsync(Guid tenantId, Guid branchId, Guid branchOfferId, CancellationToken cancellationToken)
        {
            return Task.CompletedTask;
        }
    }
}
