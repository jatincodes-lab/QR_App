using Microsoft.AspNetCore.SignalR;
using QRApp.Application.Orders;
using QRApp.Application.WaiterCalls;

namespace QRApp.Api.Hubs;

public interface IAdminOrderRealtimeNotifier
{
    Task OrderCreatedAsync(PublicOrderResponse order, CancellationToken cancellationToken);

    Task OrderStatusUpdatedAsync(AdminOrderResponse order, CancellationToken cancellationToken);

    Task WaiterCallCreatedAsync(WaiterCallResponse waiterCall, CancellationToken cancellationToken);

    Task WaiterCallStatusUpdatedAsync(WaiterCallResponse waiterCall, CancellationToken cancellationToken);
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

    public Task WaiterCallCreatedAsync(WaiterCallResponse waiterCall, CancellationToken cancellationToken)
    {
        return hubContext.Clients
            .Group(AdminOrderHub.BranchGroup(waiterCall.TenantId, waiterCall.BranchId))
            .SendAsync(
                "WaiterCallCreated",
                new AdminWaiterCallRealtimeEvent(waiterCall.WaiterCallId, waiterCall.TenantId, waiterCall.BranchId, waiterCall.StatusCode),
                cancellationToken);
    }

    public Task WaiterCallStatusUpdatedAsync(WaiterCallResponse waiterCall, CancellationToken cancellationToken)
    {
        return hubContext.Clients
            .Group(AdminOrderHub.BranchGroup(waiterCall.TenantId, waiterCall.BranchId))
            .SendAsync(
                "WaiterCallStatusUpdated",
                new AdminWaiterCallRealtimeEvent(waiterCall.WaiterCallId, waiterCall.TenantId, waiterCall.BranchId, waiterCall.StatusCode),
                cancellationToken);
    }
}

public sealed record AdminOrderRealtimeEvent(Guid OrderId, Guid TenantId, Guid BranchId, string OrderStatusCode);

public sealed record AdminWaiterCallRealtimeEvent(Guid WaiterCallId, Guid TenantId, Guid BranchId, string StatusCode);
