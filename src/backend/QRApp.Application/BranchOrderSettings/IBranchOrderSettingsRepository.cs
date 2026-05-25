namespace QRApp.Application.BranchOrderSettings;

public interface IBranchOrderSettingsRepository
{
    Task<BranchOrderSettingsResponse> CreateAsync(
        Guid tenantId,
        Guid branchId,
        Guid branchOrderSettingsId,
        CreateBranchOrderSettingsRequest request,
        CancellationToken cancellationToken);

    Task<BranchOrderSettingsResponse> UpdateAsync(
        Guid tenantId,
        Guid branchId,
        UpdateBranchOrderSettingsRequest request,
        CancellationToken cancellationToken);

    Task<BranchOrderSettingsResponse?> GetByBranchAsync(Guid tenantId, Guid branchId, CancellationToken cancellationToken);
}

