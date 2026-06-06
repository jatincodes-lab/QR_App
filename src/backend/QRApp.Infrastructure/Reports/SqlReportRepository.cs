using System.Data;
using Microsoft.Data.SqlClient;
using QRApp.Application.Reports;
using QRApp.Infrastructure.Data;

namespace QRApp.Infrastructure.Reports;

public sealed class SqlReportRepository(ISqlConnectionFactory connectionFactory) : IReportRepository
{
    public async Task<OrderReportSummaryResponse> GetOrderSummaryAsync(Guid tenantId, OrderReportFilter filter, CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = CreateReportCommand(connection, StoredProcedures.ReportOrderSummary, tenantId, filter);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return new OrderReportSummaryResponse(0, 0, 0, 0, 0, 0);
        }

        return new OrderReportSummaryResponse(
            GetInt32OrZero(reader, "TotalOrders"),
            GetInt32OrZero(reader, "CompletedOrders"),
            GetInt32OrZero(reader, "CancelledOrders"),
            GetDecimalOrZero(reader, "TotalOrderValue"),
            GetDecimalOrZero(reader, "AverageOrderValue"),
            GetDecimalOrZero(reader, "AverageReadyMinutes"));
    }

    public async Task<IReadOnlyCollection<OrderReportListItemResponse>> GetOrdersAsync(Guid tenantId, OrderReportFilter filter, CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = CreateReportCommand(connection, StoredProcedures.ReportOrders, tenantId, filter);

        var orders = new List<OrderReportListItemResponse>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            orders.Add(ReadOrder(reader));
        }

        return orders;
    }

    public async Task<OrderReportDetailResponse> GetOrderDetailAsync(Guid tenantId, Guid orderId, CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedures.ReportOrderDetail, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        command.AddGuid("@OrderId", orderId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            throw new DataException("Report_OrderDetail did not return an order row.");
        }

        var order = ReadOrder(reader);
        var items = new List<OrderReportItemResponse>();
        var history = new List<OrderStatusHistoryResponse>();

        if (await reader.NextResultAsync(cancellationToken))
        {
            while (await reader.ReadAsync(cancellationToken))
            {
                items.Add(ReadItem(reader));
            }
        }

        if (await reader.NextResultAsync(cancellationToken))
        {
            while (await reader.ReadAsync(cancellationToken))
            {
                history.Add(ReadHistory(reader));
            }
        }

        return new OrderReportDetailResponse(order, items, history);
    }

    public async Task<IReadOnlyCollection<ItemReportResponse>> GetItemsAsync(Guid tenantId, OrderReportFilter filter, CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = CreateReportCommand(connection, StoredProcedures.ReportItems, tenantId, filter);

        var items = new List<ItemReportResponse>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(new ItemReportResponse(
                reader.GetString(reader.GetOrdinal("ItemName")),
                GetNullableString(reader, "VariantName"),
                reader.GetInt32(reader.GetOrdinal("Quantity")),
                reader.GetInt32(reader.GetOrdinal("OrderCount")),
                reader.GetDecimal(reader.GetOrdinal("TotalValue"))));
        }

        return items;
    }

    public async Task<IReadOnlyCollection<CustomerReportResponse>> GetCustomersAsync(Guid tenantId, OrderReportFilter filter, CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = CreateReportCommand(connection, StoredProcedures.ReportCustomers, tenantId, filter);

        var customers = new List<CustomerReportResponse>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            customers.Add(ReadCustomer(reader));
        }

        return customers;
    }

    private static SqlCommand CreateReportCommand(SqlConnection connection, string procedureName, Guid tenantId, OrderReportFilter filter)
    {
        var command = new SqlCommand(procedureName, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        command.AddNullableGuid("@BranchId", filter.BranchId);
        command.AddDateTime("@DateFrom", filter.DateFrom);
        command.AddDateTime("@DateTo", filter.DateTo);
        command.AddString("@StatusCode", filter.StatusCode, 32);
        command.AddString("@Search", filter.Search, 120);

        return command;
    }

    private static OrderReportListItemResponse ReadOrder(SqlDataReader reader)
    {
        return new OrderReportListItemResponse(
            reader.GetGuid(reader.GetOrdinal("OrderId")),
            reader.GetGuid(reader.GetOrdinal("BranchId")),
            reader.GetString(reader.GetOrdinal("BranchName")),
            reader.GetGuid(reader.GetOrdinal("TableId")),
            reader.GetString(reader.GetOrdinal("TableName")),
            reader.GetString(reader.GetOrdinal("OrderStatusCode")),
            GetNullableString(reader, "CustomerName"),
            GetNullableString(reader, "CustomerWhatsApp"),
            GetNullableString(reader, "Notes"),
            reader.GetDecimal(reader.GetOrdinal("TotalAmount")),
            reader.GetInt32(reader.GetOrdinal("ItemCount")),
            reader.GetDateTime(reader.GetOrdinal("CreatedAtUtc")),
            GetNullableDateTime(reader, "UpdatedAtUtc"),
            GetNullableDateTime(reader, "AcceptedAtUtc"),
            GetNullableDateTime(reader, "PreparingAtUtc"),
            GetNullableDateTime(reader, "ReadyAtUtc"),
            GetNullableDateTime(reader, "ServedAtUtc"),
            GetNullableDateTime(reader, "CompletedAtUtc"),
            GetNullableDateTime(reader, "CancelledAtUtc"),
            GetNullableString(reader, "LatestReason"));
    }

    private static CustomerReportResponse ReadCustomer(SqlDataReader reader)
    {
        var customerId = HasColumn(reader, "CustomerId") ? GetNullableGuid(reader, "CustomerId") : null;
        var customerKey = HasColumn(reader, "CustomerKey")
            ? reader.GetString(reader.GetOrdinal("CustomerKey"))
            : customerId?.ToString() ?? GetNullableString(reader, "CustomerWhatsApp") ?? GetNullableString(reader, "CustomerName") ?? "Guest";
        var orderCount = reader.GetInt32(reader.GetOrdinal("OrderCount"));
        var totalValue = reader.GetDecimal(reader.GetOrdinal("TotalValue"));
        var lastOrderAtUtc = GetNullableDateTime(reader, "LastOrderAtUtc");

        return new CustomerReportResponse(
            customerId,
            customerKey,
            GetNullableString(reader, "CustomerName"),
            GetNullableString(reader, "CustomerWhatsApp"),
            HasColumn(reader, "MarketingConsent") && reader.GetBoolean(reader.GetOrdinal("MarketingConsent")),
            HasColumn(reader, "VisitCount") ? reader.GetInt32(reader.GetOrdinal("VisitCount")) : orderCount,
            orderCount,
            totalValue,
            HasColumn(reader, "FirstVisitAtUtc") ? GetNullableDateTime(reader, "FirstVisitAtUtc") : null,
            HasColumn(reader, "LastVisitAtUtc") ? GetNullableDateTime(reader, "LastVisitAtUtc") : lastOrderAtUtc,
            lastOrderAtUtc,
            HasColumn(reader, "BranchesVisited") ? reader.GetInt32(reader.GetOrdinal("BranchesVisited")) : 0,
            HasColumn(reader, "FirstBranchName") ? GetNullableString(reader, "FirstBranchName") : null,
            HasColumn(reader, "LastBranchName") ? GetNullableString(reader, "LastBranchName") : null,
            HasColumn(reader, "FavoriteItemName") ? GetNullableString(reader, "FavoriteItemName") : null,
            HasColumn(reader, "FavoriteVariantName") ? GetNullableString(reader, "FavoriteVariantName") : null,
            HasColumn(reader, "FavoriteItemQuantity") ? reader.GetInt32(reader.GetOrdinal("FavoriteItemQuantity")) : 0);
    }

    private static OrderReportItemResponse ReadItem(SqlDataReader reader)
    {
        return new OrderReportItemResponse(
            reader.GetGuid(reader.GetOrdinal("OrderItemId")),
            reader.GetGuid(reader.GetOrdinal("MenuItemId")),
            GetNullableGuid(reader, "MenuItemVariantId"),
            reader.GetString(reader.GetOrdinal("MenuItemName")),
            GetNullableString(reader, "VariantName"),
            GetNullableString(reader, "ItemNote"),
            reader.GetDecimal(reader.GetOrdinal("UnitPrice")),
            reader.GetInt32(reader.GetOrdinal("Quantity")),
            reader.GetDecimal(reader.GetOrdinal("LineTotal")));
    }

    private static OrderStatusHistoryResponse ReadHistory(SqlDataReader reader)
    {
        return new OrderStatusHistoryResponse(
            reader.GetGuid(reader.GetOrdinal("OrderStatusHistoryId")),
            reader.GetGuid(reader.GetOrdinal("OrderId")),
            GetNullableString(reader, "OldStatusCode"),
            reader.GetString(reader.GetOrdinal("NewStatusCode")),
            GetNullableString(reader, "Reason"),
            GetNullableGuid(reader, "ChangedByUserId"),
            reader.GetDateTime(reader.GetOrdinal("CreatedAtUtc")));
    }

    private static string? GetNullableString(SqlDataReader reader, string name)
    {
        var ordinal = reader.GetOrdinal(name);
        return reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal);
    }

    private static int GetInt32OrZero(SqlDataReader reader, string name)
    {
        var ordinal = reader.GetOrdinal(name);
        return reader.IsDBNull(ordinal) ? 0 : reader.GetInt32(ordinal);
    }

    private static decimal GetDecimalOrZero(SqlDataReader reader, string name)
    {
        var ordinal = reader.GetOrdinal(name);
        return reader.IsDBNull(ordinal) ? 0 : reader.GetDecimal(ordinal);
    }

    private static Guid? GetNullableGuid(SqlDataReader reader, string name)
    {
        var ordinal = reader.GetOrdinal(name);
        return reader.IsDBNull(ordinal) ? null : reader.GetGuid(ordinal);
    }

    private static DateTime? GetNullableDateTime(SqlDataReader reader, string name)
    {
        var ordinal = reader.GetOrdinal(name);
        return reader.IsDBNull(ordinal) ? null : reader.GetDateTime(ordinal);
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
