using QRApp.Shared.Results;

namespace QRApp.Application.Feedback;

public sealed record CreateOrderFeedbackRequest(int Rating, string? Comment);

public sealed record OrderFeedbackResponse(
    Guid OrderFeedbackId,
    Guid TenantId,
    Guid BranchId,
    Guid OrderId,
    Guid? CustomerId,
    int Rating,
    string? Comment,
    DateTime CreatedAtUtc);

public sealed record AdminFeedbackResponse(
    Guid OrderFeedbackId,
    Guid TenantId,
    Guid BranchId,
    string BranchName,
    Guid OrderId,
    string TableName,
    Guid? CustomerId,
    string? CustomerName,
    string? CustomerWhatsApp,
    int Rating,
    string? Comment,
    DateTime OrderCreatedAtUtc,
    DateTime CreatedAtUtc);

public interface IFeedbackRepository
{
    Task<OrderFeedbackResponse> CreatePublicAsync(string qrToken, Guid orderId, Guid orderFeedbackId, CreateOrderFeedbackRequest request, CancellationToken cancellationToken);

    Task<OrderFeedbackResponse?> GetPublicByOrderAsync(string qrToken, Guid orderId, CancellationToken cancellationToken);

    Task<IReadOnlyCollection<AdminFeedbackResponse>> GetAdminListAsync(Guid tenantId, Guid? branchId, CancellationToken cancellationToken);
}

public interface IFeedbackService
{
    Task<OperationResult<OrderFeedbackResponse>> CreatePublicAsync(string qrToken, Guid orderId, CreateOrderFeedbackRequest request, CancellationToken cancellationToken);

    Task<OperationResult<OrderFeedbackResponse?>> GetPublicByOrderAsync(string qrToken, Guid orderId, CancellationToken cancellationToken);

    Task<IReadOnlyCollection<AdminFeedbackResponse>> GetAdminListAsync(Guid tenantId, Guid? branchId, CancellationToken cancellationToken);
}
