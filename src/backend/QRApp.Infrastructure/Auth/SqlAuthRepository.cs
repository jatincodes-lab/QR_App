using System.Data;
using Microsoft.Data.SqlClient;
using QRApp.Application.Auth;
using QRApp.Infrastructure.Data;

namespace QRApp.Infrastructure.Auth;

public sealed class SqlAuthRepository(ISqlConnectionFactory connectionFactory) : IAuthRepository
{
    public async Task<AuthenticatedSessionResponse> RegisterTenantOwnerAsync(
        Guid tenantId,
        Guid userId,
        Guid tenantUserId,
        RegisterTenantOwnerRequest request,
        string passwordHash,
        CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedures.AuthRegisterTenantOwner, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        command.AddGuid("@UserId", userId);
        command.AddGuid("@TenantUserId", tenantUserId);
        command.AddString("@TenantName", request.TenantName, 160);
        command.AddString("@TenantSlug", request.TenantSlug, 120);
        command.AddString("@OwnerEmail", request.OwnerEmail, 256);
        command.AddString("@OwnerDisplayName", request.OwnerDisplayName, 160);
        command.AddString("@PasswordHash", passwordHash, 512);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (await reader.ReadAsync(cancellationToken))
        {
            return ReadSession(reader);
        }

        throw new DataException("Auth_RegisterTenantOwner did not return a session row.");
    }

    public async Task<LoginUserRecord?> GetUserByEmailAsync(string email, CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedures.AuthGetUserByEmail, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddString("@Email", email, 256);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken)
            ? new LoginUserRecord(
                reader.GetGuid(reader.GetOrdinal("UserId")),
                reader.GetString(reader.GetOrdinal("Email")),
                reader.GetString(reader.GetOrdinal("DisplayName")),
                reader.GetString(reader.GetOrdinal("PasswordHash")),
                reader.GetGuid(reader.GetOrdinal("TenantId")),
                reader.GetString(reader.GetOrdinal("TenantName")),
                reader.GetString(reader.GetOrdinal("TenantSlug")),
                reader.GetString(reader.GetOrdinal("RoleCode")),
                GetNullableGuid(reader, "BranchId"))
            : null;
    }

    private static AuthenticatedSessionResponse ReadSession(SqlDataReader reader)
    {
        var tenantId = reader.GetGuid(reader.GetOrdinal("TenantId"));

        return new AuthenticatedSessionResponse(
            new AuthenticatedUserResponse(
                reader.GetGuid(reader.GetOrdinal("UserId")),
                reader.GetString(reader.GetOrdinal("Email")),
                reader.GetString(reader.GetOrdinal("DisplayName")),
                tenantId,
                reader.GetString(reader.GetOrdinal("RoleCode")),
                HasColumn(reader, "BranchId") ? GetNullableGuid(reader, "BranchId") : null),
            new AuthenticatedTenantResponse(
                tenantId,
                reader.GetString(reader.GetOrdinal("TenantName")),
                reader.GetString(reader.GetOrdinal("TenantSlug"))));
    }

    private static Guid? GetNullableGuid(SqlDataReader reader, string name)
    {
        var ordinal = reader.GetOrdinal(name);
        return reader.IsDBNull(ordinal) ? null : reader.GetGuid(ordinal);
    }

    private static bool HasColumn(SqlDataReader reader, string name)
    {
        for (var index = 0; index < reader.FieldCount; index++)
        {
            if (string.Equals(reader.GetName(index), name, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }
}
