DECLARE @ConstraintName SYSNAME;
DECLARE @Sql NVARCHAR(MAX);

SELECT @ConstraintName = dc.name
FROM sys.default_constraints dc
INNER JOIN sys.columns c ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id
WHERE dc.parent_object_id = OBJECT_ID(N'dbo.Orders')
  AND c.name = N'CreatedAtUtc';

IF @ConstraintName IS NOT NULL
BEGIN
    SET @Sql = N'ALTER TABLE dbo.Orders DROP CONSTRAINT ' + QUOTENAME(@ConstraintName);
    EXEC sp_executesql @Sql;
END;
GO

ALTER TABLE dbo.Orders
ADD CONSTRAINT DF_Orders_CreatedAtUtc DEFAULT (DATEADD(MINUTE, 330, SYSUTCDATETIME())) FOR CreatedAtUtc;
GO

DECLARE @ConstraintName SYSNAME;
DECLARE @Sql NVARCHAR(MAX);

SELECT @ConstraintName = dc.name
FROM sys.default_constraints dc
INNER JOIN sys.columns c ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id
WHERE dc.parent_object_id = OBJECT_ID(N'dbo.OrderItems')
  AND c.name = N'CreatedAtUtc';

IF @ConstraintName IS NOT NULL
BEGIN
    SET @Sql = N'ALTER TABLE dbo.OrderItems DROP CONSTRAINT ' + QUOTENAME(@ConstraintName);
    EXEC sp_executesql @Sql;
END;
GO

ALTER TABLE dbo.OrderItems
ADD CONSTRAINT DF_OrderItems_CreatedAtUtc DEFAULT (DATEADD(MINUTE, 330, SYSUTCDATETIME())) FOR CreatedAtUtc;
GO

IF OBJECT_ID(N'dbo.WaiterCalls', N'U') IS NOT NULL
BEGIN
    DECLARE @ConstraintName SYSNAME;
    DECLARE @Sql NVARCHAR(MAX);

    SELECT @ConstraintName = dc.name
    FROM sys.default_constraints dc
    INNER JOIN sys.columns c ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id
    WHERE dc.parent_object_id = OBJECT_ID(N'dbo.WaiterCalls')
      AND c.name = N'CreatedAtUtc';

    IF @ConstraintName IS NOT NULL
    BEGIN
        SET @Sql = N'ALTER TABLE dbo.WaiterCalls DROP CONSTRAINT ' + QUOTENAME(@ConstraintName);
        EXEC sp_executesql @Sql;
    END;

    ALTER TABLE dbo.WaiterCalls
    ADD CONSTRAINT DF_WaiterCalls_CreatedAtUtc DEFAULT (DATEADD(MINUTE, 330, SYSUTCDATETIME())) FOR CreatedAtUtc;
END;
GO
