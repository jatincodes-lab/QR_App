using System.Data;
using Microsoft.Data.SqlClient;
using QRApp.Application.Branches;
using QRApp.Infrastructure.Data;

namespace QRApp.Infrastructure.Branches;

public sealed class SqlBranchRepository(ISqlConnectionFactory connectionFactory) : IBranchRepository
{
    public async Task<BranchResponse> CreateAsync(Guid tenantId, Guid branchId, CreateBranchRequest request, CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = CreateBranchCommand(connection, StoredProcedures.BranchCreate, tenantId, branchId, request);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (await reader.ReadAsync(cancellationToken))
        {
            return ReadBranch(reader);
        }

        throw new DataException("Branch_Create did not return a branch row.");
    }

    public async Task<BranchResponse> UpdateAsync(Guid tenantId, Guid branchId, UpdateBranchRequest request, CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedures.BranchUpdate, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        AddBranchParameters(command, tenantId, branchId, request.Name, request.PhoneNumber, request.AddressLine1, request.AddressLine2, request.City, request.State, request.PostalCode, request.CountryCode, request.LogoUrl, request.LogoPublicId);
        command.AddBool("@IsActive", request.IsActive);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (await reader.ReadAsync(cancellationToken))
        {
            return ReadBranch(reader);
        }

        throw new DataException("Branch_Update did not return a branch row.");
    }

    public async Task<BranchResponse?> GetByIdAsync(Guid tenantId, Guid branchId, CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedures.BranchGetById, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        command.AddGuid("@BranchId", branchId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? ReadBranch(reader) : null;
    }

    public async Task<IReadOnlyCollection<BranchListItemResponse>> GetListByTenantAsync(Guid tenantId, bool includeInactive, CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedures.BranchGetListByTenant, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        command.AddBool("@IncludeInactive", includeInactive);

        var branches = new List<BranchListItemResponse>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            branches.Add(new BranchListItemResponse(
                reader.GetGuid(reader.GetOrdinal("BranchId")),
                reader.GetGuid(reader.GetOrdinal("TenantId")),
                reader.GetString(reader.GetOrdinal("Name")),
                reader.IsDBNull(reader.GetOrdinal("PhoneNumber")) ? null : reader.GetString(reader.GetOrdinal("PhoneNumber")),
                reader.IsDBNull(reader.GetOrdinal("City")) ? null : reader.GetString(reader.GetOrdinal("City")),
                reader.GetString(reader.GetOrdinal("CountryCode")),
                reader.IsDBNull(reader.GetOrdinal("LogoUrl")) ? null : reader.GetString(reader.GetOrdinal("LogoUrl")),
                reader.IsDBNull(reader.GetOrdinal("LogoPublicId")) ? null : reader.GetString(reader.GetOrdinal("LogoPublicId")),
                reader.GetBoolean(reader.GetOrdinal("IsActive")),
                reader.GetDateTime(reader.GetOrdinal("CreatedAtUtc")),
                reader.IsDBNull(reader.GetOrdinal("UpdatedAtUtc")) ? null : reader.GetDateTime(reader.GetOrdinal("UpdatedAtUtc"))));
        }

        return branches;
    }

    public async Task DeactivateAsync(Guid tenantId, Guid branchId, CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedures.BranchDeactivate, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        command.AddGuid("@BranchId", branchId);

        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static SqlCommand CreateBranchCommand(SqlConnection connection, string procedure, Guid tenantId, Guid branchId, CreateBranchRequest request)
    {
        var command = new SqlCommand(procedure, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        AddBranchParameters(command, tenantId, branchId, request.Name, request.PhoneNumber, request.AddressLine1, request.AddressLine2, request.City, request.State, request.PostalCode, request.CountryCode, request.LogoUrl, request.LogoPublicId);
        return command;
    }

    private static void AddBranchParameters(SqlCommand command, Guid tenantId, Guid branchId, string name, string? phoneNumber, string? addressLine1, string? addressLine2, string? city, string? state, string? postalCode, string countryCode, string? logoUrl, string? logoPublicId)
    {
        command.AddGuid("@TenantId", tenantId);
        command.AddGuid("@BranchId", branchId);
        command.AddString("@Name", name, 160);
        command.AddString("@PhoneNumber", phoneNumber, 32);
        command.AddString("@AddressLine1", addressLine1, 220);
        command.AddString("@AddressLine2", addressLine2, 220);
        command.AddString("@City", city, 120);
        command.AddString("@State", state, 120);
        command.AddString("@PostalCode", postalCode, 32);
        command.AddChar("@CountryCode", countryCode, 2);
        command.AddString("@LogoUrl", logoUrl, 1000);
        command.AddString("@LogoPublicId", logoPublicId, 300);
    }

    private static BranchResponse ReadBranch(SqlDataReader reader)
    {
        return new BranchResponse(
            reader.GetGuid(reader.GetOrdinal("BranchId")),
            reader.GetGuid(reader.GetOrdinal("TenantId")),
            reader.GetString(reader.GetOrdinal("Name")),
            reader.IsDBNull(reader.GetOrdinal("PhoneNumber")) ? null : reader.GetString(reader.GetOrdinal("PhoneNumber")),
            reader.IsDBNull(reader.GetOrdinal("AddressLine1")) ? null : reader.GetString(reader.GetOrdinal("AddressLine1")),
            reader.IsDBNull(reader.GetOrdinal("AddressLine2")) ? null : reader.GetString(reader.GetOrdinal("AddressLine2")),
            reader.IsDBNull(reader.GetOrdinal("City")) ? null : reader.GetString(reader.GetOrdinal("City")),
            reader.IsDBNull(reader.GetOrdinal("State")) ? null : reader.GetString(reader.GetOrdinal("State")),
            reader.IsDBNull(reader.GetOrdinal("PostalCode")) ? null : reader.GetString(reader.GetOrdinal("PostalCode")),
            reader.GetString(reader.GetOrdinal("CountryCode")),
            reader.IsDBNull(reader.GetOrdinal("LogoUrl")) ? null : reader.GetString(reader.GetOrdinal("LogoUrl")),
            reader.IsDBNull(reader.GetOrdinal("LogoPublicId")) ? null : reader.GetString(reader.GetOrdinal("LogoPublicId")),
            reader.GetBoolean(reader.GetOrdinal("IsActive")),
            reader.GetDateTime(reader.GetOrdinal("CreatedAtUtc")),
            reader.IsDBNull(reader.GetOrdinal("UpdatedAtUtc")) ? null : reader.GetDateTime(reader.GetOrdinal("UpdatedAtUtc")));
    }
}
