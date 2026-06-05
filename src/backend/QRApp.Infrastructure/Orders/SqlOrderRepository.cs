using System.Data;
using System.Text.Json;
using Microsoft.Data.SqlClient;
using QRApp.Application.Orders;
using QRApp.Infrastructure.Data;

namespace QRApp.Infrastructure.Orders;

public sealed class SqlOrderRepository(ISqlConnectionFactory connectionFactory) : IOrderRepository
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task<PublicOrderResponse> CreateFromQrTokenAsync(
        string qrToken,
        Guid orderId,
        CreatePublicQrOrderRequest request,
        CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedures.PublicOrderCreateFromQrToken, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddString("@QrToken", qrToken, 80);
        command.AddGuid("@OrderId", orderId);
        command.AddString("@CustomerName", request.CustomerName, 120);
        command.AddString("@CustomerWhatsApp", request.CustomerWhatsApp, 32);
        command.AddString("@Notes", request.Notes, 500);
        command.AddString("@ItemsJson", JsonSerializer.Serialize(request.Items, JsonOptions), -1);
        command.AddBool("@MarketingConsent", request.MarketingConsent);
        command.AddString("@MarketingConsentSource", "qr_checkout", 80);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            throw new DataException("PublicOrder_CreateFromQrToken did not return an order row.");
        }

        var order = ReadOrder(reader);
        var items = new List<PublicOrderItemResponse>();

        if (await reader.NextResultAsync(cancellationToken))
        {
            while (await reader.ReadAsync(cancellationToken))
            {
                items.Add(ReadOrderItem(reader));
            }
        }

        return order with { Items = items };
    }

    public async Task<PublicOrderResponse> GetByQrTokenAsync(
        string qrToken,
        Guid orderId,
        CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedures.PublicOrderGetByQrToken, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddString("@QrToken", qrToken, 80);
        command.AddGuid("@OrderId", orderId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            throw new DataException("PublicOrder_GetByQrToken did not return an order row.");
        }

        var order = ReadOrder(reader);
        var items = new List<PublicOrderItemResponse>();

        if (await reader.NextResultAsync(cancellationToken))
        {
            while (await reader.ReadAsync(cancellationToken))
            {
                items.Add(ReadOrderItem(reader));
            }
        }

        return order with { Items = items };
    }

    private static PublicOrderResponse ReadOrder(SqlDataReader reader)
    {
        return new PublicOrderResponse(
            reader.GetGuid(reader.GetOrdinal("OrderId")),
            reader.GetGuid(reader.GetOrdinal("TenantId")),
            reader.GetGuid(reader.GetOrdinal("BranchId")),
            reader.GetGuid(reader.GetOrdinal("TableId")),
            reader.GetString(reader.GetOrdinal("OrderStatusCode")),
            GetNullableString(reader, "CustomerName"),
            GetNullableString(reader, "CustomerWhatsApp"),
            GetNullableString(reader, "Notes"),
            reader.GetDecimal(reader.GetOrdinal("SubtotalAmount")),
            reader.GetDecimal(reader.GetOrdinal("TotalAmount")),
            reader.GetDateTime(reader.GetOrdinal("CreatedAtUtc")),
            reader.IsDBNull(reader.GetOrdinal("UpdatedAtUtc")) ? null : reader.GetDateTime(reader.GetOrdinal("UpdatedAtUtc")),
            Array.Empty<PublicOrderItemResponse>());
    }

    private static PublicOrderItemResponse ReadOrderItem(SqlDataReader reader)
    {
        return new PublicOrderItemResponse(
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
