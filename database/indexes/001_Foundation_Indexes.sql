IF NOT EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_Users_Email_IsActive'
      AND object_id = OBJECT_ID(N'dbo.Users')
)
BEGIN
    CREATE INDEX IX_Users_Email_IsActive
    ON dbo.Users (Email, IsActive)
    INCLUDE (UserId, DisplayName);
END;
GO

IF NOT EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_MenuCategories_TenantId_BranchId_IsActive_DisplayOrder'
      AND object_id = OBJECT_ID(N'dbo.MenuCategories')
)
BEGIN
    CREATE INDEX IX_MenuCategories_TenantId_BranchId_IsActive_DisplayOrder
    ON dbo.MenuCategories (TenantId, BranchId, IsActive, DisplayOrder)
    INCLUDE (MenuCategoryId, Name);
END;
GO

IF NOT EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_MenuItems_TenantId_BranchId_IsActive_IsAvailable_DisplayOrder'
      AND object_id = OBJECT_ID(N'dbo.MenuItems')
)
BEGIN
    CREATE INDEX IX_MenuItems_TenantId_BranchId_IsActive_IsAvailable_DisplayOrder
    ON dbo.MenuItems (TenantId, BranchId, IsActive, IsAvailable, DisplayOrder)
    INCLUDE (MenuItemId, MenuCategoryId, Name, Price);
END;
GO

IF NOT EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_MenuItems_MenuCategoryId_IsActive_DisplayOrder'
      AND object_id = OBJECT_ID(N'dbo.MenuItems')
)
BEGIN
    CREATE INDEX IX_MenuItems_MenuCategoryId_IsActive_DisplayOrder
    ON dbo.MenuItems (MenuCategoryId, IsActive, DisplayOrder)
    INCLUDE (MenuItemId, Name, Price, IsAvailable);
END;
GO

IF NOT EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_MenuItems_BranchId_PublicMenu'
      AND object_id = OBJECT_ID(N'dbo.MenuItems')
)
BEGIN
    CREATE INDEX IX_MenuItems_BranchId_PublicMenu
    ON dbo.MenuItems (BranchId, IsActive, IsAvailable, DisplayOrder)
    INCLUDE (MenuCategoryId, Name, Description, Price);
END;
GO

IF NOT EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_TenantUsers_UserId_IsActive'
      AND object_id = OBJECT_ID(N'dbo.TenantUsers')
)
BEGIN
    CREATE INDEX IX_TenantUsers_UserId_IsActive
    ON dbo.TenantUsers (UserId, IsActive)
    INCLUDE (TenantId, RoleCode);
END;
GO

IF NOT EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_TenantUsers_TenantId_RoleCode'
      AND object_id = OBJECT_ID(N'dbo.TenantUsers')
)
BEGIN
    CREATE INDEX IX_TenantUsers_TenantId_RoleCode
    ON dbo.TenantUsers (TenantId, RoleCode)
    INCLUDE (UserId, IsActive);
END;
GO

IF NOT EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_Branches_TenantId_IsActive'
      AND object_id = OBJECT_ID(N'dbo.Branches')
)
BEGIN
    CREATE INDEX IX_Branches_TenantId_IsActive
    ON dbo.Branches (TenantId, IsActive)
    INCLUDE (BranchId, Name, City, CreatedAtUtc);
END;
GO

IF NOT EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_Branches_TenantId_CreatedAtUtc'
      AND object_id = OBJECT_ID(N'dbo.Branches')
)
BEGIN
    CREATE INDEX IX_Branches_TenantId_CreatedAtUtc
    ON dbo.Branches (TenantId, CreatedAtUtc DESC);
END;
GO

IF NOT EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_BranchOrderSettings_TenantId_BranchId'
      AND object_id = OBJECT_ID(N'dbo.BranchOrderSettings')
)
BEGIN
    CREATE INDEX IX_BranchOrderSettings_TenantId_BranchId
    ON dbo.BranchOrderSettings (TenantId, BranchId);
END;
GO

IF NOT EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_BranchTables_TenantId_BranchId_IsActive_DisplayOrder'
      AND object_id = OBJECT_ID(N'dbo.BranchTables')
)
BEGIN
    CREATE INDEX IX_BranchTables_TenantId_BranchId_IsActive_DisplayOrder
    ON dbo.BranchTables (TenantId, BranchId, IsActive, DisplayOrder)
    INCLUDE (TableId, Name, QrToken);
END;
GO

IF NOT EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_BranchTables_QrToken_IsActive'
      AND object_id = OBJECT_ID(N'dbo.BranchTables')
)
BEGIN
    CREATE INDEX IX_BranchTables_QrToken_IsActive
    ON dbo.BranchTables (QrToken, IsActive)
    INCLUDE (TableId, TenantId, BranchId, Name);
END;
GO
