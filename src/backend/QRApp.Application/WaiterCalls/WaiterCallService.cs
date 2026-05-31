using QRApp.Application.Common;
using QRApp.Shared.Results;

namespace QRApp.Application.WaiterCalls;

public sealed class WaiterCallService(IWaiterCallRepository repository) : IWaiterCallService
{
    private const int MinQrTokenLength = 8;
    private const int MaxQrTokenLength = 80;

    private static readonly HashSet<string> AllowedStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "Open",
        "Acknowledged",
        "Resolved",
        "Cancelled"
    };

    public async Task<OperationResult<WaiterCallResponse>> CreateFromQrTokenAsync(
        string qrToken,
        CreateWaiterCallRequest request,
        CancellationToken cancellationToken)
    {
        var cleanToken = TextRules.CleanRequired(qrToken);
        var errors = ValidateCreate(cleanToken, request);
        if (errors.Count > 0)
        {
            return OperationResult<WaiterCallResponse>.Failed(errors.ToArray());
        }

        var cleaned = new CreateWaiterCallRequest(
            CleanOptional(request.CustomerName),
            CleanOptional(request.Note));

        var call = await repository.CreateFromQrTokenAsync(cleanToken, Guid.NewGuid(), cleaned, cancellationToken);
        return OperationResult<WaiterCallResponse>.Success(call);
    }

    public Task<IReadOnlyCollection<WaiterCallResponse>> GetListByBranchAsync(
        Guid tenantId,
        Guid branchId,
        bool includeResolved,
        CancellationToken cancellationToken)
    {
        return repository.GetListByBranchAsync(tenantId, branchId, includeResolved, cancellationToken);
    }

    public async Task<OperationResult<WaiterCallResponse>> UpdateStatusAsync(
        Guid tenantId,
        Guid branchId,
        Guid waiterCallId,
        UpdateWaiterCallStatusRequest request,
        CancellationToken cancellationToken)
    {
        var status = TextRules.CleanRequired(request.StatusCode);
        if (!AllowedStatuses.Contains(status))
        {
            return OperationResult<WaiterCallResponse>.Failed(
                new ValidationFailure(nameof(UpdateWaiterCallStatusRequest.StatusCode), "Waiter call status is invalid."));
        }

        var normalized = AllowedStatuses.First(item => string.Equals(item, status, StringComparison.OrdinalIgnoreCase));
        var call = await repository.UpdateStatusAsync(tenantId, branchId, waiterCallId, normalized, cancellationToken);
        return OperationResult<WaiterCallResponse>.Success(call);
    }

    private static List<ValidationFailure> ValidateCreate(string qrToken, CreateWaiterCallRequest request)
    {
        var errors = new List<ValidationFailure>();

        if (qrToken.Length is < MinQrTokenLength or > MaxQrTokenLength)
        {
            errors.Add(new ValidationFailure("QrToken", "QR token is invalid."));
        }

        if (CleanOptional(request.CustomerName)?.Length > 120)
        {
            errors.Add(new ValidationFailure(nameof(CreateWaiterCallRequest.CustomerName), "Customer name cannot exceed 120 characters."));
        }

        if (CleanOptional(request.Note)?.Length > 500)
        {
            errors.Add(new ValidationFailure(nameof(CreateWaiterCallRequest.Note), "Note cannot exceed 500 characters."));
        }

        return errors;
    }

    private static string? CleanOptional(string? value)
    {
        var clean = TextRules.CleanOptional(value);
        return string.IsNullOrWhiteSpace(clean) ? null : clean;
    }
}
