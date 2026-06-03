using System.Data;
using Microsoft.Data.SqlClient;
using QRApp.Application.Orders;
using QRApp.Infrastructure.Data;

namespace QRApp.Infrastructure.Orders;

public sealed class SqlAdminOrderRepository(ISqlConnectionFactory connectionFactory) : IAdminOrderRepository
{
    public async Task<IReadOnlyCollection<AdminOrderResponse>> GetListByBranchAsync(
        Guid tenantId,
        Guid branchId,
        bool includeCompleted,
        CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        var orders = new List<AdminOrderResponse>();
        await using (var command = new SqlCommand(StoredProcedures.AdminOrderGetListByBranch, connection)
        {
            CommandType = CommandType.StoredProcedure
        })
        {
            command.AddGuid("@TenantId", tenantId);
            command.AddGuid("@BranchId", branchId);
            command.AddBool("@IncludeCompleted", includeCompleted);

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                orders.Add(ReadOrder(reader, Array.Empty<AdminOrderItemResponse>()));
            }
        }

        if (orders.Count == 0)
        {
            return orders;
        }

        var itemsByOrderId = await GetItemsByBranchAsync(connection, tenantId, branchId, cancellationToken);
        return orders
            .Select(order => order with
            {
                Items = itemsByOrderId.TryGetValue(order.OrderId, out var items) ? items : Array.Empty<AdminOrderItemResponse>()
            })
            .ToArray();
    }

    public async Task<AdminOrderResponse> UpdateStatusAsync(
        Guid tenantId,
        Guid branchId,
        Guid orderId,
        string orderStatusCode,
        CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedures.AdminOrderUpdateStatus, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        command.AddGuid("@BranchId", branchId);
        command.AddGuid("@OrderId", orderId);
        command.AddString("@OrderStatusCode", orderStatusCode, 32);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            throw new DataException("AdminOrder_UpdateStatus did not return an order row.");
        }

        var order = ReadOrder(reader, Array.Empty<AdminOrderItemResponse>());
        var items = new List<AdminOrderItemResponse>();
        if (await reader.NextResultAsync(cancellationToken))
        {
            while (await reader.ReadAsync(cancellationToken))
            {
                items.Add(ReadItem(reader));
            }
        }

        return order with { Items = items };
    }

    private static async Task<Dictionary<Guid, AdminOrderItemResponse[]>> GetItemsByBranchAsync(
        SqlConnection connection,
        Guid tenantId,
        Guid branchId,
        CancellationToken cancellationToken)
    {
        await using var command = new SqlCommand(StoredProcedures.AdminOrderGetItemsByBranch, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        command.AddGuid("@BranchId", branchId);

        var items = new List<AdminOrderItemResponse>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(ReadItem(reader));
        }

        return items
            .GroupBy(item => item.OrderId)
            .ToDictionary(group => group.Key, group => group.ToArray());
    }

    private static AdminOrderResponse ReadOrder(SqlDataReader reader, IReadOnlyCollection<AdminOrderItemResponse> items)
    {
        return new AdminOrderResponse(
            reader.GetGuid(reader.GetOrdinal("OrderId")),
            reader.GetGuid(reader.GetOrdinal("TenantId")),
            reader.GetGuid(reader.GetOrdinal("BranchId")),
            reader.GetGuid(reader.GetOrdinal("TableId")),
            reader.GetString(reader.GetOrdinal("TableName")),
            reader.GetString(reader.GetOrdinal("OrderStatusCode")),
            GetNullableString(reader, "CustomerName"),
            GetNullableString(reader, "CustomerWhatsApp"),
            GetNullableString(reader, "Notes"),
            reader.GetDecimal(reader.GetOrdinal("SubtotalAmount")),
            reader.GetDecimal(reader.GetOrdinal("TotalAmount")),
            reader.GetDateTime(reader.GetOrdinal("CreatedAtUtc")),
            reader.IsDBNull(reader.GetOrdinal("UpdatedAtUtc")) ? null : reader.GetDateTime(reader.GetOrdinal("UpdatedAtUtc")),
            items);
    }

    private static AdminOrderItemResponse ReadItem(SqlDataReader reader)
    {
        return new AdminOrderItemResponse(
            reader.GetGuid(reader.GetOrdinal("OrderItemId")),
            reader.GetGuid(reader.GetOrdinal("OrderId")),
            reader.GetGuid(reader.GetOrdinal("MenuItemId")),
            GetNullableGuid(reader, "MenuItemVariantId"),
            reader.GetString(reader.GetOrdinal("MenuItemName")),
            GetNullableString(reader, "VariantName"),
            GetNullableString(reader, "ItemNote"),
            reader.GetDecimal(reader.GetOrdinal("UnitPrice")),
            reader.GetInt32(reader.GetOrdinal("Quantity")),
            reader.GetDecimal(reader.GetOrdinal("LineTotal")));
    }

    private static string? GetNullableString(SqlDataReader reader, string name)
    {
        var ordinal = reader.GetOrdinal(name);
        return reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal);
    }

    private static Guid? GetNullableGuid(SqlDataReader reader, string name)
    {
        var ordinal = reader.GetOrdinal(name);
        return reader.IsDBNull(ordinal) ? null : reader.GetGuid(ordinal);
    }
}
