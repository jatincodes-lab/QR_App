namespace QRApp.Infrastructure.Data;

internal static class StoredProcedures
{
    public const string TenantCreate = "dbo.Tenant_Create";
    public const string TenantGetById = "dbo.Tenant_GetById";

    public const string AuthRegisterTenantOwner = "dbo.Auth_RegisterTenantOwner";
    public const string AuthGetUserByEmail = "dbo.Auth_GetUserByEmail";

    public const string BranchCreate = "dbo.Branch_Create";
    public const string BranchUpdate = "dbo.Branch_Update";
    public const string BranchGetById = "dbo.Branch_GetById";
    public const string BranchGetListByTenant = "dbo.Branch_GetListByTenant";
    public const string BranchDeactivate = "dbo.Branch_Deactivate";

    public const string BranchOrderSettingsCreate = "dbo.BranchOrderSettings_Create";
    public const string BranchOrderSettingsUpdate = "dbo.BranchOrderSettings_Update";
    public const string BranchOrderSettingsGetByBranch = "dbo.BranchOrderSettings_GetByBranch";

    public const string MenuCategoryCreate = "dbo.MenuCategory_Create";
    public const string MenuCategoryUpdate = "dbo.MenuCategory_Update";
    public const string MenuCategoryGetListByBranch = "dbo.MenuCategory_GetListByBranch";
    public const string MenuCategoryDeactivate = "dbo.MenuCategory_Deactivate";

    public const string MenuItemCreate = "dbo.MenuItem_Create";
    public const string MenuItemUpdate = "dbo.MenuItem_Update";
    public const string MenuItemGetListByBranch = "dbo.MenuItem_GetListByBranch";
    public const string MenuItemDeactivate = "dbo.MenuItem_Deactivate";
    public const string PublicMenuGetByBranch = "dbo.PublicMenu_GetByBranch";

    public const string BranchTableCreate = "dbo.BranchTable_Create";
    public const string BranchTableUpdate = "dbo.BranchTable_Update";
    public const string BranchTableGetListByBranch = "dbo.BranchTable_GetListByBranch";
    public const string BranchTableDeactivate = "dbo.BranchTable_Deactivate";
    public const string BranchTableRegenerateQrToken = "dbo.BranchTable_RegenerateQrToken";
    public const string PublicMenuGetByQrToken = "dbo.PublicMenu_GetByQrToken";
}
