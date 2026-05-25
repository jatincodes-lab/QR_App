namespace QRApp.Application.Tables;

public interface IBranchTableRepository
{
    Task<BranchTableResponse> CreateAsync(
        Guid tenantId,
        Guid branchId,
        Guid tableId,
        string qrToken,
        CreateBranchTableRequest request,
        CancellationToken cancellationToken);

    Task<BranchTableResponse> UpdateAsync(
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
        string qrToken,
        CancellationToken cancellationToken);

    Task<IReadOnlyCollection<PublicQrMenuRecord>> GetPublicMenuByQrTokenAsync(
        string qrToken,
        CancellationToken cancellationToken);
}
