using System.Data;
using Microsoft.Data.SqlClient;
using QRApp.Application.WaiterCalls;
using QRApp.Infrastructure.Data;

namespace QRApp.Infrastructure.WaiterCalls;

public sealed class SqlWaiterCallRepository(ISqlConnectionFactory connectionFactory) : IWaiterCallRepository
{
    public async Task<WaiterCallResponse> CreateFromQrTokenAsync(
        string qrToken,
        Guid waiterCallId,
        CreateWaiterCallRequest request,
        CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedures.WaiterCallCreateFromQrToken, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddString("@QrToken", qrToken, 80);
        command.AddGuid("@WaiterCallId", waiterCallId);
        command.AddString("@CustomerName", request.CustomerName, 120);
        command.AddString("@Note", request.Note, 500);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            throw new DataException("WaiterCall_CreateFromQrToken did not return a waiter call row.");
        }

        return ReadCall(reader);
    }

    public async Task<IReadOnlyCollection<WaiterCallResponse>> GetListByBranchAsync(
        Guid tenantId,
        Guid branchId,
        bool includeResolved,
        CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedures.WaiterCallGetListByBranch, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        command.AddGuid("@BranchId", branchId);
        command.AddBool("@IncludeResolved", includeResolved);

        var calls = new List<WaiterCallResponse>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            calls.Add(ReadCall(reader));
        }

        return calls;
    }

    public async Task<WaiterCallResponse> UpdateStatusAsync(
        Guid tenantId,
        Guid branchId,
        Guid waiterCallId,
        string statusCode,
        CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedures.WaiterCallUpdateStatus, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        command.AddGuid("@BranchId", branchId);
        command.AddGuid("@WaiterCallId", waiterCallId);
        command.AddString("@StatusCode", statusCode, 32);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            throw new DataException("WaiterCall_UpdateStatus did not return a waiter call row.");
        }

        return ReadCall(reader);
    }

    private static WaiterCallResponse ReadCall(SqlDataReader reader)
    {
        return new WaiterCallResponse(
            reader.GetGuid(reader.GetOrdinal("WaiterCallId")),
            reader.GetGuid(reader.GetOrdinal("TenantId")),
            reader.GetGuid(reader.GetOrdinal("BranchId")),
            reader.GetGuid(reader.GetOrdinal("TableId")),
            reader.GetString(reader.GetOrdinal("TableName")),
            reader.GetString(reader.GetOrdinal("StatusCode")),
            GetNullableString(reader, "CustomerName"),
            GetNullableString(reader, "Note"),
            reader.GetDateTime(reader.GetOrdinal("CreatedAtUtc")),
            reader.IsDBNull(reader.GetOrdinal("UpdatedAtUtc")) ? null : reader.GetDateTime(reader.GetOrdinal("UpdatedAtUtc")));
    }

    private static string? GetNullableString(SqlDataReader reader, string name)
    {
        var ordinal = reader.GetOrdinal(name);
        return reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal);
    }
}
