namespace QRApp.Application.Notifications;

public interface IAdminNotificationRepository
{
    Task<AdminNotificationResponse> CreateAsync(Guid tenantId, CreateAdminNotificationRequest request, CancellationToken cancellationToken);

    Task<IReadOnlyCollection<AdminNotificationResponse>> GetListAsync(Guid tenantId, Guid? branchId, CancellationToken cancellationToken);

    Task MarkReadAsync(Guid tenantId, Guid notificationId, CancellationToken cancellationToken);

    Task MarkAllReadAsync(Guid tenantId, Guid? branchId, CancellationToken cancellationToken);

    Task<IReadOnlyCollection<AdminSearchResultResponse>> SearchAsync(Guid tenantId, Guid? branchId, string query, CancellationToken cancellationToken);
}
