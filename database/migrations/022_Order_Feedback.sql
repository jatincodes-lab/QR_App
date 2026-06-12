IF OBJECT_ID(N'dbo.OrderFeedback', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OrderFeedback
    (
        OrderFeedbackId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_OrderFeedback PRIMARY KEY,
        TenantId UNIQUEIDENTIFIER NOT NULL,
        BranchId UNIQUEIDENTIFIER NOT NULL,
        OrderId UNIQUEIDENTIFIER NOT NULL,
        CustomerId UNIQUEIDENTIFIER NULL,
        Rating INT NOT NULL,
        Comment NVARCHAR(500) NULL,
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_OrderFeedback_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
        RowVersion ROWVERSION NOT NULL,
        CONSTRAINT FK_OrderFeedback_Tenants FOREIGN KEY (TenantId) REFERENCES dbo.Tenants (TenantId),
        CONSTRAINT FK_OrderFeedback_Branches FOREIGN KEY (BranchId) REFERENCES dbo.Branches (BranchId),
        CONSTRAINT FK_OrderFeedback_Orders FOREIGN KEY (OrderId) REFERENCES dbo.Orders (OrderId),
        CONSTRAINT FK_OrderFeedback_Customers FOREIGN KEY (CustomerId) REFERENCES dbo.Customers (CustomerId),
        CONSTRAINT CK_OrderFeedback_Rating CHECK (Rating BETWEEN 1 AND 5)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_OrderFeedback_OrderId' AND object_id = OBJECT_ID(N'dbo.OrderFeedback'))
BEGIN
    CREATE UNIQUE INDEX UX_OrderFeedback_OrderId ON dbo.OrderFeedback (OrderId);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_OrderFeedback_TenantId_BranchId_CreatedAtUtc' AND object_id = OBJECT_ID(N'dbo.OrderFeedback'))
BEGIN
    CREATE INDEX IX_OrderFeedback_TenantId_BranchId_CreatedAtUtc ON dbo.OrderFeedback (TenantId, BranchId, CreatedAtUtc DESC);
END;
GO

CREATE OR ALTER PROCEDURE dbo.OrderFeedback_CreateFromQrToken
    @QrToken NVARCHAR(80),
    @OrderId UNIQUEIDENTIFIER,
    @OrderFeedbackId UNIQUEIDENTIFIER,
    @Rating INT,
    @Comment NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @Rating NOT BETWEEN 1 AND 5
    BEGIN
        THROW 51770, 'Rating must be between 1 and 5.', 1;
    END;

    DECLARE @TenantId UNIQUEIDENTIFIER;
    DECLARE @BranchId UNIQUEIDENTIFIER;
    DECLARE @TableId UNIQUEIDENTIFIER;
    DECLARE @CustomerId UNIQUEIDENTIFIER;
    DECLARE @OrderStatusCode NVARCHAR(32);
    DECLARE @CleanComment NVARCHAR(500) = NULLIF(LTRIM(RTRIM(@Comment)), N'');

    SELECT
        @TenantId = o.TenantId,
        @BranchId = o.BranchId,
        @TableId = o.TableId,
        @CustomerId = o.CustomerId,
        @OrderStatusCode = o.OrderStatusCode
    FROM dbo.Orders o
    INNER JOIN dbo.BranchTables bt ON bt.TenantId = o.TenantId
        AND bt.BranchId = o.BranchId
        AND bt.TableId = o.TableId
    INNER JOIN dbo.Branches b ON b.TenantId = o.TenantId
        AND b.BranchId = o.BranchId
    WHERE bt.QrToken = @QrToken
      AND bt.IsActive = 1
      AND b.IsActive = 1
      AND o.OrderId = @OrderId;

    IF @TenantId IS NULL
    BEGIN
        THROW 51771, 'Order was not found for this QR code.', 1;
    END;

    IF @OrderStatusCode <> N'Completed'
    BEGIN
        THROW 51772, 'Feedback can be submitted only after the order is completed.', 1;
    END;

    INSERT INTO dbo.OrderFeedback
    (
        OrderFeedbackId,
        TenantId,
        BranchId,
        OrderId,
        CustomerId,
        Rating,
        Comment
    )
    VALUES
    (
        @OrderFeedbackId,
        @TenantId,
        @BranchId,
        @OrderId,
        @CustomerId,
        @Rating,
        @CleanComment
    );

    EXEC dbo.OrderFeedback_GetByQrToken @QrToken = @QrToken, @OrderId = @OrderId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.OrderFeedback_GetByQrToken
    @QrToken NVARCHAR(80),
    @OrderId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        feedback.OrderFeedbackId,
        feedback.TenantId,
        feedback.BranchId,
        feedback.OrderId,
        feedback.CustomerId,
        feedback.Rating,
        feedback.Comment,
        feedback.CreatedAtUtc
    FROM dbo.OrderFeedback feedback
    INNER JOIN dbo.Orders o ON o.TenantId = feedback.TenantId
        AND o.BranchId = feedback.BranchId
        AND o.OrderId = feedback.OrderId
    INNER JOIN dbo.BranchTables bt ON bt.TenantId = o.TenantId
        AND bt.BranchId = o.BranchId
        AND bt.TableId = o.TableId
    INNER JOIN dbo.Branches b ON b.TenantId = o.TenantId
        AND b.BranchId = o.BranchId
    WHERE bt.QrToken = @QrToken
      AND bt.IsActive = 1
      AND b.IsActive = 1
      AND feedback.OrderId = @OrderId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.AdminFeedback_GetList
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP (200)
        feedback.OrderFeedbackId,
        feedback.TenantId,
        feedback.BranchId,
        b.Name AS BranchName,
        feedback.OrderId,
        bt.Name AS TableName,
        feedback.CustomerId,
        o.CustomerName,
        o.CustomerWhatsApp,
        feedback.Rating,
        feedback.Comment,
        o.CreatedAtUtc AS OrderCreatedAtUtc,
        feedback.CreatedAtUtc
    FROM dbo.OrderFeedback feedback
    INNER JOIN dbo.Branches b ON b.TenantId = feedback.TenantId
        AND b.BranchId = feedback.BranchId
    INNER JOIN dbo.Orders o ON o.TenantId = feedback.TenantId
        AND o.BranchId = feedback.BranchId
        AND o.OrderId = feedback.OrderId
    INNER JOIN dbo.BranchTables bt ON bt.TenantId = o.TenantId
        AND bt.BranchId = o.BranchId
        AND bt.TableId = o.TableId
    WHERE feedback.TenantId = @TenantId
      AND (@BranchId IS NULL OR feedback.BranchId = @BranchId)
    ORDER BY feedback.CreatedAtUtc DESC;
END;
GO
