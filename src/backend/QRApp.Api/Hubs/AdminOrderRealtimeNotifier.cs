using Microsoft.AspNetCore.SignalR;
using QRApp.Application.Orders;

namespace QRApp.Api.Hubs;

public interface IAdminOrderRealtimeNotifier
{
    Task OrderCreatedAsync(PublicOrderResponse order, CancellationToken cancellationToken);

    Task OrderStatusUpdatedAsync(AdminOrderResponse order, CancellationToken cancellationToken);
}

public sealed class AdminOrderRealtimeNotifier(IHubContext<AdminOrderHub> hubContext) : IAdminOrderRealtimeNotifier
{
    public Task OrderCreatedAsync(PublicOrderResponse order, CancellationToken cancellationToken)
    {
        return hubContext.Clients
            .Group(AdminOrderHub.BranchGroup(order.TenantId, order.BranchId))
            .SendAsync(
                "OrderCreated",
                new AdminOrderRealtimeEvent(order.OrderId, order.TenantId, order.BranchId, order.OrderStatusCode),
                cancellationToken);
    }

    public Task OrderStatusUpdatedAsync(AdminOrderResponse order, CancellationToken cancellationToken)
    {
        return hubContext.Clients
            .Group(AdminOrderHub.BranchGroup(order.TenantId, order.BranchId))
            .SendAsync(
                "OrderStatusUpdated",
                new AdminOrderRealtimeEvent(order.OrderId, order.TenantId, order.BranchId, order.OrderStatusCode),
                cancellationToken);
    }
}

public sealed record AdminOrderRealtimeEvent(Guid OrderId, Guid TenantId, Guid BranchId, string OrderStatusCode);
