namespace QRApp.Application.BranchOrderSettings;

public interface IBranchOrderSettingsService
{
    Task<BranchOrderSettingsResponse> CreateAsync(
        Guid tenantId,
        Guid branchId,
        CreateBranchOrderSettingsRequest request,
        CancellationToken cancellationToken);

    Task<BranchOrderSettingsResponse> UpdateAsync(
        Guid tenantId,
        Guid branchId,
        UpdateBranchOrderSettingsRequest request,
        CancellationToken cancellationToken);

    Task<BranchOrderSettingsResponse?> GetByBranchAsync(Guid tenantId, Guid branchId, CancellationToken cancellationToken);
}

