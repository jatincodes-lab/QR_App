namespace QRApp.Application.Staff;

public interface IStaffUserRepository
{
    Task<StaffUserResponse> CreateAsync(
        Guid tenantId,
        Guid userId,
        Guid tenantUserId,
        CreateStaffUserRequest request,
        string passwordHash,
        CancellationToken cancellationToken);

    Task<IReadOnlyCollection<StaffUserResponse>> GetListAsync(Guid tenantId, bool includeInactive, CancellationToken cancellationToken);

    Task<StaffUserResponse> UpdateAsync(Guid tenantId, Guid userId, UpdateStaffUserRequest request, CancellationToken cancellationToken);
}
