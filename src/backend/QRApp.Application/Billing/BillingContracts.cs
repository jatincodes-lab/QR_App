namespace QRApp.Application.Billing;

public sealed record SaveBranchBillingSettingsRequest(
    bool TaxEnabled,
    string TaxName,
    decimal TaxRate,
    string TaxMode,
    bool ServiceChargeEnabled,
    string ServiceChargeName,
    decimal ServiceChargeRate,
    bool DiscountEnabled,
    bool StaffCanApplyDiscount,
    string RoundingMode);

public sealed record BranchBillingSettingsResponse(
    Guid BranchBillingSettingsId,
    Guid TenantId,
    Guid BranchId,
    bool TaxEnabled,
    string TaxName,
    decimal TaxRate,
    string TaxMode,
    bool ServiceChargeEnabled,
    string ServiceChargeName,
    decimal ServiceChargeRate,
    bool DiscountEnabled,
    bool StaffCanApplyDiscount,
    string RoundingMode,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc);

public sealed record GenerateOrderBillRequest(
    decimal DiscountAmount,
    decimal ServiceChargeAmount,
    string? OverrideReason);

public sealed record UpdateOrderBillPaymentStatusRequest(
    string PaymentStatusCode,
    string? PaymentMethod,
    string? Reason);

public sealed record UpdateOrderBillRefundStatusRequest(
    string RefundStatusCode,
    decimal RefundAmount,
    string? Reason);

public sealed record OrderBillResponse(
    Guid OrderBillId,
    Guid TenantId,
    Guid BranchId,
    Guid OrderId,
    string BillNumber,
    string PaymentStatusCode,
    string? PaymentMethod,
    decimal SubtotalAmount,
    decimal DiscountAmount,
    decimal TaxableAmount,
    decimal TaxAmount,
    decimal ServiceChargeAmount,
    decimal RoundingAmount,
    decimal TotalAmount,
    bool TaxEnabled,
    string TaxName,
    decimal TaxRate,
    string TaxMode,
    bool ServiceChargeEnabled,
    string ServiceChargeName,
    decimal ServiceChargeRate,
    bool DiscountEnabled,
    Guid? AppliedBranchOfferId,
    string? AppliedOfferTitle,
    string RefundStatusCode,
    decimal RefundAmount,
    string? RefundReason,
    DateTime? RefundedAtUtc,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc);
