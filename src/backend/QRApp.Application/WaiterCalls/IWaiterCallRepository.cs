namespace QRApp.Application.WaiterCalls;

public interface IWaiterCallRepository
{
    Task<WaiterCallResponse> CreateFromQrTokenAsync(
        string qrToken,
        Guid waiterCallId,
        CreateWaiterCallRequest request,
        CancellationToken cancellationToken);

    Task<IReadOnlyCollection<WaiterCallResponse>> GetListByBranchAsync(
        Guid tenantId,
        Guid branchId,
        bool includeResolved,
        CancellationToken cancellationToken);

    Task<WaiterCallResponse> UpdateStatusAsync(
        Guid tenantId,
        Guid branchId,
        Guid waiterCallId,
        string statusCode,
        CancellationToken cancellationToken);
}
