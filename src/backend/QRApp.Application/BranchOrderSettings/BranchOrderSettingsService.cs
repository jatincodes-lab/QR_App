namespace QRApp.Application.BranchOrderSettings;

public sealed class BranchOrderSettingsService(IBranchOrderSettingsRepository repository) : IBranchOrderSettingsService
{
    public Task<BranchOrderSettingsResponse> CreateAsync(
        Guid tenantId,
        Guid branchId,
        CreateBranchOrderSettingsRequest request,
        CancellationToken cancellationToken)
    {
        return repository.CreateAsync(tenantId, branchId, Guid.NewGuid(), request, cancellationToken);
    }

    public Task<BranchOrderSettingsResponse> UpdateAsync(
        Guid tenantId,
        Guid branchId,
        UpdateBranchOrderSettingsRequest request,
        CancellationToken cancellationToken)
    {
        return repository.UpdateAsync(tenantId, branchId, request, cancellationToken);
    }

    public Task<BranchOrderSettingsResponse?> GetByBranchAsync(Guid tenantId, Guid branchId, CancellationToken cancellationToken)
    {
        return repository.GetByBranchAsync(tenantId, branchId, cancellationToken);
    }
}

