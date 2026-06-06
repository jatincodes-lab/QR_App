CREATE OR ALTER PROCEDURE dbo.Report_Customers
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER = NULL,
    @DateFrom DATETIME2(3) = NULL,
    @DateTo DATETIME2(3) = NULL,
    @StatusCode NVARCHAR(32) = NULL,
    @Search NVARCHAR(120) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @CleanStatusCode NVARCHAR(32) = NULLIF(LTRIM(RTRIM(@StatusCode)), N'');
    DECLARE @CleanSearch NVARCHAR(120) = NULLIF(LTRIM(RTRIM(@Search)), N'');

    ;WITH FilteredOrders AS
    (
        SELECT
            o.OrderId,
            o.CustomerId,
            o.BranchId,
            o.CustomerName,
            o.CustomerWhatsApp,
            o.OrderStatusCode,
            o.TotalAmount,
            o.CreatedAtUtc
        FROM dbo.Orders o
        WHERE o.TenantId = @TenantId
          AND o.CustomerId IS NOT NULL
          AND (@BranchId IS NULL OR o.BranchId = @BranchId)
          AND (@DateFrom IS NULL OR o.CreatedAtUtc >= @DateFrom)
          AND (@DateTo IS NULL OR o.CreatedAtUtc < DATEADD(DAY, 1, @DateTo))
          AND (@CleanStatusCode IS NULL OR o.OrderStatusCode = @CleanStatusCode)
    ),
    CustomerOrderRollup AS
    (
        SELECT
            fo.CustomerId,
            COUNT(1) AS OrderCount,
            SUM(CASE WHEN fo.OrderStatusCode <> N'Cancelled' THEN fo.TotalAmount ELSE 0 END) AS TotalValue,
            MAX(fo.CreatedAtUtc) AS LastOrderAtUtc,
            COUNT(DISTINCT fo.BranchId) AS BranchesVisited
        FROM FilteredOrders fo
        GROUP BY fo.CustomerId
    ),
    FavoriteItems AS
    (
        SELECT
            ranked.CustomerId,
            ranked.MenuItemName,
            ranked.VariantName,
            ranked.Quantity,
            ROW_NUMBER() OVER
            (
                PARTITION BY ranked.CustomerId
                ORDER BY ranked.Quantity DESC, ranked.LastOrderedAtUtc DESC, ranked.MenuItemName ASC, ranked.VariantName ASC
            ) AS RowNumber
        FROM
        (
            SELECT
                fo.CustomerId,
                oi.MenuItemName,
                oi.VariantName,
                SUM(oi.Quantity) AS Quantity,
                MAX(fo.CreatedAtUtc) AS LastOrderedAtUtc
            FROM FilteredOrders fo
            INNER JOIN dbo.OrderItems oi ON oi.TenantId = @TenantId AND oi.OrderId = fo.OrderId
            WHERE fo.OrderStatusCode <> N'Cancelled'
            GROUP BY fo.CustomerId, oi.MenuItemName, oi.VariantName
        ) ranked
    )
    SELECT TOP (250)
        c.CustomerId,
        CONVERT(NVARCHAR(36), c.CustomerId) AS CustomerKey,
        c.Name AS CustomerName,
        c.WhatsAppNumber AS CustomerWhatsApp,
        c.MarketingConsent,
        c.VisitCount,
        rollup.OrderCount,
        COALESCE(rollup.TotalValue, 0) AS TotalValue,
        c.FirstVisitAtUtc,
        c.LastVisitAtUtc,
        rollup.LastOrderAtUtc,
        rollup.BranchesVisited,
        firstBranch.Name AS FirstBranchName,
        lastBranch.Name AS LastBranchName,
        favorite.MenuItemName AS FavoriteItemName,
        favorite.VariantName AS FavoriteVariantName,
        COALESCE(favorite.Quantity, 0) AS FavoriteItemQuantity
    FROM CustomerOrderRollup rollup
    INNER JOIN dbo.Customers c ON c.TenantId = @TenantId AND c.CustomerId = rollup.CustomerId
    LEFT JOIN dbo.Branches firstBranch ON firstBranch.TenantId = c.TenantId AND firstBranch.BranchId = c.FirstBranchId
    LEFT JOIN dbo.Branches lastBranch ON lastBranch.TenantId = c.TenantId AND lastBranch.BranchId = c.LastBranchId
    LEFT JOIN FavoriteItems favorite ON favorite.CustomerId = c.CustomerId AND favorite.RowNumber = 1
    WHERE @CleanSearch IS NULL
       OR c.Name LIKE N'%' + @CleanSearch + N'%'
       OR c.WhatsAppNumber LIKE N'%' + @CleanSearch + N'%'
       OR firstBranch.Name LIKE N'%' + @CleanSearch + N'%'
       OR lastBranch.Name LIKE N'%' + @CleanSearch + N'%'
       OR favorite.MenuItemName LIKE N'%' + @CleanSearch + N'%'
       OR favorite.VariantName LIKE N'%' + @CleanSearch + N'%'
    ORDER BY rollup.LastOrderAtUtc DESC, c.LastVisitAtUtc DESC, c.CreatedAtUtc DESC;
END;
GO
