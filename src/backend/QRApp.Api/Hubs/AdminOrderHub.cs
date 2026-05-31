using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using QRApp.Api.Auth;

namespace QRApp.Api.Hubs;

[Authorize]
public sealed class AdminOrderHub : Hub
{
    public const string Route = "/hubs/admin/orders";

    public async Task JoinBranch(Guid branchId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, BranchGroup(ReadTenantId(), branchId));
    }

    public async Task LeaveBranch(Guid branchId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, BranchGroup(ReadTenantId(), branchId));
    }

    public static string BranchGroup(Guid tenantId, Guid branchId)
    {
        return $"tenant:{tenantId}:branch:{branchId}:orders";
    }

    private Guid ReadTenantId()
    {
        var value = Context.User?.FindFirstValue(TokenClaims.TenantId);
        if (Guid.TryParse(value, out var tenantId))
        {
            return tenantId;
        }

        throw new HubException("Authenticated connection is missing tenant context.");
    }
}
