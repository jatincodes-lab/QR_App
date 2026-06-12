using System.Data;
using Microsoft.Data.SqlClient;
using QRApp.Application.Tenants;
using QRApp.Infrastructure.Data;

namespace QRApp.Infrastructure.Tenants;

public sealed class SqlTenantRepository(ISqlConnectionFactory connectionFactory) : ITenantRepository
{
    public async Task<TenantResponse> CreateAsync(Guid tenantId, CreateTenantRequest request, CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedures.TenantCreate, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        command.AddString("@Name", request.Name, 160);
        command.AddString("@Slug", request.Slug, 120);
        command.AddString("@OwnerEmail", request.OwnerEmail, 256);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (await reader.ReadAsync(cancellationToken))
        {
            return ReadTenant(reader);
        }

        throw new DataException("Tenant_Create did not return a tenant row.");
    }

    public async Task<TenantResponse?> GetByIdAsync(Guid tenantId, CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedures.TenantGetById, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? ReadTenant(reader) : null;
    }

    public async Task<TenantAccessStatusResponse?> GetAccessStatusByTenantIdAsync(Guid tenantId, CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedures.TenantAccessGetByTenantId, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? ReadAccessStatus(reader) : null;
    }

    public async Task<TenantAccessStatusResponse?> GetAccessStatusByQrTokenAsync(string qrToken, CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedures.TenantAccessGetByQrToken, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddString("@QrToken", qrToken, 80);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? ReadAccessStatus(reader) : null;
    }

    private static TenantResponse ReadTenant(SqlDataReader reader)
    {
        return new TenantResponse(
            reader.GetGuid(reader.GetOrdinal("TenantId")),
            reader.GetString(reader.GetOrdinal("Name")),
            reader.GetString(reader.GetOrdinal("Slug")),
            reader.GetString(reader.GetOrdinal("OwnerEmail")),
            reader.GetBoolean(reader.GetOrdinal("IsActive")),
            reader.GetDateTime(reader.GetOrdinal("CreatedAtUtc")),
            reader.IsDBNull(reader.GetOrdinal("UpdatedAtUtc")) ? null : reader.GetDateTime(reader.GetOrdinal("UpdatedAtUtc")));
    }

    private static TenantAccessStatusResponse ReadAccessStatus(SqlDataReader reader)
    {
        return QRApp.Application.Tenants.TenantAccessRules.CreateStatus(
            reader.GetGuid(reader.GetOrdinal("TenantId")),
            GetString(reader, "PlanCode", "trial"),
            GetNullableDateTime(reader, "TrialStartAtUtc"),
            GetNullableDateTime(reader, "TrialEndAtUtc"),
            GetString(reader, "SubscriptionStatusCode", "Trialing"),
            GetString(reader, "AccountStatusCode", "Active"),
            reader.GetBoolean(reader.GetOrdinal("IsTenantActive")),
            DateTime.UtcNow);
    }

    private static DateTime? GetNullableDateTime(SqlDataReader reader, string name)
    {
        var ordinal = reader.GetOrdinal(name);
        return reader.IsDBNull(ordinal) ? null : reader.GetDateTime(ordinal);
    }

    private static string GetString(SqlDataReader reader, string name, string fallback)
    {
        var ordinal = reader.GetOrdinal(name);
        return reader.IsDBNull(ordinal) ? fallback : reader.GetString(ordinal);
    }
}
