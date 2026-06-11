using System.Data;
using Microsoft.Data.SqlClient;
using QRApp.Application.Tables;
using QRApp.Infrastructure.Data;

namespace QRApp.Infrastructure.Tables;

public sealed class SqlBranchTableRepository(ISqlConnectionFactory connectionFactory) : IBranchTableRepository
{
    public async Task<BranchTableResponse> CreateAsync(
        Guid tenantId,
        Guid branchId,
        Guid tableId,
        string qrToken,
        CreateBranchTableRequest request,
        CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedures.BranchTableCreate, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        command.AddGuid("@BranchId", branchId);
        command.AddGuid("@TableId", tableId);
        command.AddString("@Name", request.Name, 80);
        command.AddInt("@DisplayOrder", request.DisplayOrder);
        command.AddString("@QrToken", qrToken, 80);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (await reader.ReadAsync(cancellationToken))
        {
            return ReadTable(reader);
        }

        throw new DataException("BranchTable_Create did not return a table row.");
    }

    public async Task<BranchTableResponse> UpdateAsync(
        Guid tenantId,
        Guid branchId,
        Guid tableId,
        UpdateBranchTableRequest request,
        CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedures.BranchTableUpdate, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        command.AddGuid("@BranchId", branchId);
        command.AddGuid("@TableId", tableId);
        command.AddString("@Name", request.Name, 80);
        command.AddInt("@DisplayOrder", request.DisplayOrder);
        command.AddBool("@IsActive", request.IsActive);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (await reader.ReadAsync(cancellationToken))
        {
            return ReadTable(reader);
        }

        throw new DataException("BranchTable_Update did not return a table row.");
    }

    public async Task<IReadOnlyCollection<BranchTableResponse>> GetListByBranchAsync(
        Guid tenantId,
        Guid branchId,
        bool includeInactive,
        CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedures.BranchTableGetListByBranch, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        command.AddGuid("@BranchId", branchId);
        command.AddBool("@IncludeInactive", includeInactive);

        var tables = new List<BranchTableResponse>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            tables.Add(ReadTable(reader));
        }

        return tables;
    }

    public async Task DeactivateAsync(Guid tenantId, Guid branchId, Guid tableId, CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedures.BranchTableDeactivate, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        command.AddGuid("@BranchId", branchId);
        command.AddGuid("@TableId", tableId);

        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<BranchTableResponse> RegenerateQrTokenAsync(
        Guid tenantId,
        Guid branchId,
        Guid tableId,
        string qrToken,
        CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedures.BranchTableRegenerateQrToken, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        command.AddGuid("@BranchId", branchId);
        command.AddGuid("@TableId", tableId);
        command.AddString("@QrToken", qrToken, 80);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (await reader.ReadAsync(cancellationToken))
        {
            return ReadTable(reader);
        }

        throw new DataException("BranchTable_RegenerateQrToken did not return a table row.");
    }

    public async Task<IReadOnlyCollection<PublicQrMenuRecord>> GetPublicMenuByQrTokenAsync(
        string qrToken,
        CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedures.PublicMenuGetByQrToken, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddString("@QrToken", qrToken, 80);

        var rows = new List<PublicQrMenuRecord>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            rows.Add(ReadPublicQrMenuRecord(reader));
        }

        return rows;
    }

    private static BranchTableResponse ReadTable(SqlDataReader reader)
    {
        return new BranchTableResponse(
            reader.GetGuid(reader.GetOrdinal("TableId")),
            reader.GetGuid(reader.GetOrdinal("TenantId")),
            reader.GetGuid(reader.GetOrdinal("BranchId")),
            reader.GetString(reader.GetOrdinal("Name")),
            reader.GetInt32(reader.GetOrdinal("DisplayOrder")),
            reader.GetString(reader.GetOrdinal("QrToken")),
            reader.GetBoolean(reader.GetOrdinal("IsActive")),
            reader.GetDateTime(reader.GetOrdinal("CreatedAtUtc")),
            reader.IsDBNull(reader.GetOrdinal("UpdatedAtUtc")) ? null : reader.GetDateTime(reader.GetOrdinal("UpdatedAtUtc")));
    }

    private static PublicQrMenuRecord ReadPublicQrMenuRecord(SqlDataReader reader)
    {
        return new PublicQrMenuRecord(
            reader.GetGuid(reader.GetOrdinal("BranchId")),
            reader.GetString(reader.GetOrdinal("BranchName")),
            GetNullableString(reader, "BranchLogoUrl"),
            reader.GetGuid(reader.GetOrdinal("TableId")),
            reader.GetString(reader.GetOrdinal("TableName")),
            reader.GetString(reader.GetOrdinal("QrToken")),
            reader.GetBoolean(reader.GetOrdinal("EnableDirectQrOrdering")),
            reader.GetBoolean(reader.GetOrdinal("RequireCustomerName")),
            reader.GetBoolean(reader.GetOrdinal("RequireCustomerWhatsApp")),
            reader.GetBoolean(reader.GetOrdinal("WaiterCallEnabled")),
            reader.GetBoolean(reader.GetOrdinal("TaxEnabled")),
            reader.GetString(reader.GetOrdinal("TaxName")),
            reader.GetDecimal(reader.GetOrdinal("TaxRate")),
            reader.GetString(reader.GetOrdinal("TaxMode")),
            reader.GetBoolean(reader.GetOrdinal("ServiceChargeEnabled")),
            reader.GetString(reader.GetOrdinal("ServiceChargeName")),
            reader.GetDecimal(reader.GetOrdinal("ServiceChargeRate")),
            reader.GetString(reader.GetOrdinal("RoundingMode")),
            GetNullableGuid(reader, "MenuCategoryId"),
            GetNullableString(reader, "CategoryName"),
            GetNullableInt(reader, "CategoryDisplayOrder"),
            GetNullableGuid(reader, "MenuItemId"),
            GetNullableString(reader, "ItemName"),
            GetNullableString(reader, "Description"),
            GetNullableDecimal(reader, "Price"),
            GetNullableInt(reader, "ItemDisplayOrder"),
            GetNullableString(reader, "ImageUrl"),
            GetNullableString(reader, "ImageAltText"),
            GetNullableString(reader, "VariantsJson"));
    }

    private static Guid? GetNullableGuid(SqlDataReader reader, string name)
    {
        var ordinal = reader.GetOrdinal(name);
        return reader.IsDBNull(ordinal) ? null : reader.GetGuid(ordinal);
    }

    private static string? GetNullableString(SqlDataReader reader, string name)
    {
        var ordinal = reader.GetOrdinal(name);
        return reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal);
    }

    private static int? GetNullableInt(SqlDataReader reader, string name)
    {
        var ordinal = reader.GetOrdinal(name);
        return reader.IsDBNull(ordinal) ? null : reader.GetInt32(ordinal);
    }

    private static decimal? GetNullableDecimal(SqlDataReader reader, string name)
    {
        var ordinal = reader.GetOrdinal(name);
        return reader.IsDBNull(ordinal) ? null : reader.GetDecimal(ordinal);
    }
}
