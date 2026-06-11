using System.Data;
using Microsoft.Data.SqlClient;
using QRApp.Application.Billing;
using QRApp.Infrastructure.Data;

namespace QRApp.Infrastructure.Billing;

public sealed class SqlBillingRepository(ISqlConnectionFactory connectionFactory) : IBillingRepository
{
    public async Task<BranchBillingSettingsResponse?> GetSettingsAsync(Guid tenantId, Guid branchId, CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedures.BranchBillingSettingsGetByBranch, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        command.AddGuid("@BranchId", branchId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? ReadSettings(reader) : null;
    }

    public async Task<BranchBillingSettingsResponse> SaveSettingsAsync(
        Guid tenantId,
        Guid branchId,
        Guid branchBillingSettingsId,
        SaveBranchBillingSettingsRequest request,
        CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedures.BranchBillingSettingsSave, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        command.AddGuid("@BranchId", branchId);
        command.AddGuid("@BranchBillingSettingsId", branchBillingSettingsId);
        command.AddBool("@TaxEnabled", request.TaxEnabled);
        command.AddString("@TaxName", request.TaxName, 40);
        command.AddDecimal("@TaxRate", request.TaxRate, 6, 3);
        command.AddString("@TaxMode", request.TaxMode, 20);
        command.AddBool("@ServiceChargeEnabled", request.ServiceChargeEnabled);
        command.AddString("@ServiceChargeName", request.ServiceChargeName, 60);
        command.AddDecimal("@ServiceChargeRate", request.ServiceChargeRate, 6, 3);
        command.AddBool("@DiscountEnabled", request.DiscountEnabled);
        command.AddBool("@StaffCanApplyDiscount", request.StaffCanApplyDiscount);
        command.AddString("@RoundingMode", request.RoundingMode, 20);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (await reader.ReadAsync(cancellationToken))
        {
            return ReadSettings(reader);
        }

        throw new DataException("BranchBillingSettings_Save did not return a settings row.");
    }

    public async Task<OrderBillResponse?> GetOrderBillAsync(Guid tenantId, Guid branchId, Guid orderId, CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedures.OrderBillGetByOrder, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        command.AddGuid("@BranchId", branchId);
        command.AddGuid("@OrderId", orderId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? ReadBill(reader) : null;
    }

    public async Task<OrderBillResponse> GenerateOrderBillAsync(
        Guid tenantId,
        Guid branchId,
        Guid orderId,
        GenerateOrderBillRequest request,
        Guid changedByUserId,
        CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedures.OrderBillGenerate, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        command.AddGuid("@BranchId", branchId);
        command.AddGuid("@OrderId", orderId);
        command.AddDecimal("@DiscountAmount", request.DiscountAmount, 10, 2);
        command.AddDecimal("@ServiceChargeAmount", request.ServiceChargeAmount, 10, 2);
        command.AddString("@OverrideReason", request.OverrideReason, 300);
        command.AddGuid("@ChangedByUserId", changedByUserId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (await reader.ReadAsync(cancellationToken))
        {
            return ReadBill(reader);
        }

        throw new DataException("OrderBill_Generate did not return a bill row.");
    }

    public async Task<OrderBillResponse> UpdatePaymentStatusAsync(
        Guid tenantId,
        Guid branchId,
        Guid orderId,
        UpdateOrderBillPaymentStatusRequest request,
        Guid changedByUserId,
        CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedures.OrderBillUpdatePaymentStatus, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        command.AddGuid("@BranchId", branchId);
        command.AddGuid("@OrderId", orderId);
        command.AddString("@PaymentStatusCode", request.PaymentStatusCode, 32);
        command.AddString("@PaymentMethod", request.PaymentMethod, 80);
        command.AddString("@Reason", request.Reason, 300);
        command.AddGuid("@ChangedByUserId", changedByUserId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (await reader.ReadAsync(cancellationToken))
        {
            return ReadBill(reader);
        }

        throw new DataException("OrderBill_UpdatePaymentStatus did not return a bill row.");
    }

    public async Task<OrderBillResponse> UpdateRefundStatusAsync(
        Guid tenantId,
        Guid branchId,
        Guid orderId,
        UpdateOrderBillRefundStatusRequest request,
        Guid changedByUserId,
        CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedures.OrderBillUpdateRefundStatus, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        command.AddGuid("@BranchId", branchId);
        command.AddGuid("@OrderId", orderId);
        command.AddString("@RefundStatusCode", request.RefundStatusCode, 32);
        command.AddDecimal("@RefundAmount", request.RefundAmount, 10, 2);
        command.AddString("@Reason", request.Reason, 300);
        command.AddGuid("@ChangedByUserId", changedByUserId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (await reader.ReadAsync(cancellationToken))
        {
            return ReadBill(reader);
        }

        throw new DataException("OrderBill_UpdateRefundStatus did not return a bill row.");
    }

    private static BranchBillingSettingsResponse ReadSettings(SqlDataReader reader)
    {
        return new BranchBillingSettingsResponse(
            reader.GetGuid(reader.GetOrdinal("BranchBillingSettingsId")),
            reader.GetGuid(reader.GetOrdinal("TenantId")),
            reader.GetGuid(reader.GetOrdinal("BranchId")),
            reader.GetBoolean(reader.GetOrdinal("TaxEnabled")),
            reader.GetString(reader.GetOrdinal("TaxName")),
            reader.GetDecimal(reader.GetOrdinal("TaxRate")),
            reader.GetString(reader.GetOrdinal("TaxMode")),
            reader.GetBoolean(reader.GetOrdinal("ServiceChargeEnabled")),
            reader.GetString(reader.GetOrdinal("ServiceChargeName")),
            reader.GetDecimal(reader.GetOrdinal("ServiceChargeRate")),
            reader.GetBoolean(reader.GetOrdinal("DiscountEnabled")),
            reader.GetBoolean(reader.GetOrdinal("StaffCanApplyDiscount")),
            reader.GetString(reader.GetOrdinal("RoundingMode")),
            reader.GetDateTime(reader.GetOrdinal("CreatedAtUtc")),
            reader.IsDBNull(reader.GetOrdinal("UpdatedAtUtc")) ? null : reader.GetDateTime(reader.GetOrdinal("UpdatedAtUtc")));
    }

    private static OrderBillResponse ReadBill(SqlDataReader reader)
    {
        return new OrderBillResponse(
            reader.GetGuid(reader.GetOrdinal("OrderBillId")),
            reader.GetGuid(reader.GetOrdinal("TenantId")),
            reader.GetGuid(reader.GetOrdinal("BranchId")),
            reader.GetGuid(reader.GetOrdinal("OrderId")),
            reader.GetString(reader.GetOrdinal("BillNumber")),
            reader.GetString(reader.GetOrdinal("PaymentStatusCode")),
            GetNullableString(reader, "PaymentMethod"),
            reader.GetDecimal(reader.GetOrdinal("SubtotalAmount")),
            reader.GetDecimal(reader.GetOrdinal("DiscountAmount")),
            reader.GetDecimal(reader.GetOrdinal("TaxableAmount")),
            reader.GetDecimal(reader.GetOrdinal("TaxAmount")),
            reader.GetDecimal(reader.GetOrdinal("ServiceChargeAmount")),
            reader.GetDecimal(reader.GetOrdinal("RoundingAmount")),
            reader.GetDecimal(reader.GetOrdinal("TotalAmount")),
            reader.GetBoolean(reader.GetOrdinal("TaxEnabled")),
            reader.GetString(reader.GetOrdinal("TaxName")),
            reader.GetDecimal(reader.GetOrdinal("TaxRate")),
            reader.GetString(reader.GetOrdinal("TaxMode")),
            reader.GetBoolean(reader.GetOrdinal("ServiceChargeEnabled")),
            reader.GetString(reader.GetOrdinal("ServiceChargeName")),
            reader.GetDecimal(reader.GetOrdinal("ServiceChargeRate")),
            reader.GetBoolean(reader.GetOrdinal("DiscountEnabled")),
            reader.GetString(reader.GetOrdinal("RefundStatusCode")),
            reader.GetDecimal(reader.GetOrdinal("RefundAmount")),
            GetNullableString(reader, "RefundReason"),
            GetNullableDateTime(reader, "RefundedAtUtc"),
            reader.GetDateTime(reader.GetOrdinal("CreatedAtUtc")),
            reader.IsDBNull(reader.GetOrdinal("UpdatedAtUtc")) ? null : reader.GetDateTime(reader.GetOrdinal("UpdatedAtUtc")));
    }

    private static string? GetNullableString(SqlDataReader reader, string name)
    {
        var ordinal = reader.GetOrdinal(name);
        return reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal);
    }

    private static DateTime? GetNullableDateTime(SqlDataReader reader, string name)
    {
        var ordinal = reader.GetOrdinal(name);
        return reader.IsDBNull(ordinal) ? null : reader.GetDateTime(ordinal);
    }
}
