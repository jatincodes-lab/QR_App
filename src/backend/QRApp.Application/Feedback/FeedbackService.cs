using QRApp.Application.Common;
using QRApp.Shared.Results;

namespace QRApp.Application.Feedback;

public sealed class FeedbackService(IFeedbackRepository repository) : IFeedbackService
{
    public async Task<OperationResult<OrderFeedbackResponse>> CreatePublicAsync(
        string qrToken,
        Guid orderId,
        CreateOrderFeedbackRequest request,
        CancellationToken cancellationToken)
    {
        var errors = Validate(qrToken, orderId, request);
        if (errors.Count > 0)
        {
            return OperationResult<OrderFeedbackResponse>.Failed(errors.ToArray());
        }

        var cleaned = request with { Comment = TextRules.CleanOptional(request.Comment) };
        var feedback = await repository.CreatePublicAsync(TextRules.CleanRequired(qrToken), orderId, Guid.NewGuid(), cleaned, cancellationToken);
        return OperationResult<OrderFeedbackResponse>.Success(feedback);
    }

    public async Task<OperationResult<OrderFeedbackResponse?>> GetPublicByOrderAsync(
        string qrToken,
        Guid orderId,
        CancellationToken cancellationToken)
    {
        var cleanToken = TextRules.CleanRequired(qrToken);
        if (cleanToken.Length is < 8 or > 80 || orderId == Guid.Empty)
        {
            return OperationResult<OrderFeedbackResponse?>.Failed(new ValidationFailure("OrderFeedback", "Order feedback lookup is invalid."));
        }

        var feedback = await repository.GetPublicByOrderAsync(cleanToken, orderId, cancellationToken);
        return OperationResult<OrderFeedbackResponse?>.Success(feedback);
    }

    public Task<IReadOnlyCollection<AdminFeedbackResponse>> GetAdminListAsync(Guid tenantId, Guid? branchId, CancellationToken cancellationToken)
    {
        return repository.GetAdminListAsync(tenantId, branchId, cancellationToken);
    }

    private static List<ValidationFailure> Validate(string qrToken, Guid orderId, CreateOrderFeedbackRequest request)
    {
        var errors = new List<ValidationFailure>();
        var cleanToken = TextRules.CleanRequired(qrToken);

        if (cleanToken.Length is < 8 or > 80)
        {
            errors.Add(new ValidationFailure("QrToken", "QR token is invalid."));
        }

        if (orderId == Guid.Empty)
        {
            errors.Add(new ValidationFailure(nameof(orderId), "Order is required."));
        }

        if (request.Rating is < 1 or > 5)
        {
            errors.Add(new ValidationFailure(nameof(request.Rating), "Rating must be between 1 and 5."));
        }

        if (TextRules.CleanOptional(request.Comment)?.Length > 500)
        {
            errors.Add(new ValidationFailure(nameof(request.Comment), "Comment cannot exceed 500 characters."));
        }

        return errors;
    }
}
