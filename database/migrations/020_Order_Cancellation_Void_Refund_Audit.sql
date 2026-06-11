IF COL_LENGTH(N'dbo.OrderBills', N'RefundStatusCode') IS NULL
BEGIN
    ALTER TABLE dbo.OrderBills ADD RefundStatusCode NVARCHAR(32) NOT NULL CONSTRAINT DF_OrderBills_RefundStatusCode DEFAULT (N'NotRefunded');
END;
GO

IF COL_LENGTH(N'dbo.OrderBills', N'RefundAmount') IS NULL
BEGIN
    ALTER TABLE dbo.OrderBills ADD RefundAmount DECIMAL(10,2) NOT NULL CONSTRAINT DF_OrderBills_RefundAmount DEFAULT (0);
END;
GO

IF COL_LENGTH(N'dbo.OrderBills', N'RefundReason') IS NULL
BEGIN
    ALTER TABLE dbo.OrderBills ADD RefundReason NVARCHAR(300) NULL;
END;
GO

IF COL_LENGTH(N'dbo.OrderBills', N'RefundedAtUtc') IS NULL
BEGIN
    ALTER TABLE dbo.OrderBills ADD RefundedAtUtc DATETIME2(3) NULL;
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_OrderBills_RefundStatusCode')
BEGIN
    ALTER TABLE dbo.OrderBills ADD CONSTRAINT CK_OrderBills_RefundStatusCode CHECK (RefundStatusCode IN (N'NotRefunded', N'PartiallyRefunded', N'Refunded'));
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_OrderBills_RefundAmount')
BEGIN
    ALTER TABLE dbo.OrderBills ADD CONSTRAINT CK_OrderBills_RefundAmount CHECK (RefundAmount >= 0 AND RefundAmount <= TotalAmount);
END;
GO

CREATE OR ALTER PROCEDURE dbo.AdminOrder_UpdateStatus
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER,
    @OrderId UNIQUEIDENTIFIER,
    @OrderStatusCode NVARCHAR(32),
    @Reason NVARCHAR(300) = NULL,
    @ChangedByUserId UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @OrderStatusCode NOT IN (N'Placed', N'Accepted', N'Preparing', N'Ready', N'Served', N'Completed', N'Cancelled')
    BEGIN
        THROW 51707, 'Order status is invalid.', 1;
    END;

    DECLARE @OldStatusCode NVARCHAR(32);
    DECLARE @CleanReason NVARCHAR(300) = NULLIF(LTRIM(RTRIM(@Reason)), N'');

    BEGIN TRANSACTION;

    SELECT @OldStatusCode = OrderStatusCode
    FROM dbo.Orders WITH (UPDLOCK, HOLDLOCK)
    WHERE TenantId = @TenantId
      AND BranchId = @BranchId
      AND OrderId = @OrderId;

    IF @OldStatusCode IS NULL
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 51708, 'Order was not found for this tenant and branch.', 1;
    END;

    IF @OldStatusCode IN (N'Completed', N'Cancelled') AND @OldStatusCode <> @OrderStatusCode
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 51711, 'Completed or cancelled orders cannot be moved to another status.', 1;
    END;

    IF @OrderStatusCode = N'Cancelled' AND @CleanReason IS NULL
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 51712, 'Cancellation reason is required.', 1;
    END;

    IF @OldStatusCode = @OrderStatusCode
    BEGIN
        COMMIT TRANSACTION;

        SELECT
            o.OrderId,
            o.TenantId,
            o.BranchId,
            o.TableId,
            bt.Name AS TableName,
            o.OrderStatusCode,
            o.CustomerName,
            o.CustomerWhatsApp,
            o.Notes,
            o.SubtotalAmount,
            o.TotalAmount,
            o.CreatedAtUtc,
            o.UpdatedAtUtc
        FROM dbo.Orders o
        INNER JOIN dbo.BranchTables bt ON bt.TenantId = o.TenantId AND bt.BranchId = o.BranchId AND bt.TableId = o.TableId
        WHERE o.TenantId = @TenantId
          AND o.BranchId = @BranchId
          AND o.OrderId = @OrderId;

        SELECT OrderItemId, OrderId, MenuItemId, MenuItemVariantId, MenuItemName, VariantName, ItemNote, UnitPrice, Quantity, LineTotal
        FROM dbo.OrderItems
        WHERE TenantId = @TenantId
          AND BranchId = @BranchId
          AND OrderId = @OrderId
        ORDER BY CreatedAtUtc ASC, MenuItemName ASC, VariantName ASC;

        RETURN;
    END;

    UPDATE dbo.Orders
    SET OrderStatusCode = @OrderStatusCode,
        UpdatedAtUtc = SYSUTCDATETIME()
    WHERE TenantId = @TenantId
      AND BranchId = @BranchId
      AND OrderId = @OrderId;

    INSERT INTO dbo.OrderStatusHistory (OrderStatusHistoryId, TenantId, BranchId, OrderId, OldStatusCode, NewStatusCode, Reason, ChangedByUserId)
    VALUES (NEWID(), @TenantId, @BranchId, @OrderId, @OldStatusCode, @OrderStatusCode, @CleanReason, @ChangedByUserId);

    IF @OrderStatusCode = N'Cancelled'
    BEGIN
        DECLARE @CancelledBillId UNIQUEIDENTIFIER;
        DECLARE @CancelledBillOldStatus NVARCHAR(32);

        SELECT
            @CancelledBillId = OrderBillId,
            @CancelledBillOldStatus = PaymentStatusCode
        FROM dbo.OrderBills WITH (UPDLOCK, HOLDLOCK)
        WHERE TenantId = @TenantId
          AND BranchId = @BranchId
          AND OrderId = @OrderId
          AND PaymentStatusCode IN (N'Unpaid', N'PartiallyPaid');

        IF @CancelledBillId IS NOT NULL
        BEGIN
            UPDATE dbo.OrderBills
            SET PaymentStatusCode = N'Voided',
                PaymentMethod = NULL,
                UpdatedAtUtc = SYSUTCDATETIME()
            WHERE OrderBillId = @CancelledBillId;

            INSERT INTO dbo.OrderBillAuditEntries
            (
                OrderBillAuditEntryId, TenantId, BranchId, OrderBillId, OrderId, ChangedByUserId,
                ChangeTypeCode, OldValue, NewValue, Reason
            )
            VALUES
            (
                NEWID(), @TenantId, @BranchId, @CancelledBillId, @OrderId, @ChangedByUserId,
                N'BillVoidedByOrderCancellation',
                @CancelledBillOldStatus,
                N'Voided',
                @CleanReason
            );
        END;
    END;

    COMMIT TRANSACTION;

    SELECT
        o.OrderId,
        o.TenantId,
        o.BranchId,
        o.TableId,
        bt.Name AS TableName,
        o.OrderStatusCode,
        o.CustomerName,
        o.CustomerWhatsApp,
        o.Notes,
        o.SubtotalAmount,
        o.TotalAmount,
        o.CreatedAtUtc,
        o.UpdatedAtUtc
    FROM dbo.Orders o
    INNER JOIN dbo.BranchTables bt ON bt.TenantId = o.TenantId AND bt.BranchId = o.BranchId AND bt.TableId = o.TableId
    WHERE o.TenantId = @TenantId
      AND o.BranchId = @BranchId
      AND o.OrderId = @OrderId;

    SELECT OrderItemId, OrderId, MenuItemId, MenuItemVariantId, MenuItemName, VariantName, ItemNote, UnitPrice, Quantity, LineTotal
    FROM dbo.OrderItems
    WHERE TenantId = @TenantId
      AND BranchId = @BranchId
      AND OrderId = @OrderId
    ORDER BY CreatedAtUtc ASC, MenuItemName ASC, VariantName ASC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.OrderBill_GetByOrder
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER,
    @OrderId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT OrderBillId, TenantId, BranchId, OrderId, BillNumber, PaymentStatusCode, PaymentMethod,
           SubtotalAmount, DiscountAmount, TaxableAmount, TaxAmount, ServiceChargeAmount, RoundingAmount, TotalAmount,
           TaxEnabled, TaxName, TaxRate, TaxMode, ServiceChargeEnabled, ServiceChargeName, ServiceChargeRate,
           DiscountEnabled, RefundStatusCode, RefundAmount, RefundReason, RefundedAtUtc, CreatedAtUtc, UpdatedAtUtc
    FROM dbo.OrderBills
    WHERE TenantId = @TenantId AND BranchId = @BranchId AND OrderId = @OrderId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.OrderBill_UpdatePaymentStatus
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER,
    @OrderId UNIQUEIDENTIFIER,
    @PaymentStatusCode NVARCHAR(32),
    @PaymentMethod NVARCHAR(80) = NULL,
    @Reason NVARCHAR(300) = NULL,
    @ChangedByUserId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @PaymentStatusCode NOT IN (N'Unpaid', N'Paid', N'PartiallyPaid', N'Voided')
    BEGIN
        THROW 51000, 'Payment status is invalid.', 1;
    END;

    DECLARE @OrderBillId UNIQUEIDENTIFIER;
    DECLARE @OldStatus NVARCHAR(200);
    DECLARE @CleanReason NVARCHAR(300) = NULLIF(LTRIM(RTRIM(@Reason)), N'');

    BEGIN TRANSACTION;

    SELECT @OrderBillId = OrderBillId, @OldStatus = PaymentStatusCode
    FROM dbo.OrderBills WITH (UPDLOCK, HOLDLOCK)
    WHERE TenantId = @TenantId AND BranchId = @BranchId AND OrderId = @OrderId;

    IF @OrderBillId IS NULL
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 51000, 'Bill was not found for this order.', 1;
    END;

    IF @PaymentStatusCode = N'Voided' AND @CleanReason IS NULL
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 51000, 'Void reason is required.', 1;
    END;

    UPDATE dbo.OrderBills
    SET PaymentStatusCode = @PaymentStatusCode,
        PaymentMethod = CASE WHEN @PaymentStatusCode IN (N'Paid', N'PartiallyPaid') THEN NULLIF(LTRIM(RTRIM(@PaymentMethod)), N'') ELSE NULL END,
        UpdatedAtUtc = SYSUTCDATETIME()
    WHERE OrderBillId = @OrderBillId;

    INSERT INTO dbo.OrderBillAuditEntries
    (
        OrderBillAuditEntryId, TenantId, BranchId, OrderBillId, OrderId, ChangedByUserId,
        ChangeTypeCode, OldValue, NewValue, Reason
    )
    VALUES
    (
        NEWID(), @TenantId, @BranchId, @OrderBillId, @OrderId, @ChangedByUserId,
        CASE WHEN @PaymentStatusCode = N'Voided' THEN N'BillVoided' ELSE N'PaymentStatusUpdated' END,
        @OldStatus,
        @PaymentStatusCode,
        @CleanReason
    );

    COMMIT TRANSACTION;

    EXEC dbo.OrderBill_GetByOrder @TenantId = @TenantId, @BranchId = @BranchId, @OrderId = @OrderId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.OrderBill_UpdateRefundStatus
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER,
    @OrderId UNIQUEIDENTIFIER,
    @RefundStatusCode NVARCHAR(32),
    @RefundAmount DECIMAL(10,2),
    @Reason NVARCHAR(300),
    @ChangedByUserId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @RefundStatusCode NOT IN (N'NotRefunded', N'PartiallyRefunded', N'Refunded')
    BEGIN
        THROW 51000, 'Refund status is invalid.', 1;
    END;

    DECLARE @OrderBillId UNIQUEIDENTIFIER;
    DECLARE @TotalAmount DECIMAL(10,2);
    DECLARE @OldValue NVARCHAR(200);
    DECLARE @CleanReason NVARCHAR(300) = NULLIF(LTRIM(RTRIM(@Reason)), N'');

    BEGIN TRANSACTION;

    SELECT
        @OrderBillId = OrderBillId,
        @TotalAmount = TotalAmount,
        @OldValue = CONCAT(RefundStatusCode, N' ', CONVERT(NVARCHAR(40), RefundAmount))
    FROM dbo.OrderBills WITH (UPDLOCK, HOLDLOCK)
    WHERE TenantId = @TenantId AND BranchId = @BranchId AND OrderId = @OrderId;

    IF @OrderBillId IS NULL
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 51000, 'Bill was not found for this order.', 1;
    END;

    IF @CleanReason IS NULL AND @RefundStatusCode <> N'NotRefunded'
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 51000, 'Refund reason is required.', 1;
    END;

    IF @RefundAmount < 0 OR @RefundAmount > @TotalAmount
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 51000, 'Refund amount must be between zero and bill total.', 1;
    END;

    IF @RefundStatusCode = N'NotRefunded' AND @RefundAmount <> 0
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 51000, 'Refund amount must be zero when refund status is not refunded.', 1;
    END;

    IF @RefundStatusCode = N'PartiallyRefunded' AND (@RefundAmount <= 0 OR @RefundAmount >= @TotalAmount)
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 51000, 'Partial refund amount must be greater than zero and less than bill total.', 1;
    END;

    IF @RefundStatusCode = N'Refunded' AND @RefundAmount <> @TotalAmount
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 51000, 'Full refund amount must equal bill total.', 1;
    END;

    UPDATE dbo.OrderBills
    SET RefundStatusCode = @RefundStatusCode,
        RefundAmount = @RefundAmount,
        RefundReason = CASE WHEN @RefundStatusCode = N'NotRefunded' THEN NULL ELSE @CleanReason END,
        RefundedAtUtc = CASE WHEN @RefundStatusCode = N'NotRefunded' THEN NULL ELSE SYSUTCDATETIME() END,
        UpdatedAtUtc = SYSUTCDATETIME()
    WHERE OrderBillId = @OrderBillId;

    INSERT INTO dbo.OrderBillAuditEntries
    (
        OrderBillAuditEntryId, TenantId, BranchId, OrderBillId, OrderId, ChangedByUserId,
        ChangeTypeCode, OldValue, NewValue, Reason
    )
    VALUES
    (
        NEWID(), @TenantId, @BranchId, @OrderBillId, @OrderId, @ChangedByUserId,
        N'RefundStatusUpdated',
        @OldValue,
        CONCAT(@RefundStatusCode, N' ', CONVERT(NVARCHAR(40), @RefundAmount)),
        @CleanReason
    );

    COMMIT TRANSACTION;

    EXEC dbo.OrderBill_GetByOrder @TenantId = @TenantId, @BranchId = @BranchId, @OrderId = @OrderId;
END;
GO
