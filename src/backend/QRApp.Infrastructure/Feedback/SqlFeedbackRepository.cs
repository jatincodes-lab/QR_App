using System.Data;
using Microsoft.Data.SqlClient;
using QRApp.Application.Feedback;
using QRApp.Infrastructure.Data;

namespace QRApp.Infrastructure.Feedback;

public sealed class SqlFeedbackRepository(ISqlConnectionFactory connectionFactory) : IFeedbackRepository
{
    public async Task<OrderFeedbackResponse> CreatePublicAsync(
        string qrToken,
        Guid orderId,
        Guid orderFeedbackId,
        CreateOrderFeedbackRequest request,
        CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedures.OrderFeedbackCreateFromQrToken, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddString("@QrToken", qrToken, 80);
        command.AddGuid("@OrderId", orderId);
        command.AddGuid("@OrderFeedbackId", orderFeedbackId);
        command.AddInt("@Rating", request.Rating);
        command.AddString("@Comment", request.Comment, 500);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            throw new DataException("OrderFeedback_CreateFromQrToken did not return a row.");
        }

        return ReadPublic(reader);
    }

    public async Task<OrderFeedbackResponse?> GetPublicByOrderAsync(string qrToken, Guid orderId, CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedures.OrderFeedbackGetByQrToken, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddString("@QrToken", qrToken, 80);
        command.AddGuid("@OrderId", orderId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? ReadPublic(reader) : null;
    }

    public async Task<IReadOnlyCollection<AdminFeedbackResponse>> GetAdminListAsync(Guid tenantId, Guid? branchId, CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedures.AdminFeedbackGetList, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        command.AddNullableGuid("@BranchId", branchId);

        var feedback = new List<AdminFeedbackResponse>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            feedback.Add(new AdminFeedbackResponse(
                reader.GetGuid(reader.GetOrdinal("OrderFeedbackId")),
                reader.GetGuid(reader.GetOrdinal("TenantId")),
                reader.GetGuid(reader.GetOrdinal("BranchId")),
                reader.GetString(reader.GetOrdinal("BranchName")),
                reader.GetGuid(reader.GetOrdinal("OrderId")),
                reader.GetString(reader.GetOrdinal("TableName")),
                GetNullableGuid(reader, "CustomerId"),
                GetNullableString(reader, "CustomerName"),
                GetNullableString(reader, "CustomerWhatsApp"),
                reader.GetInt32(reader.GetOrdinal("Rating")),
                GetNullableString(reader, "Comment"),
                reader.GetDateTime(reader.GetOrdinal("OrderCreatedAtUtc")),
                reader.GetDateTime(reader.GetOrdinal("CreatedAtUtc"))));
        }

        return feedback;
    }

    private static OrderFeedbackResponse ReadPublic(SqlDataReader reader)
    {
        return new OrderFeedbackResponse(
            reader.GetGuid(reader.GetOrdinal("OrderFeedbackId")),
            reader.GetGuid(reader.GetOrdinal("TenantId")),
            reader.GetGuid(reader.GetOrdinal("BranchId")),
            reader.GetGuid(reader.GetOrdinal("OrderId")),
            GetNullableGuid(reader, "CustomerId"),
            reader.GetInt32(reader.GetOrdinal("Rating")),
            GetNullableString(reader, "Comment"),
            reader.GetDateTime(reader.GetOrdinal("CreatedAtUtc")));
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
