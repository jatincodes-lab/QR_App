using QRApp.Application.Common;
using QRApp.Shared.Results;

namespace QRApp.Application.Billing;

public sealed class BillingService(IBillingRepository repository) : IBillingService
{
    private static readonly HashSet<string> TaxModes = new(StringComparer.OrdinalIgnoreCase) { "Exclusive", "Inclusive" };
    private static readonly HashSet<string> RoundingModes = new(StringComparer.OrdinalIgnoreCase) { "None", "NearestRupee" };
    private static readonly HashSet<string> PaymentStatuses = new(StringComparer.OrdinalIgnoreCase) { "Unpaid", "Paid", "PartiallyPaid", "Voided" };
    private static readonly HashSet<string> RefundStatuses = new(StringComparer.OrdinalIgnoreCase) { "NotRefunded", "PartiallyRefunded", "Refunded" };

    public Task<BranchBillingSettingsResponse?> GetSettingsAsync(Guid tenantId, Guid branchId, CancellationToken cancellationToken)
    {
        return repository.GetSettingsAsync(tenantId, branchId, cancellationToken);
    }

    public async Task<OperationResult<BranchBillingSettingsResponse>> SaveSettingsAsync(
        Guid tenantId,
        Guid branchId,
        SaveBranchBillingSettingsRequest request,
        CancellationToken cancellationToken)
    {
        var validation = ValidateSettings(request);
        if (validation is not null)
        {
            return OperationResult<BranchBillingSettingsResponse>.Failed(validation);
        }

        var normalized = request with
        {
            TaxName = TextRules.CleanRequired(request.TaxName),
            TaxMode = Normalize(TaxModes, request.TaxMode),
            ServiceChargeName = TextRules.CleanRequired(request.ServiceChargeName),
            RoundingMode = Normalize(RoundingModes, request.RoundingMode)
        };

        var settings = await repository.SaveSettingsAsync(tenantId, branchId, Guid.NewGuid(), normalized, cancellationToken);
        return OperationResult<BranchBillingSettingsResponse>.Success(settings);
    }

    public Task<OrderBillResponse?> GetOrderBillAsync(Guid tenantId, Guid branchId, Guid orderId, CancellationToken cancellationToken)
    {
        return repository.GetOrderBillAsync(tenantId, branchId, orderId, cancellationToken);
    }

    public async Task<OperationResult<OrderBillResponse>> GenerateOrderBillAsync(
        Guid tenantId,
        Guid branchId,
        Guid orderId,
        GenerateOrderBillRequest request,
        Guid changedByUserId,
        CancellationToken cancellationToken)
    {
        if (request.DiscountAmount < 0)
        {
            return OperationResult<OrderBillResponse>.Failed(new ValidationFailure(nameof(request.DiscountAmount), "Discount cannot be negative."));
        }

        if (request.ServiceChargeAmount < 0)
        {
            return OperationResult<OrderBillResponse>.Failed(new ValidationFailure(nameof(request.ServiceChargeAmount), "Service charge cannot be negative."));
        }

        var reason = TextRules.CleanOptional(request.OverrideReason);
        if (reason?.Length > 300)
        {
            return OperationResult<OrderBillResponse>.Failed(new ValidationFailure(nameof(request.OverrideReason), "Override reason cannot exceed 300 characters."));
        }

        var bill = await repository.GenerateOrderBillAsync(tenantId, branchId, orderId, request with { OverrideReason = reason }, changedByUserId, cancellationToken);
        return OperationResult<OrderBillResponse>.Success(bill);
    }

    public async Task<OperationResult<OrderBillResponse>> UpdatePaymentStatusAsync(
        Guid tenantId,
        Guid branchId,
        Guid orderId,
        UpdateOrderBillPaymentStatusRequest request,
        Guid changedByUserId,
        CancellationToken cancellationToken)
    {
        var status = TextRules.CleanRequired(request.PaymentStatusCode);
        if (!PaymentStatuses.Contains(status))
        {
            return OperationResult<OrderBillResponse>.Failed(new ValidationFailure(nameof(request.PaymentStatusCode), "Payment status is invalid."));
        }

        var method = TextRules.CleanOptional(request.PaymentMethod);
        if (method?.Length > 80)
        {
            return OperationResult<OrderBillResponse>.Failed(new ValidationFailure(nameof(request.PaymentMethod), "Payment method cannot exceed 80 characters."));
        }

        var reason = TextRules.CleanOptional(request.Reason);
        if (reason?.Length > 300)
        {
            return OperationResult<OrderBillResponse>.Failed(new ValidationFailure(nameof(request.Reason), "Reason cannot exceed 300 characters."));
        }

        if (string.Equals(status, "Voided", StringComparison.OrdinalIgnoreCase) && string.IsNullOrWhiteSpace(reason))
        {
            return OperationResult<OrderBillResponse>.Failed(new ValidationFailure(nameof(request.Reason), "Void reason is required."));
        }

        var normalized = request with
        {
            PaymentStatusCode = Normalize(PaymentStatuses, status),
            PaymentMethod = method,
            Reason = reason
        };

        var bill = await repository.UpdatePaymentStatusAsync(tenantId, branchId, orderId, normalized, changedByUserId, cancellationToken);
        return OperationResult<OrderBillResponse>.Success(bill);
    }

    public async Task<OperationResult<OrderBillResponse>> UpdateRefundStatusAsync(
        Guid tenantId,
        Guid branchId,
        Guid orderId,
        UpdateOrderBillRefundStatusRequest request,
        Guid changedByUserId,
        CancellationToken cancellationToken)
    {
        var status = TextRules.CleanRequired(request.RefundStatusCode);
        if (!RefundStatuses.Contains(status))
        {
            return OperationResult<OrderBillResponse>.Failed(new ValidationFailure(nameof(request.RefundStatusCode), "Refund status is invalid."));
        }

        if (request.RefundAmount < 0)
        {
            return OperationResult<OrderBillResponse>.Failed(new ValidationFailure(nameof(request.RefundAmount), "Refund amount cannot be negative."));
        }

        var reason = TextRules.CleanOptional(request.Reason);
        if (reason?.Length > 300)
        {
            return OperationResult<OrderBillResponse>.Failed(new ValidationFailure(nameof(request.Reason), "Refund reason cannot exceed 300 characters."));
        }

        var normalizedStatus = Normalize(RefundStatuses, status);
        if (normalizedStatus != "NotRefunded" && string.IsNullOrWhiteSpace(reason))
        {
            return OperationResult<OrderBillResponse>.Failed(new ValidationFailure(nameof(request.Reason), "Refund reason is required."));
        }

        var normalized = request with
        {
            RefundStatusCode = normalizedStatus,
            Reason = reason
        };

        var bill = await repository.UpdateRefundStatusAsync(tenantId, branchId, orderId, normalized, changedByUserId, cancellationToken);
        return OperationResult<OrderBillResponse>.Success(bill);
    }

    private static ValidationFailure? ValidateSettings(SaveBranchBillingSettingsRequest request)
    {
        if (TextRules.CleanRequired(request.TaxName).Length > 40)
        {
            return new ValidationFailure(nameof(request.TaxName), "Tax name cannot exceed 40 characters.");
        }

        if (request.TaxRate < 0 || request.TaxRate > 100)
        {
            return new ValidationFailure(nameof(request.TaxRate), "Tax rate must be between 0 and 100.");
        }

        if (!TaxModes.Contains(TextRules.CleanRequired(request.TaxMode)))
        {
            return new ValidationFailure(nameof(request.TaxMode), "Tax mode is invalid.");
        }

        if (TextRules.CleanRequired(request.ServiceChargeName).Length > 60)
        {
            return new ValidationFailure(nameof(request.ServiceChargeName), "Service charge name cannot exceed 60 characters.");
        }

        if (request.ServiceChargeRate < 0 || request.ServiceChargeRate > 100)
        {
            return new ValidationFailure(nameof(request.ServiceChargeRate), "Service charge rate must be between 0 and 100.");
        }

        if (!RoundingModes.Contains(TextRules.CleanRequired(request.RoundingMode)))
        {
            return new ValidationFailure(nameof(request.RoundingMode), "Rounding mode is invalid.");
        }

        return null;
    }

    private static string Normalize(HashSet<string> allowed, string value)
    {
        var cleaned = TextRules.CleanRequired(value);
        return allowed.First(item => string.Equals(item, cleaned, StringComparison.OrdinalIgnoreCase));
    }
}
