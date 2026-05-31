IF OBJECT_ID(N'dbo.WaiterCalls', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.WaiterCalls
    (
        WaiterCallId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_WaiterCalls PRIMARY KEY,
        RowId BIGINT IDENTITY(1,1) NOT NULL,
        TenantId UNIQUEIDENTIFIER NOT NULL,
        BranchId UNIQUEIDENTIFIER NOT NULL,
        TableId UNIQUEIDENTIFIER NOT NULL,
        StatusCode NVARCHAR(32) NOT NULL CONSTRAINT DF_WaiterCalls_StatusCode DEFAULT (N'Open'),
        CustomerName NVARCHAR(120) NULL,
        Note NVARCHAR(500) NULL,
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_WaiterCalls_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
        UpdatedAtUtc DATETIME2(3) NULL,
        RowVersion ROWVERSION NOT NULL,
        CONSTRAINT FK_WaiterCalls_Tenants FOREIGN KEY (TenantId) REFERENCES dbo.Tenants (TenantId),
        CONSTRAINT FK_WaiterCalls_Branches FOREIGN KEY (BranchId) REFERENCES dbo.Branches (BranchId),
        CONSTRAINT FK_WaiterCalls_BranchTables FOREIGN KEY (TableId) REFERENCES dbo.BranchTables (TableId),
        CONSTRAINT CK_WaiterCalls_StatusCode CHECK (StatusCode IN (N'Open', N'Acknowledged', N'Resolved', N'Cancelled'))
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_WaiterCalls_Tenant_Branch_Status_Created' AND object_id = OBJECT_ID(N'dbo.WaiterCalls'))
BEGIN
    CREATE INDEX IX_WaiterCalls_Tenant_Branch_Status_Created
    ON dbo.WaiterCalls (TenantId, BranchId, StatusCode, CreatedAtUtc DESC);
END;
GO

CREATE OR ALTER PROCEDURE dbo.WaiterCall_CreateFromQrToken
    @QrToken NVARCHAR(80),
    @WaiterCallId UNIQUEIDENTIFIER,
    @CustomerName NVARCHAR(120) = NULL,
    @Note NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE
        @TenantId UNIQUEIDENTIFIER,
        @BranchId UNIQUEIDENTIFIER,
        @TableId UNIQUEIDENTIFIER,
        @WaiterCallEnabled BIT;

    SELECT
        @TenantId = bt.TenantId,
        @BranchId = bt.BranchId,
        @TableId = bt.TableId,
        @WaiterCallEnabled = COALESCE(bos.WaiterCallEnabled, 1)
    FROM dbo.BranchTables bt
    INNER JOIN dbo.Branches b ON b.TenantId = bt.TenantId AND b.BranchId = bt.BranchId
    LEFT JOIN dbo.BranchOrderSettings bos ON bos.TenantId = bt.TenantId AND bos.BranchId = bt.BranchId
    WHERE bt.QrToken = @QrToken
      AND bt.IsActive = 1
      AND b.IsActive = 1;

    IF @TableId IS NULL
    BEGIN
        THROW 51801, 'Active QR table was not found.', 1;
    END;

    IF @WaiterCallEnabled = 0
    BEGIN
        THROW 51802, 'Waiter call is disabled for this branch.', 1;
    END;

    INSERT INTO dbo.WaiterCalls
    (
        WaiterCallId,
        TenantId,
        BranchId,
        TableId,
        StatusCode,
        CustomerName,
        Note
    )
    VALUES
    (
        @WaiterCallId,
        @TenantId,
        @BranchId,
        @TableId,
        N'Open',
        NULLIF(LTRIM(RTRIM(@CustomerName)), N''),
        NULLIF(LTRIM(RTRIM(@Note)), N'')
    );

    SELECT
        wc.WaiterCallId,
        wc.TenantId,
        wc.BranchId,
        wc.TableId,
        bt.Name AS TableName,
        wc.StatusCode,
        wc.CustomerName,
        wc.Note,
        wc.CreatedAtUtc,
        wc.UpdatedAtUtc
    FROM dbo.WaiterCalls wc
    INNER JOIN dbo.BranchTables bt ON bt.TenantId = wc.TenantId AND bt.BranchId = wc.BranchId AND bt.TableId = wc.TableId
    WHERE wc.WaiterCallId = @WaiterCallId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.WaiterCall_GetListByBranch
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER,
    @IncludeResolved BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        wc.WaiterCallId,
        wc.TenantId,
        wc.BranchId,
        wc.TableId,
        bt.Name AS TableName,
        wc.StatusCode,
        wc.CustomerName,
        wc.Note,
        wc.CreatedAtUtc,
        wc.UpdatedAtUtc
    FROM dbo.WaiterCalls wc
    INNER JOIN dbo.BranchTables bt ON bt.TenantId = wc.TenantId AND bt.BranchId = wc.BranchId AND bt.TableId = wc.TableId
    WHERE wc.TenantId = @TenantId
      AND wc.BranchId = @BranchId
      AND (@IncludeResolved = 1 OR wc.StatusCode NOT IN (N'Resolved', N'Cancelled'))
    ORDER BY wc.CreatedAtUtc DESC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.WaiterCall_UpdateStatus
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER,
    @WaiterCallId UNIQUEIDENTIFIER,
    @StatusCode NVARCHAR(32)
AS
BEGIN
    SET NOCOUNT ON;

    IF @StatusCode NOT IN (N'Open', N'Acknowledged', N'Resolved', N'Cancelled')
    BEGIN
        THROW 51803, 'Waiter call status is invalid.', 1;
    END;

    UPDATE dbo.WaiterCalls
    SET
        StatusCode = @StatusCode,
        UpdatedAtUtc = SYSUTCDATETIME()
    WHERE TenantId = @TenantId
      AND BranchId = @BranchId
      AND WaiterCallId = @WaiterCallId;

    IF @@ROWCOUNT = 0
    BEGIN
        THROW 51804, 'Waiter call was not found for this tenant and branch.', 1;
    END;

    SELECT
        wc.WaiterCallId,
        wc.TenantId,
        wc.BranchId,
        wc.TableId,
        bt.Name AS TableName,
        wc.StatusCode,
        wc.CustomerName,
        wc.Note,
        wc.CreatedAtUtc,
        wc.UpdatedAtUtc
    FROM dbo.WaiterCalls wc
    INNER JOIN dbo.BranchTables bt ON bt.TenantId = wc.TenantId AND bt.BranchId = wc.BranchId AND bt.TableId = wc.TableId
    WHERE wc.TenantId = @TenantId
      AND wc.BranchId = @BranchId
      AND wc.WaiterCallId = @WaiterCallId;
END;
GO
