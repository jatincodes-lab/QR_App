using QRApp.Shared.Results;

namespace QRApp.Application.Staff;

public interface IStaffUserService
{
    Task<OperationResult<StaffUserResponse>> CreateAsync(Guid tenantId, CreateStaffUserRequest request, CancellationToken cancellationToken);

    Task<IReadOnlyCollection<StaffUserResponse>> GetListAsync(Guid tenantId, bool includeInactive, CancellationToken cancellationToken);

    Task<OperationResult<StaffUserResponse>> UpdateAsync(Guid tenantId, Guid userId, UpdateStaffUserRequest request, CancellationToken cancellationToken);
}
