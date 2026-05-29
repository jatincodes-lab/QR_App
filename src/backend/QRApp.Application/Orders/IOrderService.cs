using QRApp.Shared.Results;

namespace QRApp.Application.Orders;

public interface IOrderService
{
    Task<OperationResult<PublicOrderResponse>> CreateFromQrTokenAsync(
        string qrToken,
        CreatePublicQrOrderRequest request,
        CancellationToken cancellationToken);

    Task<OperationResult<PublicOrderResponse>> GetByQrTokenAsync(
        string qrToken,
        Guid orderId,
        CancellationToken cancellationToken);
}
