using QRApp.Application.Orders;

namespace QRApp.Application.Tests.Orders;

public sealed class OrderServiceTests
{
    [Fact]
    public async Task CreateFromQrTokenAsync_WhenRequestIsValid_NormalizesFieldsAndAggregatesDuplicateItems()
    {
        var itemId = Guid.NewGuid();
        var repository = new FakeOrderRepository();
        var service = new OrderService(repository);

        var result = await service.CreateFromQrTokenAsync(
            " token-123456789012 ",
            new CreatePublicQrOrderRequest(
                " Priya ",
                " 9876543210 ",
                " Less spicy ",
                [
                    new CreatePublicQrOrderItemRequest(itemId, 1),
                    new CreatePublicQrOrderItemRequest(itemId, 2)
                ]),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("token-123456789012", repository.QrToken);
        Assert.Equal("Priya", repository.Request!.CustomerName);
        Assert.Equal("9876543210", repository.Request.CustomerWhatsApp);
        Assert.Equal("Less spicy", repository.Request.Notes);
        var item = Assert.Single(repository.Request.Items);
        Assert.Equal(itemId, item.MenuItemId);
        Assert.Equal(3, item.Quantity);
    }

    [Fact]
    public async Task CreateFromQrTokenAsync_WhenQrTokenIsInvalid_ReturnsValidationError()
    {
        var service = new OrderService(new FakeOrderRepository());

        var result = await service.CreateFromQrTokenAsync(
            "short",
            new CreatePublicQrOrderRequest(null, null, null, [new CreatePublicQrOrderItemRequest(Guid.NewGuid(), 1)]),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains(result.Errors, error => error.Field == "QrToken");
    }

    [Fact]
    public async Task CreateFromQrTokenAsync_WhenItemsAreMissing_ReturnsValidationError()
    {
        var service = new OrderService(new FakeOrderRepository());

        var result = await service.CreateFromQrTokenAsync(
            "token-123456789012",
            new CreatePublicQrOrderRequest(null, null, null, []),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains(result.Errors, error => error.Field == nameof(CreatePublicQrOrderRequest.Items));
    }

    [Fact]
    public async Task CreateFromQrTokenAsync_WhenQuantityIsOutsideRange_ReturnsValidationError()
    {
        var service = new OrderService(new FakeOrderRepository());

        var result = await service.CreateFromQrTokenAsync(
            "token-123456789012",
            new CreatePublicQrOrderRequest(null, null, null, [new CreatePublicQrOrderItemRequest(Guid.NewGuid(), 100)]),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains(result.Errors, error => error.Field == nameof(CreatePublicQrOrderItemRequest.Quantity));
    }

    [Fact]
    public async Task GetByQrTokenAsync_WhenRequestIsValid_NormalizesToken()
    {
        var orderId = Guid.NewGuid();
        var repository = new FakeOrderRepository();
        var service = new OrderService(repository);

        var result = await service.GetByQrTokenAsync(" demo-table-1 ", orderId, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("demo-table-1", repository.QrToken);
        Assert.Equal(orderId, result.Value!.OrderId);
        Assert.Equal("Preparing", result.Value.OrderStatusCode);
    }

    [Fact]
    public async Task GetByQrTokenAsync_WhenOrderIdIsEmpty_ReturnsValidationError()
    {
        var service = new OrderService(new FakeOrderRepository());

        var result = await service.GetByQrTokenAsync("demo-table-1", Guid.Empty, CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains(result.Errors, error => error.Field == "orderId");
    }

    private sealed class FakeOrderRepository : IOrderRepository
    {
        public string? QrToken { get; private set; }
        public CreatePublicQrOrderRequest? Request { get; private set; }

        public Task<PublicOrderResponse> CreateFromQrTokenAsync(
            string qrToken,
            Guid orderId,
            CreatePublicQrOrderRequest request,
            CancellationToken cancellationToken)
        {
            QrToken = qrToken;
            Request = request;

            return Task.FromResult(new PublicOrderResponse(
                orderId,
                Guid.NewGuid(),
                Guid.NewGuid(),
                Guid.NewGuid(),
                "Placed",
                request.CustomerName,
                request.CustomerWhatsApp,
                request.Notes,
                100m,
                100m,
                null,
                null,
                0m,
                DateTime.UtcNow,
                null,
                []));
        }

        public Task<PublicOrderResponse> GetByQrTokenAsync(
            string qrToken,
            Guid orderId,
            CancellationToken cancellationToken)
        {
            QrToken = qrToken;

            return Task.FromResult(new PublicOrderResponse(
                orderId,
                Guid.NewGuid(),
                Guid.NewGuid(),
                Guid.NewGuid(),
                "Preparing",
                null,
                null,
                null,
                100m,
                100m,
                null,
                null,
                0m,
                DateTime.UtcNow,
                DateTime.UtcNow,
                []));
        }
    }
}
