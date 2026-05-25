using System.Data;
using Microsoft.Data.SqlClient;

namespace QRApp.Infrastructure.Data;

internal static class SqlCommandExtensions
{
    public static void AddGuid(this SqlCommand command, string name, Guid value)
    {
        command.Parameters.Add(name, SqlDbType.UniqueIdentifier).Value = value;
    }

    public static void AddString(this SqlCommand command, string name, string? value, int length)
    {
        var parameter = command.Parameters.Add(name, SqlDbType.NVarChar, length);
        parameter.Value = value is null ? DBNull.Value : value;
    }

    public static void AddChar(this SqlCommand command, string name, string value, int length)
    {
        command.Parameters.Add(name, SqlDbType.Char, length).Value = value;
    }

    public static void AddBool(this SqlCommand command, string name, bool value)
    {
        command.Parameters.Add(name, SqlDbType.Bit).Value = value;
    }

    public static void AddInt(this SqlCommand command, string name, int value)
    {
        command.Parameters.Add(name, SqlDbType.Int).Value = value;
    }

    public static void AddDecimal(this SqlCommand command, string name, decimal value, byte precision, byte scale)
    {
        var parameter = command.Parameters.Add(name, SqlDbType.Decimal);
        parameter.Precision = precision;
        parameter.Scale = scale;
        parameter.Value = value;
    }
}
