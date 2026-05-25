using System.Data;
using Microsoft.Data.SqlClient;
using QRApp.Application.Menus;
using QRApp.Infrastructure.Data;

namespace QRApp.Infrastructure.Menus;

public sealed class SqlMenuItemRepository(ISqlConnectionFactory connectionFactory) : IMenuItemRepository
{
    public async Task<MenuItemResponse> CreateAsync(
        Guid tenantId,
        Guid branchId,
        Guid menuItemId,
        CreateMenuItemRequest request,
        CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedures.MenuItemCreate, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@MenuItemId", menuItemId);
        AddCreateItemParameters(command, tenantId, branchId, request);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (await reader.ReadAsync(cancellationToken))
        {
            return ReadItem(reader);
        }

        throw new DataException("MenuItem_Create did not return an item row.");
    }

    public async Task<MenuItemResponse> UpdateAsync(
        Guid tenantId,
        Guid branchId,
        Guid menuItemId,
        UpdateMenuItemRequest request,
        CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedures.MenuItemUpdate, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        command.AddGuid("@BranchId", branchId);
        command.AddGuid("@MenuItemId", menuItemId);
        command.AddGuid("@MenuCategoryId", request.MenuCategoryId);
        command.AddString("@Name", request.Name, 160);
        command.AddString("@Description", request.Description, 1000);
        command.AddDecimal("@Price", request.Price, 10, 2);
        command.AddBool("@IsAvailable", request.IsAvailable);
        command.AddBool("@IsActive", request.IsActive);
        command.AddInt("@DisplayOrder", request.DisplayOrder);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (await reader.ReadAsync(cancellationToken))
        {
            return ReadItem(reader);
        }

        throw new DataException("MenuItem_Update did not return an item row.");
    }

    public async Task<IReadOnlyCollection<MenuItemResponse>> GetListByBranchAsync(
        Guid tenantId,
        Guid branchId,
        bool includeInactive,
        CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedures.MenuItemGetListByBranch, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        command.AddGuid("@BranchId", branchId);
        command.AddBool("@IncludeInactive", includeInactive);

        var items = new List<MenuItemResponse>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(ReadItem(reader));
        }

        return items;
    }

    public async Task DeactivateAsync(Guid tenantId, Guid branchId, Guid menuItemId, CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedures.MenuItemDeactivate, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        command.AddGuid("@BranchId", branchId);
        command.AddGuid("@MenuItemId", menuItemId);

        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<IReadOnlyCollection<PublicMenuItemRecord>> GetPublicMenuByBranchAsync(
        Guid branchId,
        CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedures.PublicMenuGetByBranch, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@BranchId", branchId);

        var items = new List<PublicMenuItemRecord>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(new PublicMenuItemRecord(
                reader.GetGuid(reader.GetOrdinal("BranchId")),
                reader.GetString(reader.GetOrdinal("BranchName")),
                reader.GetGuid(reader.GetOrdinal("MenuCategoryId")),
                reader.GetString(reader.GetOrdinal("CategoryName")),
                reader.GetInt32(reader.GetOrdinal("CategoryDisplayOrder")),
                reader.GetGuid(reader.GetOrdinal("MenuItemId")),
                reader.GetString(reader.GetOrdinal("ItemName")),
                reader.IsDBNull(reader.GetOrdinal("Description")) ? null : reader.GetString(reader.GetOrdinal("Description")),
                reader.GetDecimal(reader.GetOrdinal("Price")),
                reader.GetInt32(reader.GetOrdinal("ItemDisplayOrder"))));
        }

        return items;
    }

    private static void AddCreateItemParameters(SqlCommand command, Guid tenantId, Guid branchId, CreateMenuItemRequest request)
    {
        command.AddGuid("@TenantId", tenantId);
        command.AddGuid("@BranchId", branchId);
        command.AddGuid("@MenuCategoryId", request.MenuCategoryId);
        command.AddString("@Name", request.Name, 160);
        command.AddString("@Description", request.Description, 1000);
        command.AddDecimal("@Price", request.Price, 10, 2);
        command.AddBool("@IsAvailable", request.IsAvailable);
        command.AddInt("@DisplayOrder", request.DisplayOrder);
    }

    private static MenuItemResponse ReadItem(SqlDataReader reader)
    {
        return new MenuItemResponse(
            reader.GetGuid(reader.GetOrdinal("MenuItemId")),
            reader.GetGuid(reader.GetOrdinal("TenantId")),
            reader.GetGuid(reader.GetOrdinal("BranchId")),
            reader.GetGuid(reader.GetOrdinal("MenuCategoryId")),
            reader.GetString(reader.GetOrdinal("CategoryName")),
            reader.GetString(reader.GetOrdinal("Name")),
            reader.IsDBNull(reader.GetOrdinal("Description")) ? null : reader.GetString(reader.GetOrdinal("Description")),
            reader.GetDecimal(reader.GetOrdinal("Price")),
            reader.GetBoolean(reader.GetOrdinal("IsAvailable")),
            reader.GetBoolean(reader.GetOrdinal("IsActive")),
            reader.GetInt32(reader.GetOrdinal("DisplayOrder")),
            reader.GetDateTime(reader.GetOrdinal("CreatedAtUtc")),
            reader.IsDBNull(reader.GetOrdinal("UpdatedAtUtc")) ? null : reader.GetDateTime(reader.GetOrdinal("UpdatedAtUtc")));
    }
}

