IF OBJECT_ID(N'dbo.AdminNotifications', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AdminNotifications
    (
        AdminNotificationId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_AdminNotifications PRIMARY KEY,
        RowId BIGINT IDENTITY(1,1) NOT NULL,
        TenantId UNIQUEIDENTIFIER NOT NULL,
        BranchId UNIQUEIDENTIFIER NOT NULL,
        TypeCode NVARCHAR(50) NOT NULL,
        Title NVARCHAR(180) NOT NULL,
        Message NVARCHAR(500) NOT NULL,
        TargetUrl NVARCHAR(500) NOT NULL,
        IsRead BIT NOT NULL CONSTRAINT DF_AdminNotifications_IsRead DEFAULT (0),
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_AdminNotifications_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
        ReadAtUtc DATETIME2(3) NULL,
        RowVersion ROWVERSION NOT NULL,
        CONSTRAINT FK_AdminNotifications_Tenants FOREIGN KEY (TenantId) REFERENCES dbo.Tenants (TenantId),
        CONSTRAINT FK_AdminNotifications_Branches FOREIGN KEY (BranchId) REFERENCES dbo.Branches (BranchId)
    );
END;
GO

IF NOT EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_AdminNotifications_TenantId_BranchId_IsRead_CreatedAtUtc'
      AND object_id = OBJECT_ID(N'dbo.AdminNotifications')
)
BEGIN
    CREATE INDEX IX_AdminNotifications_TenantId_BranchId_IsRead_CreatedAtUtc
    ON dbo.AdminNotifications (TenantId, BranchId, IsRead, CreatedAtUtc DESC)
    INCLUDE (TypeCode, Title, Message, TargetUrl, ReadAtUtc);
END;
GO

CREATE OR ALTER PROCEDURE dbo.AdminNotification_Create
    @TenantId UNIQUEIDENTIFIER,
    @AdminNotificationId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER,
    @TypeCode NVARCHAR(50),
    @Title NVARCHAR(180),
    @Message NVARCHAR(500),
    @TargetUrl NVARCHAR(500)
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Branches WHERE TenantId = @TenantId AND BranchId = @BranchId)
    BEGIN
        THROW 52101, 'Branch was not found for this tenant.', 1;
    END;

    INSERT INTO dbo.AdminNotifications
    (
        AdminNotificationId, TenantId, BranchId, TypeCode, Title, Message, TargetUrl
    )
    VALUES
    (
        @AdminNotificationId, @TenantId, @BranchId, @TypeCode, @Title, @Message, @TargetUrl
    );

    SELECT TOP (1)
        AdminNotificationId,
        TenantId,
        BranchId,
        TypeCode,
        Title,
        Message,
        TargetUrl,
        IsRead,
        CreatedAtUtc,
        ReadAtUtc
    FROM dbo.AdminNotifications
    WHERE TenantId = @TenantId
      AND AdminNotificationId = @AdminNotificationId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.AdminNotification_GetList
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP (30)
        AdminNotificationId,
        TenantId,
        BranchId,
        TypeCode,
        Title,
        Message,
        TargetUrl,
        IsRead,
        CreatedAtUtc,
        ReadAtUtc
    FROM dbo.AdminNotifications
    WHERE TenantId = @TenantId
      AND (@BranchId IS NULL OR BranchId = @BranchId)
    ORDER BY CreatedAtUtc DESC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.AdminNotification_MarkRead
    @TenantId UNIQUEIDENTIFIER,
    @AdminNotificationId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.AdminNotifications
    SET IsRead = 1,
        ReadAtUtc = COALESCE(ReadAtUtc, SYSUTCDATETIME())
    WHERE TenantId = @TenantId
      AND AdminNotificationId = @AdminNotificationId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.AdminNotification_MarkAllRead
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.AdminNotifications
    SET IsRead = 1,
        ReadAtUtc = COALESCE(ReadAtUtc, SYSUTCDATETIME())
    WHERE TenantId = @TenantId
      AND (@BranchId IS NULL OR BranchId = @BranchId)
      AND IsRead = 0;
END;
GO

CREATE OR ALTER PROCEDURE dbo.AdminSearch
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER = NULL,
    @Query NVARCHAR(120)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Search NVARCHAR(124) = N'%' + @Query + N'%';

    SELECT TOP (20)
        TypeCode,
        EntityId,
        BranchId,
        Title,
        Subtitle,
        TargetUrl,
        CreatedAtUtc
    FROM
    (
        SELECT
            N'branch' AS TypeCode,
            b.BranchId AS EntityId,
            b.BranchId,
            b.Name AS Title,
            CONCAT(COALESCE(NULLIF(b.City, N''), N'Branch'), CASE WHEN b.IsActive = 1 THEN N' - Active' ELSE N' - Inactive' END) AS Subtitle,
            CONCAT(N'/admin/branches/', CONVERT(NVARCHAR(36), b.BranchId)) AS TargetUrl,
            b.CreatedAtUtc
        FROM dbo.Branches b
        WHERE b.TenantId = @TenantId
          AND (@BranchId IS NULL OR b.BranchId = @BranchId)
          AND (b.Name LIKE @Search OR b.City LIKE @Search OR b.PhoneNumber LIKE @Search)

        UNION ALL

        SELECT
            N'menu-item' AS TypeCode,
            mi.MenuItemId AS EntityId,
            mi.BranchId,
            mi.Name AS Title,
            CONCAT(mc.Name, N' - ', FORMAT(mi.Price, 'N2')) AS Subtitle,
            N'/admin/menu' AS TargetUrl,
            mi.CreatedAtUtc
        FROM dbo.MenuItems mi
        INNER JOIN dbo.MenuCategories mc ON mc.MenuCategoryId = mi.MenuCategoryId
        WHERE mi.TenantId = @TenantId
          AND mi.IsActive = 1
          AND (@BranchId IS NULL OR mi.BranchId = @BranchId)
          AND (mi.Name LIKE @Search OR mi.Description LIKE @Search OR mc.Name LIKE @Search)

        UNION ALL

        SELECT
            N'order' AS TypeCode,
            o.OrderId AS EntityId,
            o.BranchId,
            CONCAT(N'Order ', RIGHT(CONVERT(NVARCHAR(36), o.OrderId), 6)) AS Title,
            CONCAT(bt.Name, N' - ', o.OrderStatusCode, N' - ', FORMAT(o.TotalAmount, 'N2')) AS Subtitle,
            N'/admin/orders' AS TargetUrl,
            o.CreatedAtUtc
        FROM dbo.Orders o
        INNER JOIN dbo.BranchTables bt ON bt.TableId = o.TableId
        WHERE o.TenantId = @TenantId
          AND (@BranchId IS NULL OR o.BranchId = @BranchId)
          AND
          (
              CONVERT(NVARCHAR(36), o.OrderId) LIKE @Search
              OR RIGHT(CONVERT(NVARCHAR(36), o.OrderId), 6) LIKE @Search
              OR o.CustomerName LIKE @Search
              OR o.CustomerWhatsApp LIKE @Search
              OR bt.Name LIKE @Search
          )

        UNION ALL

        SELECT
            N'offer' AS TypeCode,
            bo.BranchOfferId AS EntityId,
            bo.BranchId,
            bo.Title,
            COALESCE(bo.DiscountText, bo.Subtitle, N'Offer') AS Subtitle,
            N'/admin/offers' AS TargetUrl,
            bo.CreatedAtUtc
        FROM dbo.BranchOffers bo
        WHERE bo.TenantId = @TenantId
          AND bo.IsActive = 1
          AND (@BranchId IS NULL OR bo.BranchId = @BranchId)
          AND (bo.Title LIKE @Search OR bo.Subtitle LIKE @Search OR bo.DiscountText LIKE @Search)
    ) AS Results
    ORDER BY CreatedAtUtc DESC, Title ASC;
END;
GO
