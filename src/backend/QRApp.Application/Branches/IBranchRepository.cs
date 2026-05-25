namespace QRApp.Application.Branches;

public interface IBranchRepository
{
    Task<BranchResponse> CreateAsync(Guid tenantId, Guid branchId, CreateBranchRequest request, CancellationToken cancellationToken);

    Task<BranchResponse> UpdateAsync(Guid tenantId, Guid branchId, UpdateBranchRequest request, CancellationToken cancellationToken);

    Task<BranchResponse?> GetByIdAsync(Guid tenantId, Guid branchId, CancellationToken cancellationToken);

    Task<IReadOnlyCollection<BranchListItemResponse>> GetListByTenantAsync(Guid tenantId, bool includeInactive, CancellationToken cancellationToken);

    Task DeactivateAsync(Guid tenantId, Guid branchId, CancellationToken cancellationToken);
}

