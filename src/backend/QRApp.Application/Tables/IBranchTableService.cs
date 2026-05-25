using QRApp.Shared.Results;

namespace QRApp.Application.Tables;

public interface IBranchTableService
{
    Task<OperationResult<BranchTableResponse>> CreateAsync(
        Guid tenantId,
        Guid branchId,
        CreateBranchTableRequest request,
        CancellationToken cancellationToken);

    Task<OperationResult<BranchTableResponse>> UpdateAsync(
        Guid tenantId,
        Guid branchId,
        Guid tableId,
        UpdateBranchTableRequest request,
        CancellationToken cancellationToken);

    Task<IReadOnlyCollection<BranchTableResponse>> GetListByBranchAsync(
        Guid tenantId,
        Guid branchId,
        bool includeInactive,
        CancellationToken cancellationToken);

    Task DeactivateAsync(Guid tenantId, Guid branchId, Guid tableId, CancellationToken cancellationToken);

    Task<BranchTableResponse> RegenerateQrTokenAsync(
        Guid tenantId,
        Guid branchId,
        Guid tableId,
        CancellationToken cancellationToken);

    Task<PublicQrMenuResponse?> GetPublicMenuByQrTokenAsync(string qrToken, CancellationToken cancellationToken);
}
