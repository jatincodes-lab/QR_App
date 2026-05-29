namespace QRApp.Application.Orders;

public interface IOrderRepository
{
    Task<PublicOrderResponse> CreateFromQrTokenAsync(
        string qrToken,
        Guid orderId,
        CreatePublicQrOrderRequest request,
        CancellationToken cancellationToken);

    Task<PublicOrderResponse> GetByQrTokenAsync(
        string qrToken,
        Guid orderId,
        CancellationToken cancellationToken);
}
