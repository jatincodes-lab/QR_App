using System.Data;
using Microsoft.Data.SqlClient;
using QRApp.Application.BranchOrderSettings;
using QRApp.Infrastructure.Data;

namespace QRApp.Infrastructure.BranchOrderSettings;

public sealed class SqlBranchOrderSettingsRepository(ISqlConnectionFactory connectionFactory) : IBranchOrderSettingsRepository
{
    public async Task<BranchOrderSettingsResponse> CreateAsync(
        Guid tenantId,
        Guid branchId,
        Guid branchOrderSettingsId,
        CreateBranchOrderSettingsRequest request,
        CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedures.BranchOrderSettingsCreate, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        command.AddGuid("@BranchId", branchId);
        command.AddGuid("@BranchOrderSettingsId", branchOrderSettingsId);
        command.AddBool("@EnableDirectQrOrdering", request.EnableDirectQrOrdering);
        command.AddBool("@RequireCustomerName", request.RequireCustomerName);
        command.AddBool("@RequireCustomerWhatsApp", request.RequireCustomerWhatsApp);
        command.AddBool("@WaiterCallEnabled", request.WaiterCallEnabled);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (await reader.ReadAsync(cancellationToken))
        {
            return ReadSettings(reader);
        }

        throw new DataException("BranchOrderSettings_Create did not return a settings row.");
    }

    public async Task<BranchOrderSettingsResponse> UpdateAsync(
        Guid tenantId,
        Guid branchId,
        UpdateBranchOrderSettingsRequest request,
        CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedures.BranchOrderSettingsUpdate, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        command.AddGuid("@BranchId", branchId);
        command.AddBool("@EnableDirectQrOrdering", request.EnableDirectQrOrdering);
        command.AddBool("@RequireCustomerName", request.RequireCustomerName);
        command.AddBool("@RequireCustomerWhatsApp", request.RequireCustomerWhatsApp);
        command.AddBool("@WaiterCallEnabled", request.WaiterCallEnabled);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (await reader.ReadAsync(cancellationToken))
        {
            return ReadSettings(reader);
        }

        throw new DataException("BranchOrderSettings_Update did not return a settings row.");
    }

    public async Task<BranchOrderSettingsResponse?> GetByBranchAsync(Guid tenantId, Guid branchId, CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedures.BranchOrderSettingsGetByBranch, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        command.AddGuid("@BranchId", branchId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? ReadSettings(reader) : null;
    }

    private static BranchOrderSettingsResponse ReadSettings(SqlDataReader reader)
    {
        return new BranchOrderSettingsResponse(
            reader.GetGuid(reader.GetOrdinal("BranchOrderSettingsId")),
            reader.GetGuid(reader.GetOrdinal("TenantId")),
            reader.GetGuid(reader.GetOrdinal("BranchId")),
            reader.GetBoolean(reader.GetOrdinal("EnableDirectQrOrdering")),
            reader.GetBoolean(reader.GetOrdinal("RequireCustomerName")),
            reader.GetBoolean(reader.GetOrdinal("RequireCustomerWhatsApp")),
            reader.GetBoolean(reader.GetOrdinal("WaiterCallEnabled")),
            reader.GetDateTime(reader.GetOrdinal("CreatedAtUtc")),
            reader.IsDBNull(reader.GetOrdinal("UpdatedAtUtc")) ? null : reader.GetDateTime(reader.GetOrdinal("UpdatedAtUtc")));
    }
}

