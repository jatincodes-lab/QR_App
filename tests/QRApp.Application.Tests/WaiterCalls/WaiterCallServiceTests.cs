using QRApp.Application.WaiterCalls;

namespace QRApp.Application.Tests.WaiterCalls;

public sealed class WaiterCallServiceTests
{
    [Fact]
    public async Task CreateFromQrTokenAsync_WhenRequestIsValid_NormalizesFields()
    {
        var repository = new FakeWaiterCallRepository();
        var service = new WaiterCallService(repository);

        var result = await service.CreateFromQrTokenAsync(
            " demo-table-1 ",
            new CreateWaiterCallRequest(" Priya ", " Need water "),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("demo-table-1", repository.QrToken);
        Assert.Equal("Priya", repository.CreateRequest!.CustomerName);
        Assert.Equal("Need water", repository.CreateRequest.Note);
        Assert.Equal("Open", result.Value!.StatusCode);
    }

    [Fact]
    public async Task CreateFromQrTokenAsync_WhenQrTokenIsInvalid_ReturnsValidationError()
    {
        var service = new WaiterCallService(new FakeWaiterCallRepository());

        var result = await service.CreateFromQrTokenAsync(
            "short",
            new CreateWaiterCallRequest(null, null),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains(result.Errors, error => error.Field == "QrToken");
    }

    [Fact]
    public async Task CreateFromQrTokenAsync_WhenNoteIsTooLong_ReturnsValidationError()
    {
        var service = new WaiterCallService(new FakeWaiterCallRepository());

        var result = await service.CreateFromQrTokenAsync(
            "demo-table-1",
            new CreateWaiterCallRequest(null, new string('x', 501)),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains(result.Errors, error => error.Field == nameof(CreateWaiterCallRequest.Note));
    }

    [Fact]
    public async Task UpdateStatusAsync_WhenStatusIsValid_NormalizesStatus()
    {
        var repository = new FakeWaiterCallRepository();
        var service = new WaiterCallService(repository);

        var result = await service.UpdateStatusAsync(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            new UpdateWaiterCallStatusRequest(" acknowledged "),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("Acknowledged", repository.StatusCode);
        Assert.Equal("Acknowledged", result.Value!.StatusCode);
    }

    [Fact]
    public async Task UpdateStatusAsync_WhenStatusIsInvalid_ReturnsValidationError()
    {
        var service = new WaiterCallService(new FakeWaiterCallRepository());

        var result = await service.UpdateStatusAsync(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            new UpdateWaiterCallStatusRequest("Done"),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains(result.Errors, error => error.Field == nameof(UpdateWaiterCallStatusRequest.StatusCode));
    }

    private sealed class FakeWaiterCallRepository : IWaiterCallRepository
    {
        public string? QrToken { get; private set; }
        public CreateWaiterCallRequest? CreateRequest { get; private set; }
        public string? StatusCode { get; private set; }

        public Task<WaiterCallResponse> CreateFromQrTokenAsync(
            string qrToken,
            Guid waiterCallId,
            CreateWaiterCallRequest request,
            CancellationToken cancellationToken)
        {
            QrToken = qrToken;
            CreateRequest = request;

            return Task.FromResult(NewResponse(waiterCallId, "Open", request.CustomerName, request.Note));
        }

        public Task<IReadOnlyCollection<WaiterCallResponse>> GetListByBranchAsync(
            Guid tenantId,
            Guid branchId,
            bool includeResolved,
            CancellationToken cancellationToken)
        {
            return Task.FromResult<IReadOnlyCollection<WaiterCallResponse>>([]);
        }

        public Task<WaiterCallResponse> UpdateStatusAsync(
            Guid tenantId,
            Guid branchId,
            Guid waiterCallId,
            string statusCode,
            CancellationToken cancellationToken)
        {
            StatusCode = statusCode;
            return Task.FromResult(NewResponse(waiterCallId, statusCode, null, null));
        }

        private static WaiterCallResponse NewResponse(Guid waiterCallId, string statusCode, string? customerName, string? note)
        {
            return new WaiterCallResponse(
                waiterCallId,
                Guid.NewGuid(),
                Guid.NewGuid(),
                Guid.NewGuid(),
                "Table 1",
                statusCode,
                customerName,
                note,
                DateTime.UtcNow,
                null);
        }
    }
}
