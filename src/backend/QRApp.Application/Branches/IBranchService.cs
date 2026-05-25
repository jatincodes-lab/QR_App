using QRApp.Shared.Results;

namespace QRApp.Application.Branches;

public interface IBranchService
{
    Task<OperationResult<BranchResponse>> CreateAsync(Guid tenantId, CreateBranchRequest request, CancellationToken cancellationToken);

    Task<OperationResult<BranchResponse>> UpdateAsync(Guid tenantId, Guid branchId, UpdateBranchRequest request, CancellationToken cancellationToken);

    Task<BranchResponse?> GetByIdAsync(Guid tenantId, Guid branchId, CancellationToken cancellationToken);

    Task<IReadOnlyCollection<BranchListItemResponse>> GetListByTenantAsync(Guid tenantId, bool includeInactive, CancellationToken cancellationToken);

    Task DeactivateAsync(Guid tenantId, Guid branchId, CancellationToken cancellationToken);
}

