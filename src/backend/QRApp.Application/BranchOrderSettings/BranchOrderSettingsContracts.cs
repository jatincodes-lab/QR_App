namespace QRApp.Application.BranchOrderSettings;

public sealed record CreateBranchOrderSettingsRequest(
    bool EnableDirectQrOrdering,
    bool RequireCustomerName,
    bool RequireCustomerWhatsApp,
    bool WaiterCallEnabled);

public sealed record UpdateBranchOrderSettingsRequest(
    bool EnableDirectQrOrdering,
    bool RequireCustomerName,
    bool RequireCustomerWhatsApp,
    bool WaiterCallEnabled);

public sealed record BranchOrderSettingsResponse(
    Guid BranchOrderSettingsId,
    Guid TenantId,
    Guid BranchId,
    bool EnableDirectQrOrdering,
    bool RequireCustomerName,
    bool RequireCustomerWhatsApp,
    bool WaiterCallEnabled,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc);

