using QRApp.Shared.Results;

namespace QRApp.Application.WaiterCalls;

public interface IWaiterCallService
{
    Task<OperationResult<WaiterCallResponse>> CreateFromQrTokenAsync(
        string qrToken,
        CreateWaiterCallRequest request,
        CancellationToken cancellationToken);

    Task<IReadOnlyCollection<WaiterCallResponse>> GetListByBranchAsync(
        Guid tenantId,
        Guid branchId,
        bool includeResolved,
        CancellationToken cancellationToken);

    Task<OperationResult<WaiterCallResponse>> UpdateStatusAsync(
        Guid tenantId,
        Guid branchId,
        Guid waiterCallId,
        UpdateWaiterCallStatusRequest request,
        CancellationToken cancellationToken);
}
