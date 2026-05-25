using System.Data.Common;

namespace QRApp.Infrastructure.Data;

public interface ISqlConnectionFactory
{
    DbConnection CreateConnection();
}

