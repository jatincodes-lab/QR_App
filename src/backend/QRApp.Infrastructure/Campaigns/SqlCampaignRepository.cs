using System.Data;
using Microsoft.Data.SqlClient;
using QRApp.Application.Campaigns;
using QRApp.Infrastructure.Data;

namespace QRApp.Infrastructure.Campaigns;

public sealed class SqlCampaignRepository(ISqlConnectionFactory connectionFactory) : ICampaignRepository
{
    public async Task<CampaignPreviewResponse> PreviewRecipientsAsync(Guid tenantId, Guid? branchId, string targetSegment, CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedures.WhatsAppCampaignPreviewRecipients, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        command.AddNullableGuid("@BranchId", branchId);
        command.AddString("@TargetSegment", targetSegment, 40);

        var count = await command.ExecuteScalarAsync(cancellationToken);
        return new CampaignPreviewResponse(count is int value ? value : 0);
    }

    public async Task<CampaignResponse> CreateAsync(Guid tenantId, Guid campaignId, CreateCampaignRequest request, CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedures.WhatsAppCampaignCreate, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        command.AddGuid("@CampaignId", campaignId);
        command.AddNullableGuid("@BranchId", request.BranchId);
        command.AddString("@Name", request.Name, 120);
        command.AddString("@TargetSegment", request.TargetSegment, 40);
        command.AddString("@MessageText", request.MessageText, 1000);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            throw new DataException("WhatsAppCampaign_Create did not return a campaign row.");
        }

        return ReadCampaign(reader);
    }

    public async Task<IReadOnlyCollection<CampaignResponse>> GetListAsync(Guid tenantId, Guid? branchId, CancellationToken cancellationToken)
    {
        await using var connection = (SqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedures.WhatsAppCampaignGetList, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        command.AddNullableGuid("@BranchId", branchId);

        var campaigns = new List<CampaignResponse>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            campaigns.Add(ReadCampaign(reader));
        }

        return campaigns;
    }

    private static CampaignResponse ReadCampaign(SqlDataReader reader)
    {
        return new CampaignResponse(
            reader.GetGuid(reader.GetOrdinal("CampaignId")),
            reader.GetGuid(reader.GetOrdinal("TenantId")),
            GetNullableGuid(reader, "BranchId"),
            GetNullableString(reader, "BranchName"),
            reader.GetString(reader.GetOrdinal("Name")),
            reader.GetString(reader.GetOrdinal("TargetSegment")),
            reader.GetString(reader.GetOrdinal("MessageText")),
            reader.GetString(reader.GetOrdinal("StatusCode")),
            reader.GetInt32(reader.GetOrdinal("RecipientCount")),
            reader.GetInt32(reader.GetOrdinal("SentCount")),
            reader.GetInt32(reader.GetOrdinal("FailedCount")),
            reader.GetDateTime(reader.GetOrdinal("CreatedAtUtc")),
            GetNullableDateTime(reader, "QueuedAtUtc"),
            GetNullableDateTime(reader, "StartedAtUtc"),
            GetNullableDateTime(reader, "CompletedAtUtc"),
            GetNullableDateTime(reader, "UpdatedAtUtc"));
    }

    private static Guid? GetNullableGuid(SqlDataReader reader, string name)
    {
        var ordinal = reader.GetOrdinal(name);
        return reader.IsDBNull(ordinal) ? null : reader.GetGuid(ordinal);
    }

    private static string? GetNullableString(SqlDataReader reader, string name)
    {
        var ordinal = reader.GetOrdinal(name);
        return reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal);
    }

    private static DateTime? GetNullableDateTime(SqlDataReader reader, string name)
    {
        var ordinal = reader.GetOrdinal(name);
        return reader.IsDBNull(ordinal) ? null : reader.GetDateTime(ordinal);
    }
}
