using System.Data;
using Microsoft.Data.SqlClient;
using QRApp.Application.Notifications;
using QRApp.Infrastructure.Data;

namespace QRApp.Infrastructure.Notifications;

public sealed class SqlAdminNotificationRepository(ISqlConnectionFactory connectionFactory) : IAdminNotificationRepository
{
    public async Task<AdminNotificationResponse> CreateAsync(Guid tenantId, CreateAdminNotificationRequest request, CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedures.AdminNotificationCreate, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        command.AddGuid("@AdminNotificationId", Guid.NewGuid());
        command.AddGuid("@BranchId", request.BranchId);
        command.AddString("@TypeCode", request.TypeCode, 50);
        command.AddString("@Title", request.Title, 180);
        command.AddString("@Message", request.Message, 500);
        command.AddString("@TargetUrl", request.TargetUrl, 500);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            throw new DataException("AdminNotification_Create did not return a notification row.");
        }

        return ReadNotification(reader);
    }

    public async Task<IReadOnlyCollection<AdminNotificationResponse>> GetListAsync(Guid tenantId, Guid? branchId, CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedures.AdminNotificationGetList, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        command.AddNullableGuid("@BranchId", branchId);

        var notifications = new List<AdminNotificationResponse>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            notifications.Add(ReadNotification(reader));
        }

        return notifications;
    }

    public async Task MarkReadAsync(Guid tenantId, Guid notificationId, CancellationToken cancellationToken)
    {
        await ExecuteReadCommandAsync(StoredProcedures.AdminNotificationMarkRead, tenantId, notificationId, null, cancellationToken);
    }

    public async Task MarkAllReadAsync(Guid tenantId, Guid? branchId, CancellationToken cancellationToken)
    {
        await ExecuteReadCommandAsync(StoredProcedures.AdminNotificationMarkAllRead, tenantId, null, branchId, cancellationToken);
    }

    public async Task<IReadOnlyCollection<AdminSearchResultResponse>> SearchAsync(Guid tenantId, Guid? branchId, string query, CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedures.AdminSearch, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        command.AddNullableGuid("@BranchId", branchId);
        command.AddString("@Query", query, 120);

        var results = new List<AdminSearchResultResponse>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            results.Add(new AdminSearchResultResponse(
                reader.GetString(reader.GetOrdinal("TypeCode")),
                reader.GetGuid(reader.GetOrdinal("EntityId")),
                GetNullableGuid(reader, "BranchId"),
                reader.GetString(reader.GetOrdinal("Title")),
                reader.GetString(reader.GetOrdinal("Subtitle")),
                reader.GetString(reader.GetOrdinal("TargetUrl")),
                GetNullableDateTime(reader, "CreatedAtUtc")));
        }

        return results;
    }

    private async Task ExecuteReadCommandAsync(string procedureName, Guid tenantId, Guid? notificationId, Guid? branchId, CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(procedureName, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        if (notificationId.HasValue)
        {
            command.AddGuid("@AdminNotificationId", notificationId.Value);
        }

        if (branchId.HasValue || procedureName == StoredProcedures.AdminNotificationMarkAllRead)
        {
            command.AddNullableGuid("@BranchId", branchId);
        }

        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static AdminNotificationResponse ReadNotification(SqlDataReader reader)
    {
        return new AdminNotificationResponse(
            reader.GetGuid(reader.GetOrdinal("AdminNotificationId")),
            reader.GetGuid(reader.GetOrdinal("TenantId")),
            reader.GetGuid(reader.GetOrdinal("BranchId")),
            reader.GetString(reader.GetOrdinal("TypeCode")),
            reader.GetString(reader.GetOrdinal("Title")),
            reader.GetString(reader.GetOrdinal("Message")),
            reader.GetString(reader.GetOrdinal("TargetUrl")),
            reader.GetBoolean(reader.GetOrdinal("IsRead")),
            reader.GetDateTime(reader.GetOrdinal("CreatedAtUtc")),
            GetNullableDateTime(reader, "ReadAtUtc"));
    }

    private static DateTime? GetNullableDateTime(SqlDataReader reader, string name)
    {
        var ordinal = reader.GetOrdinal(name);
        return reader.IsDBNull(ordinal) ? null : reader.GetDateTime(ordinal);
    }

    private static Guid? GetNullableGuid(SqlDataReader reader, string name)
    {
        var ordinal = reader.GetOrdinal(name);
        return reader.IsDBNull(ordinal) ? null : reader.GetGuid(ordinal);
    }
}
