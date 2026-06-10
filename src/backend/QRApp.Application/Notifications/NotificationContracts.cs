namespace QRApp.Application.Notifications;

public sealed record AdminNotificationResponse(
    Guid AdminNotificationId,
    Guid TenantId,
    Guid BranchId,
    string TypeCode,
    string Title,
    string Message,
    string TargetUrl,
    bool IsRead,
    DateTime CreatedAtUtc,
    DateTime? ReadAtUtc);

public sealed record CreateAdminNotificationRequest(
    Guid BranchId,
    string TypeCode,
    string Title,
    string Message,
    string TargetUrl);

public sealed record AdminSearchResultResponse(
    string TypeCode,
    Guid EntityId,
    Guid? BranchId,
    string Title,
    string Subtitle,
    string TargetUrl,
    DateTime? CreatedAtUtc);
