namespace QRApp.Application.Orders;

public interface IOrderRepository
{
    Task<PublicOrderResponse> CreateFromQrTokenAsync(
        string qrToken,
        Guid orderId,
        CreatePublicQrOrderRequest request,
        CancellationToken cancellationToken);
}
