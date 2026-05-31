namespace QRApp.Application.WaiterCalls;

public sealed record CreateWaiterCallRequest(string? CustomerName, string? Note);

public sealed record WaiterCallResponse(
    Guid WaiterCallId,
    Guid TenantId,
    Guid BranchId,
    Guid TableId,
    string TableName,
    string StatusCode,
    string? CustomerName,
    string? Note,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc);

public sealed record UpdateWaiterCallStatusRequest(string StatusCode);
