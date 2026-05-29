/*
    Demo smoke-test data for local development.

    Login:
      Email: owner.demo@example.com
      Password: TestPass123!

    Public QR token:
      demo-table-1

    This script is idempotent. It upserts the demo tenant, owner, branch,
    order settings, menu categories, menu items, and one active table.
*/

SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE
    @TenantId UNIQUEIDENTIFIER = '77B76EB7-126E-4827-8EBE-0A3672AE43FB',
    @UserId UNIQUEIDENTIFIER = '949A3558-2C67-4348-9E99-8B13D1305090',
    @TenantUserId UNIQUEIDENTIFIER = '102F1A11-7FA7-48D5-9044-0C55DFE89F00',
    @BranchId UNIQUEIDENTIFIER = 'ADACC9ED-306E-4B74-AE46-76AC101825A5',
    @BranchOrderSettingsId UNIQUEIDENTIFIER = '7A8D3B40-2E1C-4A07-B5AA-89CE4F7860A1',
    @BeveragesCategoryId UNIQUEIDENTIFIER = '63C0D0D5-8A6D-43A0-B885-2DD1F5F41D01',
    @SnacksCategoryId UNIQUEIDENTIFIER = '77A40C02-25D3-4AA4-9FC1-FC31A95A0C10',
    @MasalaTeaItemId UNIQUEIDENTIFIER = '01F62455-D7D6-49AC-8CF3-5D7F89D2F001',
    @ColdCoffeeItemId UNIQUEIDENTIFIER = '7FD22F66-4B08-4EDB-A80A-88C9644E1002',
    @VegSandwichItemId UNIQUEIDENTIFIER = 'ED30556E-22B2-4972-BB6A-82E29C8D1003',
    @FriesItemId UNIQUEIDENTIFIER = 'FC105F68-B90B-4C12-8A91-31B0C9E21004',
    @TableId UNIQUEIDENTIFIER = '6385978E-BEE2-4280-BF2B-375C3B550101',
    @PasswordHash NVARCHAR(512) = N'PBKDF2-SHA256.210000.UVJBcHBEZW1vU2FsdDAwMQ==.d2BvhGl2wHubuRwQmrc3Ho9z2FpKJ6m8yFuJa4b6E0Y=';

SELECT TOP (1) @TenantId = TenantId
FROM dbo.Tenants
WHERE Slug = N'demo-cafe'
   OR OwnerEmail = N'owner.demo@example.com'
ORDER BY CreatedAtUtc ASC;

SELECT TOP (1) @UserId = UserId
FROM dbo.Users
WHERE Email = N'owner.demo@example.com'
ORDER BY CreatedAtUtc ASC;

SELECT TOP (1) @TenantUserId = TenantUserId
FROM dbo.TenantUsers
WHERE TenantId = @TenantId
  AND UserId = @UserId
ORDER BY CreatedAtUtc ASC;

SELECT TOP (1) @BranchId = BranchId
FROM dbo.Branches
WHERE TenantId = @TenantId
  AND Name = N'Main Branch'
ORDER BY CreatedAtUtc ASC;

SELECT TOP (1) @BranchOrderSettingsId = BranchOrderSettingsId
FROM dbo.BranchOrderSettings
WHERE TenantId = @TenantId
  AND BranchId = @BranchId
ORDER BY CreatedAtUtc ASC;

SELECT TOP (1) @BeveragesCategoryId = MenuCategoryId
FROM dbo.MenuCategories
WHERE TenantId = @TenantId
  AND BranchId = @BranchId
  AND Name = N'Beverages'
ORDER BY CreatedAtUtc ASC;

SELECT TOP (1) @SnacksCategoryId = MenuCategoryId
FROM dbo.MenuCategories
WHERE TenantId = @TenantId
  AND BranchId = @BranchId
  AND Name = N'Snacks'
ORDER BY CreatedAtUtc ASC;

SELECT TOP (1) @MasalaTeaItemId = MenuItemId
FROM dbo.MenuItems
WHERE TenantId = @TenantId
  AND BranchId = @BranchId
  AND Name = N'Masala Tea'
ORDER BY CreatedAtUtc ASC;

SELECT TOP (1) @ColdCoffeeItemId = MenuItemId
FROM dbo.MenuItems
WHERE TenantId = @TenantId
  AND BranchId = @BranchId
  AND Name = N'Cold Coffee'
ORDER BY CreatedAtUtc ASC;

SELECT TOP (1) @VegSandwichItemId = MenuItemId
FROM dbo.MenuItems
WHERE TenantId = @TenantId
  AND BranchId = @BranchId
  AND Name = N'Veg Sandwich'
ORDER BY CreatedAtUtc ASC;

SELECT TOP (1) @FriesItemId = MenuItemId
FROM dbo.MenuItems
WHERE TenantId = @TenantId
  AND BranchId = @BranchId
  AND Name = N'Masala Fries'
ORDER BY CreatedAtUtc ASC;

SELECT TOP (1) @TableId = TableId
FROM dbo.BranchTables
WHERE TenantId = @TenantId
  AND BranchId = @BranchId
  AND (Name = N'Table 1' OR QrToken = N'demo-table-1')
ORDER BY CreatedAtUtc ASC;

BEGIN TRANSACTION;

IF EXISTS (SELECT 1 FROM dbo.Tenants WHERE TenantId = @TenantId)
BEGIN
    UPDATE dbo.Tenants
    SET
        Name = N'Demo Cafe',
        Slug = N'demo-cafe',
        OwnerEmail = N'owner.demo@example.com',
        IsActive = 1,
        UpdatedAtUtc = SYSUTCDATETIME()
    WHERE TenantId = @TenantId;
END;
ELSE
BEGIN
    INSERT INTO dbo.Tenants (TenantId, Name, Slug, OwnerEmail, IsActive)
    VALUES (@TenantId, N'Demo Cafe', N'demo-cafe', N'owner.demo@example.com', 1);
END;

IF EXISTS (SELECT 1 FROM dbo.Users WHERE UserId = @UserId)
BEGIN
    UPDATE dbo.Users
    SET
        Email = N'owner.demo@example.com',
        DisplayName = N'Demo Owner',
        PasswordHash = @PasswordHash,
        IsActive = 1,
        UpdatedAtUtc = SYSUTCDATETIME()
    WHERE UserId = @UserId;
END;
ELSE
BEGIN
    INSERT INTO dbo.Users (UserId, Email, DisplayName, PasswordHash, IsActive)
    VALUES (@UserId, N'owner.demo@example.com', N'Demo Owner', @PasswordHash, 1);
END;

IF EXISTS (SELECT 1 FROM dbo.TenantUsers WHERE TenantId = @TenantId AND UserId = @UserId)
BEGIN
    UPDATE dbo.TenantUsers
    SET
        RoleCode = N'owner',
        IsActive = 1,
        UpdatedAtUtc = SYSUTCDATETIME()
    WHERE TenantId = @TenantId
      AND UserId = @UserId;
END;
ELSE
BEGIN
    INSERT INTO dbo.TenantUsers (TenantUserId, TenantId, UserId, RoleCode, IsActive)
    VALUES (@TenantUserId, @TenantId, @UserId, N'owner', 1);
END;

IF EXISTS (SELECT 1 FROM dbo.Branches WHERE TenantId = @TenantId AND BranchId = @BranchId)
BEGIN
    UPDATE dbo.Branches
    SET
        Name = N'Main Branch',
        PhoneNumber = N'+91 9876543210',
        AddressLine1 = N'MG Road',
        AddressLine2 = NULL,
        City = N'Ahmedabad',
        State = N'Gujarat',
        PostalCode = N'380001',
        CountryCode = 'IN',
        IsActive = 1,
        UpdatedAtUtc = SYSUTCDATETIME()
    WHERE TenantId = @TenantId
      AND BranchId = @BranchId;
END;
ELSE
BEGIN
    INSERT INTO dbo.Branches
    (
        BranchId,
        TenantId,
        Name,
        PhoneNumber,
        AddressLine1,
        AddressLine2,
        City,
        State,
        PostalCode,
        CountryCode,
        IsActive
    )
    VALUES
    (
        @BranchId,
        @TenantId,
        N'Main Branch',
        N'+91 9876543210',
        N'MG Road',
        NULL,
        N'Ahmedabad',
        N'Gujarat',
        N'380001',
        'IN',
        1
    );
END;

IF EXISTS (SELECT 1 FROM dbo.BranchOrderSettings WHERE TenantId = @TenantId AND BranchId = @BranchId)
BEGIN
    UPDATE dbo.BranchOrderSettings
    SET
        EnableDirectQrOrdering = 1,
        RequireCustomerName = 1,
        RequireCustomerWhatsApp = 0,
        WaiterCallEnabled = 1,
        UpdatedAtUtc = SYSUTCDATETIME()
    WHERE TenantId = @TenantId
      AND BranchId = @BranchId;
END;
ELSE
BEGIN
    INSERT INTO dbo.BranchOrderSettings
    (
        BranchOrderSettingsId,
        TenantId,
        BranchId,
        EnableDirectQrOrdering,
        RequireCustomerName,
        RequireCustomerWhatsApp,
        WaiterCallEnabled
    )
    VALUES (@BranchOrderSettingsId, @TenantId, @BranchId, 1, 1, 0, 1);
END;

IF EXISTS (SELECT 1 FROM dbo.MenuCategories WHERE TenantId = @TenantId AND BranchId = @BranchId AND MenuCategoryId = @BeveragesCategoryId)
BEGIN
    UPDATE dbo.MenuCategories
    SET Name = N'Beverages', DisplayOrder = 1, IsActive = 1, UpdatedAtUtc = SYSUTCDATETIME()
    WHERE MenuCategoryId = @BeveragesCategoryId;
END;
ELSE
BEGIN
    INSERT INTO dbo.MenuCategories (MenuCategoryId, TenantId, BranchId, Name, DisplayOrder, IsActive)
    VALUES (@BeveragesCategoryId, @TenantId, @BranchId, N'Beverages', 1, 1);
END;

IF EXISTS (SELECT 1 FROM dbo.MenuCategories WHERE TenantId = @TenantId AND BranchId = @BranchId AND MenuCategoryId = @SnacksCategoryId)
BEGIN
    UPDATE dbo.MenuCategories
    SET Name = N'Snacks', DisplayOrder = 2, IsActive = 1, UpdatedAtUtc = SYSUTCDATETIME()
    WHERE MenuCategoryId = @SnacksCategoryId;
END;
ELSE
BEGIN
    INSERT INTO dbo.MenuCategories (MenuCategoryId, TenantId, BranchId, Name, DisplayOrder, IsActive)
    VALUES (@SnacksCategoryId, @TenantId, @BranchId, N'Snacks', 2, 1);
END;

IF EXISTS (SELECT 1 FROM dbo.MenuItems WHERE TenantId = @TenantId AND BranchId = @BranchId AND MenuItemId = @MasalaTeaItemId)
BEGIN
    UPDATE dbo.MenuItems
    SET MenuCategoryId = @BeveragesCategoryId, Name = N'Masala Tea', Description = N'Fresh milk tea with house spices.', Price = 25.00, IsAvailable = 1, IsActive = 1, DisplayOrder = 1, UpdatedAtUtc = SYSUTCDATETIME()
    WHERE MenuItemId = @MasalaTeaItemId;
END;
ELSE
BEGIN
    INSERT INTO dbo.MenuItems (MenuItemId, TenantId, BranchId, MenuCategoryId, Name, Description, Price, IsAvailable, IsActive, DisplayOrder)
    VALUES (@MasalaTeaItemId, @TenantId, @BranchId, @BeveragesCategoryId, N'Masala Tea', N'Fresh milk tea with house spices.', 25.00, 1, 1, 1);
END;

IF EXISTS (SELECT 1 FROM dbo.MenuItems WHERE TenantId = @TenantId AND BranchId = @BranchId AND MenuItemId = @ColdCoffeeItemId)
BEGIN
    UPDATE dbo.MenuItems
    SET MenuCategoryId = @BeveragesCategoryId, Name = N'Cold Coffee', Description = N'Chilled coffee blended with milk and ice.', Price = 90.00, IsAvailable = 1, IsActive = 1, DisplayOrder = 2, UpdatedAtUtc = SYSUTCDATETIME()
    WHERE MenuItemId = @ColdCoffeeItemId;
END;
ELSE
BEGIN
    INSERT INTO dbo.MenuItems (MenuItemId, TenantId, BranchId, MenuCategoryId, Name, Description, Price, IsAvailable, IsActive, DisplayOrder)
    VALUES (@ColdCoffeeItemId, @TenantId, @BranchId, @BeveragesCategoryId, N'Cold Coffee', N'Chilled coffee blended with milk and ice.', 90.00, 1, 1, 2);
END;

IF EXISTS (SELECT 1 FROM dbo.MenuItems WHERE TenantId = @TenantId AND BranchId = @BranchId AND MenuItemId = @VegSandwichItemId)
BEGIN
    UPDATE dbo.MenuItems
    SET MenuCategoryId = @SnacksCategoryId, Name = N'Veg Sandwich', Description = N'Grilled sandwich with vegetables and chutney.', Price = 120.00, IsAvailable = 1, IsActive = 1, DisplayOrder = 1, UpdatedAtUtc = SYSUTCDATETIME()
    WHERE MenuItemId = @VegSandwichItemId;
END;
ELSE
BEGIN
    INSERT INTO dbo.MenuItems (MenuItemId, TenantId, BranchId, MenuCategoryId, Name, Description, Price, IsAvailable, IsActive, DisplayOrder)
    VALUES (@VegSandwichItemId, @TenantId, @BranchId, @SnacksCategoryId, N'Veg Sandwich', N'Grilled sandwich with vegetables and chutney.', 120.00, 1, 1, 1);
END;

IF EXISTS (SELECT 1 FROM dbo.MenuItems WHERE TenantId = @TenantId AND BranchId = @BranchId AND MenuItemId = @FriesItemId)
BEGIN
    UPDATE dbo.MenuItems
    SET MenuCategoryId = @SnacksCategoryId, Name = N'Masala Fries', Description = N'Crispy fries tossed with house masala.', Price = 110.00, IsAvailable = 1, IsActive = 1, DisplayOrder = 2, UpdatedAtUtc = SYSUTCDATETIME()
    WHERE MenuItemId = @FriesItemId;
END;
ELSE
BEGIN
    INSERT INTO dbo.MenuItems (MenuItemId, TenantId, BranchId, MenuCategoryId, Name, Description, Price, IsAvailable, IsActive, DisplayOrder)
    VALUES (@FriesItemId, @TenantId, @BranchId, @SnacksCategoryId, N'Masala Fries', N'Crispy fries tossed with house masala.', 110.00, 1, 1, 2);
END;

IF EXISTS (SELECT 1 FROM dbo.BranchTables WHERE TenantId = @TenantId AND BranchId = @BranchId AND TableId = @TableId)
BEGIN
    UPDATE dbo.BranchTables
    SET
        Name = N'Table 1',
        DisplayOrder = 1,
        QrToken = N'demo-table-1',
        IsActive = 1,
        UpdatedAtUtc = SYSUTCDATETIME()
    WHERE TableId = @TableId;
END;
ELSE
BEGIN
    INSERT INTO dbo.BranchTables (TableId, TenantId, BranchId, Name, DisplayOrder, QrToken, IsActive)
    VALUES (@TableId, @TenantId, @BranchId, N'Table 1', 1, N'demo-table-1', 1);
END;

COMMIT TRANSACTION;

SELECT
    t.TenantId,
    t.Slug,
    u.Email AS OwnerEmail,
    b.BranchId,
    bt.TableId,
    bt.QrToken
FROM dbo.Tenants t
INNER JOIN dbo.Users u ON u.Email = t.OwnerEmail
INNER JOIN dbo.Branches b ON b.TenantId = t.TenantId
INNER JOIN dbo.BranchTables bt ON bt.TenantId = b.TenantId AND bt.BranchId = b.BranchId
WHERE t.TenantId = @TenantId
  AND b.BranchId = @BranchId
  AND bt.TableId = @TableId;
