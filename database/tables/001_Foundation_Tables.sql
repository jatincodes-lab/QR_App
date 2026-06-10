IF OBJECT_ID(N'dbo.Tenants', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Tenants
    (
        TenantId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Tenants PRIMARY KEY,
        RowId BIGINT IDENTITY(1,1) NOT NULL,
        Name NVARCHAR(160) NOT NULL,
        Slug NVARCHAR(120) NOT NULL,
        OwnerEmail NVARCHAR(256) NOT NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_Tenants_IsActive DEFAULT (1),
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_Tenants_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
        UpdatedAtUtc DATETIME2(3) NULL,
        RowVersion ROWVERSION NOT NULL,
        CONSTRAINT UQ_Tenants_Slug UNIQUE (Slug),
        CONSTRAINT UQ_Tenants_OwnerEmail UNIQUE (OwnerEmail)
    );
END;
GO

IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Users
    (
        UserId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Users PRIMARY KEY,
        RowId BIGINT IDENTITY(1,1) NOT NULL,
        Email NVARCHAR(256) NOT NULL,
        DisplayName NVARCHAR(160) NOT NULL,
        PasswordHash NVARCHAR(512) NOT NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_Users_IsActive DEFAULT (1),
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_Users_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
        UpdatedAtUtc DATETIME2(3) NULL,
        RowVersion ROWVERSION NOT NULL,
        CONSTRAINT UQ_Users_Email UNIQUE (Email)
    );
END;
GO

IF OBJECT_ID(N'dbo.TenantUsers', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.TenantUsers
    (
        TenantUserId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_TenantUsers PRIMARY KEY,
        RowId BIGINT IDENTITY(1,1) NOT NULL,
        TenantId UNIQUEIDENTIFIER NOT NULL,
        UserId UNIQUEIDENTIFIER NOT NULL,
        RoleCode NVARCHAR(40) NOT NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_TenantUsers_IsActive DEFAULT (1),
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_TenantUsers_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
        UpdatedAtUtc DATETIME2(3) NULL,
        RowVersion ROWVERSION NOT NULL,
        CONSTRAINT FK_TenantUsers_Tenants FOREIGN KEY (TenantId) REFERENCES dbo.Tenants (TenantId),
        CONSTRAINT FK_TenantUsers_Users FOREIGN KEY (UserId) REFERENCES dbo.Users (UserId),
        CONSTRAINT CK_TenantUsers_RoleCode CHECK (RoleCode IN (N'owner', N'admin', N'staff')),
        CONSTRAINT UQ_TenantUsers_TenantId_UserId UNIQUE (TenantId, UserId)
    );
END;
GO

IF OBJECT_ID(N'dbo.Branches', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Branches
    (
        BranchId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Branches PRIMARY KEY,
        RowId BIGINT IDENTITY(1,1) NOT NULL,
        TenantId UNIQUEIDENTIFIER NOT NULL,
        Name NVARCHAR(160) NOT NULL,
        PhoneNumber NVARCHAR(32) NULL,
        AddressLine1 NVARCHAR(220) NULL,
        AddressLine2 NVARCHAR(220) NULL,
        City NVARCHAR(120) NULL,
        State NVARCHAR(120) NULL,
        PostalCode NVARCHAR(32) NULL,
        CountryCode CHAR(2) NOT NULL CONSTRAINT DF_Branches_CountryCode DEFAULT ('IN'),
        LogoUrl NVARCHAR(1000) NULL,
        LogoPublicId NVARCHAR(300) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_Branches_IsActive DEFAULT (1),
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_Branches_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
        UpdatedAtUtc DATETIME2(3) NULL,
        RowVersion ROWVERSION NOT NULL,
        CONSTRAINT FK_Branches_Tenants FOREIGN KEY (TenantId) REFERENCES dbo.Tenants (TenantId),
        CONSTRAINT UQ_Branches_TenantId_Name UNIQUE (TenantId, Name)
    );
END;
GO

IF OBJECT_ID(N'dbo.BranchOrderSettings', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.BranchOrderSettings
    (
        BranchOrderSettingsId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_BranchOrderSettings PRIMARY KEY,
        RowId BIGINT IDENTITY(1,1) NOT NULL,
        TenantId UNIQUEIDENTIFIER NOT NULL,
        BranchId UNIQUEIDENTIFIER NOT NULL,
        EnableDirectQrOrdering BIT NOT NULL CONSTRAINT DF_BranchOrderSettings_EnableDirectQrOrdering DEFAULT (0),
        RequireCustomerName BIT NOT NULL CONSTRAINT DF_BranchOrderSettings_RequireCustomerName DEFAULT (0),
        RequireCustomerWhatsApp BIT NOT NULL CONSTRAINT DF_BranchOrderSettings_RequireCustomerWhatsApp DEFAULT (0),
        WaiterCallEnabled BIT NOT NULL CONSTRAINT DF_BranchOrderSettings_WaiterCallEnabled DEFAULT (1),
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_BranchOrderSettings_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
        UpdatedAtUtc DATETIME2(3) NULL,
        RowVersion ROWVERSION NOT NULL,
        CONSTRAINT FK_BranchOrderSettings_Tenants FOREIGN KEY (TenantId) REFERENCES dbo.Tenants (TenantId),
        CONSTRAINT FK_BranchOrderSettings_Branches FOREIGN KEY (BranchId) REFERENCES dbo.Branches (BranchId),
        CONSTRAINT UQ_BranchOrderSettings_TenantId_BranchId UNIQUE (TenantId, BranchId)
    );
END;
GO

IF OBJECT_ID(N'dbo.MenuCategories', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.MenuCategories
    (
        MenuCategoryId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_MenuCategories PRIMARY KEY,
        RowId BIGINT IDENTITY(1,1) NOT NULL,
        TenantId UNIQUEIDENTIFIER NOT NULL,
        BranchId UNIQUEIDENTIFIER NOT NULL,
        Name NVARCHAR(120) NOT NULL,
        DisplayOrder INT NOT NULL CONSTRAINT DF_MenuCategories_DisplayOrder DEFAULT (0),
        IsActive BIT NOT NULL CONSTRAINT DF_MenuCategories_IsActive DEFAULT (1),
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_MenuCategories_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
        UpdatedAtUtc DATETIME2(3) NULL,
        RowVersion ROWVERSION NOT NULL,
        CONSTRAINT FK_MenuCategories_Tenants FOREIGN KEY (TenantId) REFERENCES dbo.Tenants (TenantId),
        CONSTRAINT FK_MenuCategories_Branches FOREIGN KEY (BranchId) REFERENCES dbo.Branches (BranchId),
        CONSTRAINT CK_MenuCategories_DisplayOrder CHECK (DisplayOrder >= 0),
        CONSTRAINT UQ_MenuCategories_TenantId_BranchId_Name UNIQUE (TenantId, BranchId, Name)
    );
END;
GO

IF OBJECT_ID(N'dbo.MenuItems', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.MenuItems
    (
        MenuItemId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_MenuItems PRIMARY KEY,
        RowId BIGINT IDENTITY(1,1) NOT NULL,
        TenantId UNIQUEIDENTIFIER NOT NULL,
        BranchId UNIQUEIDENTIFIER NOT NULL,
        MenuCategoryId UNIQUEIDENTIFIER NOT NULL,
        Name NVARCHAR(160) NOT NULL,
        Description NVARCHAR(1000) NULL,
        Price DECIMAL(10, 2) NOT NULL,
        IsAvailable BIT NOT NULL CONSTRAINT DF_MenuItems_IsAvailable DEFAULT (1),
        IsActive BIT NOT NULL CONSTRAINT DF_MenuItems_IsActive DEFAULT (1),
        DisplayOrder INT NOT NULL CONSTRAINT DF_MenuItems_DisplayOrder DEFAULT (0),
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_MenuItems_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
        UpdatedAtUtc DATETIME2(3) NULL,
        RowVersion ROWVERSION NOT NULL,
        CONSTRAINT FK_MenuItems_Tenants FOREIGN KEY (TenantId) REFERENCES dbo.Tenants (TenantId),
        CONSTRAINT FK_MenuItems_Branches FOREIGN KEY (BranchId) REFERENCES dbo.Branches (BranchId),
        CONSTRAINT FK_MenuItems_MenuCategories FOREIGN KEY (MenuCategoryId) REFERENCES dbo.MenuCategories (MenuCategoryId),
        CONSTRAINT CK_MenuItems_Price CHECK (Price >= 0),
        CONSTRAINT CK_MenuItems_DisplayOrder CHECK (DisplayOrder >= 0),
        CONSTRAINT UQ_MenuItems_TenantId_BranchId_MenuCategoryId_Name UNIQUE (TenantId, BranchId, MenuCategoryId, Name)
    );
END;
GO

IF OBJECT_ID(N'dbo.BranchTables', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.BranchTables
    (
        TableId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_BranchTables PRIMARY KEY,
        RowId BIGINT IDENTITY(1,1) NOT NULL,
        TenantId UNIQUEIDENTIFIER NOT NULL,
        BranchId UNIQUEIDENTIFIER NOT NULL,
        Name NVARCHAR(80) NOT NULL,
        DisplayOrder INT NOT NULL CONSTRAINT DF_BranchTables_DisplayOrder DEFAULT (0),
        QrToken NVARCHAR(80) NOT NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_BranchTables_IsActive DEFAULT (1),
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_BranchTables_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
        UpdatedAtUtc DATETIME2(3) NULL,
        RowVersion ROWVERSION NOT NULL,
        CONSTRAINT FK_BranchTables_Tenants FOREIGN KEY (TenantId) REFERENCES dbo.Tenants (TenantId),
        CONSTRAINT FK_BranchTables_Branches FOREIGN KEY (BranchId) REFERENCES dbo.Branches (BranchId),
        CONSTRAINT CK_BranchTables_DisplayOrder CHECK (DisplayOrder >= 0),
        CONSTRAINT UQ_BranchTables_TenantId_BranchId_Name UNIQUE (TenantId, BranchId, Name),
        CONSTRAINT UQ_BranchTables_QrToken UNIQUE (QrToken)
    );
END;
GO

IF OBJECT_ID(N'dbo.Orders', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Orders
    (
        OrderId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Orders PRIMARY KEY,
        RowId BIGINT IDENTITY(1,1) NOT NULL,
        TenantId UNIQUEIDENTIFIER NOT NULL,
        BranchId UNIQUEIDENTIFIER NOT NULL,
        TableId UNIQUEIDENTIFIER NOT NULL,
        OrderStatusCode NVARCHAR(32) NOT NULL CONSTRAINT DF_Orders_OrderStatusCode DEFAULT (N'Placed'),
        CustomerName NVARCHAR(120) NULL,
        CustomerWhatsApp NVARCHAR(32) NULL,
        Notes NVARCHAR(500) NULL,
        SubtotalAmount DECIMAL(10, 2) NOT NULL,
        TotalAmount DECIMAL(10, 2) NOT NULL,
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_Orders_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
        UpdatedAtUtc DATETIME2(3) NULL,
        RowVersion ROWVERSION NOT NULL,
        CONSTRAINT FK_Orders_Tenants FOREIGN KEY (TenantId) REFERENCES dbo.Tenants (TenantId),
        CONSTRAINT FK_Orders_Branches FOREIGN KEY (BranchId) REFERENCES dbo.Branches (BranchId),
        CONSTRAINT FK_Orders_BranchTables FOREIGN KEY (TableId) REFERENCES dbo.BranchTables (TableId),
        CONSTRAINT CK_Orders_SubtotalAmount CHECK (SubtotalAmount >= 0),
        CONSTRAINT CK_Orders_TotalAmount CHECK (TotalAmount >= 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.OrderItems', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OrderItems
    (
        OrderItemId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_OrderItems PRIMARY KEY,
        RowId BIGINT IDENTITY(1,1) NOT NULL,
        TenantId UNIQUEIDENTIFIER NOT NULL,
        BranchId UNIQUEIDENTIFIER NOT NULL,
        OrderId UNIQUEIDENTIFIER NOT NULL,
        MenuItemId UNIQUEIDENTIFIER NOT NULL,
        MenuItemName NVARCHAR(160) NOT NULL,
        UnitPrice DECIMAL(10, 2) NOT NULL,
        Quantity INT NOT NULL,
        LineTotal DECIMAL(10, 2) NOT NULL,
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_OrderItems_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
        RowVersion ROWVERSION NOT NULL,
        CONSTRAINT FK_OrderItems_Tenants FOREIGN KEY (TenantId) REFERENCES dbo.Tenants (TenantId),
        CONSTRAINT FK_OrderItems_Branches FOREIGN KEY (BranchId) REFERENCES dbo.Branches (BranchId),
        CONSTRAINT FK_OrderItems_Orders FOREIGN KEY (OrderId) REFERENCES dbo.Orders (OrderId),
        CONSTRAINT FK_OrderItems_MenuItems FOREIGN KEY (MenuItemId) REFERENCES dbo.MenuItems (MenuItemId),
        CONSTRAINT CK_OrderItems_UnitPrice CHECK (UnitPrice >= 0),
        CONSTRAINT CK_OrderItems_Quantity CHECK (Quantity > 0),
        CONSTRAINT CK_OrderItems_LineTotal CHECK (LineTotal >= 0)
    );
END;
GO
