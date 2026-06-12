using QRApp.Application.Common;
using QRApp.Shared.Results;

namespace QRApp.Application.Tenants;

public sealed class TenantSubscriptionService(ITenantRepository repository) : ITenantSubscriptionService
{
    private static readonly HashSet<string> AllowedSubscriptionStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "Trialing",
        "Active",
        "ManualActive",
        "PastDue",
        "Suspended",
        "Cancelled",
        "Expired"
    };

    private static readonly HashSet<string> AllowedAccountStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "Active",
        "Inactive"
    };

    public Task<TenantSubscriptionResponse?> GetCurrentAsync(Guid tenantId, CancellationToken cancellationToken)
    {
        return tenantId == Guid.Empty
            ? Task.FromResult<TenantSubscriptionResponse?>(null)
            : repository.GetSubscriptionByTenantIdAsync(tenantId, cancellationToken);
    }

    public async Task<OperationResult<TenantSubscriptionResponse>> UpdateManualAsync(
        Guid tenantId,
        UpdateTenantSubscriptionRequest request,
        CancellationToken cancellationToken)
    {
        var normalized = Normalize(request);
        var errors = Validate(normalized);
        if (errors.Count > 0)
        {
            return OperationResult<TenantSubscriptionResponse>.Failed(errors.ToArray());
        }

        var updated = await repository.UpdateSubscriptionManualAsync(tenantId, normalized, cancellationToken);
        return OperationResult<TenantSubscriptionResponse>.Success(updated);
    }

    public async Task<OperationResult<TenantSubscriptionResponse>> ExtendTrialAsync(
        Guid tenantId,
        ExtendTenantTrialRequest request,
        CancellationToken cancellationToken)
    {
        if (request.Days is < 1 or > 365)
        {
            return OperationResult<TenantSubscriptionResponse>.Failed(
                new ValidationFailure(nameof(request.Days), "Trial extension must be between 1 and 365 days."));
        }

        var current = await repository.GetSubscriptionByTenantIdAsync(tenantId, cancellationToken);
        if (current is null)
        {
            return OperationResult<TenantSubscriptionResponse>.Failed(
                new ValidationFailure(nameof(tenantId), "Tenant was not found."));
        }

        var baseDate = current.TrialEndAtUtc.HasValue && current.TrialEndAtUtc.Value > DateTime.UtcNow
            ? current.TrialEndAtUtc.Value
            : DateTime.UtcNow;
        var note = CleanNote(request.SubscriptionNotes);
        var update = new UpdateTenantSubscriptionRequest(
            "trial",
            "Trialing",
            "Active",
            baseDate.AddDays(request.Days),
            string.IsNullOrWhiteSpace(note) ? $"Trial extended by {request.Days} day(s)." : note);

        return await UpdateManualAsync(tenantId, update, cancellationToken);
    }

    public Task<OperationResult<TenantSubscriptionResponse>> ReactivateManualAsync(
        Guid tenantId,
        TenantSubscriptionActionRequest request,
        CancellationToken cancellationToken)
    {
        var note = CleanNote(request.SubscriptionNotes);
        return UpdateManualAsync(
            tenantId,
            new UpdateTenantSubscriptionRequest(
                "manual",
                "ManualActive",
                "Active",
                null,
                string.IsNullOrWhiteSpace(note) ? "Manually reactivated." : note),
            cancellationToken);
    }

    public Task<OperationResult<TenantSubscriptionResponse>> SuspendAsync(
        Guid tenantId,
        TenantSubscriptionActionRequest request,
        CancellationToken cancellationToken)
    {
        var note = CleanNote(request.SubscriptionNotes);
        return UpdateManualAsync(
            tenantId,
            new UpdateTenantSubscriptionRequest(
                "manual",
                "Suspended",
                "Inactive",
                null,
                string.IsNullOrWhiteSpace(note) ? "Manually suspended." : note),
            cancellationToken);
    }

    private static UpdateTenantSubscriptionRequest Normalize(UpdateTenantSubscriptionRequest request)
    {
        return new UpdateTenantSubscriptionRequest(
            TextRules.CleanRequired(request.PlanCode).ToLowerInvariant(),
            TextRules.CleanRequired(request.SubscriptionStatusCode),
            TextRules.CleanRequired(request.AccountStatusCode),
            request.TrialEndAtUtc,
            CleanNote(request.SubscriptionNotes));
    }

    private static List<ValidationFailure> Validate(UpdateTenantSubscriptionRequest request)
    {
        var errors = new List<ValidationFailure>();

        if (request.PlanCode.Length is < 2 or > 40 || !request.PlanCode.All(c => char.IsLetterOrDigit(c) || c == '-' || c == '_'))
        {
            errors.Add(new ValidationFailure(nameof(request.PlanCode), "Plan code must be 2-40 characters and contain only letters, numbers, hyphens, or underscores."));
        }

        if (!AllowedSubscriptionStatuses.Contains(request.SubscriptionStatusCode))
        {
            errors.Add(new ValidationFailure(nameof(request.SubscriptionStatusCode), "Subscription status is invalid."));
        }

        if (!AllowedAccountStatuses.Contains(request.AccountStatusCode))
        {
            errors.Add(new ValidationFailure(nameof(request.AccountStatusCode), "Account status is invalid."));
        }

        if (string.Equals(request.SubscriptionStatusCode, "Trialing", StringComparison.OrdinalIgnoreCase) &&
            !request.TrialEndAtUtc.HasValue)
        {
            errors.Add(new ValidationFailure(nameof(request.TrialEndAtUtc), "Trial end date is required for trialing tenants."));
        }

        if (!string.Equals(request.SubscriptionStatusCode, "Trialing", StringComparison.OrdinalIgnoreCase) &&
            request.TrialEndAtUtc.HasValue &&
            request.TrialEndAtUtc.Value < DateTime.UtcNow.AddYears(-5))
        {
            errors.Add(new ValidationFailure(nameof(request.TrialEndAtUtc), "Trial end date is too far in the past."));
        }

        if (request.SubscriptionNotes is { Length: > 500 })
        {
            errors.Add(new ValidationFailure(nameof(request.SubscriptionNotes), "Subscription note must be 500 characters or fewer."));
        }

        return errors;
    }

    private static string? CleanNote(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var clean = value.Trim();
        return clean;
    }
}
