using QRApp.Application.Common;

namespace QRApp.Application.Notifications;

public sealed class AdminNotificationService(IAdminNotificationRepository repository) : IAdminNotificationService
{
    private const int MinimumSearchLength = 2;

    public Task<AdminNotificationResponse> CreateAsync(Guid tenantId, CreateAdminNotificationRequest request, CancellationToken cancellationToken)
    {
        var cleaned = request with
        {
            TypeCode = TextRules.CleanRequired(request.TypeCode),
            Title = TextRules.CleanRequired(request.Title),
            Message = TextRules.CleanRequired(request.Message),
            TargetUrl = TextRules.CleanRequired(request.TargetUrl)
        };

        return repository.CreateAsync(tenantId, cleaned, cancellationToken);
    }

    public Task<IReadOnlyCollection<AdminNotificationResponse>> GetListAsync(Guid tenantId, Guid? branchId, CancellationToken cancellationToken)
    {
        return repository.GetListAsync(tenantId, branchId, cancellationToken);
    }

    public Task MarkReadAsync(Guid tenantId, Guid notificationId, CancellationToken cancellationToken)
    {
        return repository.MarkReadAsync(tenantId, notificationId, cancellationToken);
    }

    public Task MarkAllReadAsync(Guid tenantId, Guid? branchId, CancellationToken cancellationToken)
    {
        return repository.MarkAllReadAsync(tenantId, branchId, cancellationToken);
    }

    public Task<IReadOnlyCollection<AdminSearchResultResponse>> SearchAsync(Guid tenantId, Guid? branchId, string query, CancellationToken cancellationToken)
    {
        var cleaned = TextRules.CleanOptional(query);
        if (cleaned is null || cleaned.Length < MinimumSearchLength)
        {
            return Task.FromResult<IReadOnlyCollection<AdminSearchResultResponse>>(Array.Empty<AdminSearchResultResponse>());
        }

        return repository.SearchAsync(tenantId, branchId, cleaned, cancellationToken);
    }
}
