using System.Data;
using Microsoft.Data.SqlClient;
using QRApp.Application.Customers;
using QRApp.Infrastructure.Data;

namespace QRApp.Infrastructure.Customers;

public sealed class SqlCustomerRepository(ISqlConnectionFactory connectionFactory) : ICustomerRepository
{
    public async Task<PublicCustomerLookupResponse?> LookupPublicCustomerAsync(
        string qrToken,
        string customerWhatsApp,
        CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedures.PublicCustomerLookupByQrToken, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddString("@QrToken", qrToken, 80);
        command.AddString("@CustomerWhatsApp", customerWhatsApp, 32);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        var customerId = reader.GetGuid(reader.GetOrdinal("CustomerId"));
        var customer = new PublicCustomerLookupResponse(
            customerId,
            GetNullableString(reader, "Name"),
            reader.GetString(reader.GetOrdinal("WhatsAppNumber")),
            reader.GetBoolean(reader.GetOrdinal("MarketingConsent")),
            reader.GetInt32(reader.GetOrdinal("VisitCount")),
            reader.GetInt32(reader.GetOrdinal("TotalOrderCount")),
            reader.GetDecimal(reader.GetOrdinal("TotalOrderValue")),
            reader.GetDateTime(reader.GetOrdinal("LastVisitAtUtc")),
            Array.Empty<PublicCustomerRecentOrderResponse>());

        var orders = new List<PublicCustomerRecentOrderResponse>();
        if (await reader.NextResultAsync(cancellationToken))
        {
            while (await reader.ReadAsync(cancellationToken))
            {
                orders.Add(new PublicCustomerRecentOrderResponse(
                    reader.GetGuid(reader.GetOrdinal("OrderId")),
                    reader.GetDateTime(reader.GetOrdinal("CreatedAtUtc")),
                    reader.GetDecimal(reader.GetOrdinal("TotalAmount")),
                    Array.Empty<PublicCustomerRecentOrderItemResponse>()));
            }
        }

        var itemsByOrderId = new Dictionary<Guid, List<PublicCustomerRecentOrderItemResponse>>();
        if (await reader.NextResultAsync(cancellationToken))
        {
            while (await reader.ReadAsync(cancellationToken))
            {
                var item = ReadRecentOrderItem(reader);
                if (!itemsByOrderId.TryGetValue(item.OrderId, out var items))
                {
                    items = [];
                    itemsByOrderId[item.OrderId] = items;
                }

                items.Add(item);
            }
        }

        var recentOrders = orders
            .Select(order => order with
            {
                Items = itemsByOrderId.TryGetValue(order.OrderId, out var items)
                    ? items
                    : Array.Empty<PublicCustomerRecentOrderItemResponse>()
            })
            .Where(order => order.Items.Count > 0)
            .ToArray();

        return customer with { RecentOrders = recentOrders };
    }

    private static PublicCustomerRecentOrderItemResponse ReadRecentOrderItem(SqlDataReader reader)
    {
        return new PublicCustomerRecentOrderItemResponse(
            reader.GetGuid(reader.GetOrdinal("OrderId")),
            reader.GetGuid(reader.GetOrdinal("MenuItemId")),
            GetNullableGuid(reader, "MenuItemVariantId"),
            reader.GetString(reader.GetOrdinal("MenuItemName")),
            GetNullableString(reader, "VariantName"),
            GetNullableString(reader, "ItemNote"),
            reader.GetInt32(reader.GetOrdinal("Quantity")));
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
