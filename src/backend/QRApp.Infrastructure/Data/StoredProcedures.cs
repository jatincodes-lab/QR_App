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

    public const string BranchOfferCreate = "dbo.BranchOffer_Create";
    public const string BranchOfferUpdate = "dbo.BranchOffer_Update";
    public const string BranchOfferGetListByBranch = "dbo.BranchOffer_GetListByBranch";
    public const string BranchOfferDeactivate = "dbo.BranchOffer_Deactivate";
    public const string PublicOffersGetByQrToken = "dbo.PublicOffers_GetByQrToken";

    public const string BranchTableCreate = "dbo.BranchTable_Create";
    public const string BranchTableUpdate = "dbo.BranchTable_Update";
    public const string BranchTableGetListByBranch = "dbo.BranchTable_GetListByBranch";
    public const string BranchTableDeactivate = "dbo.BranchTable_Deactivate";
    public const string BranchTableRegenerateQrToken = "dbo.BranchTable_RegenerateQrToken";
    public const string PublicMenuGetByQrToken = "dbo.PublicMenu_GetByQrToken";

    public const string PublicOrderCreateFromQrToken = "dbo.PublicOrder_CreateFromQrToken";
    public const string PublicOrderGetByQrToken = "dbo.PublicOrder_GetByQrToken";
    public const string PublicCustomerLookupByQrToken = "dbo.PublicCustomer_LookupByQrToken";
    public const string AdminOrderGetListByBranch = "dbo.AdminOrder_GetListByBranch";
    public const string AdminOrderGetItemsByBranch = "dbo.AdminOrder_GetItemsByBranch";
    public const string AdminOrderUpdateStatus = "dbo.AdminOrder_UpdateStatus";
    public const string BranchBillingSettingsGetByBranch = "dbo.BranchBillingSettings_GetByBranch";
    public const string BranchBillingSettingsSave = "dbo.BranchBillingSettings_Save";
    public const string OrderBillGetByOrder = "dbo.OrderBill_GetByOrder";
    public const string OrderBillGenerate = "dbo.OrderBill_Generate";
    public const string OrderBillUpdatePaymentStatus = "dbo.OrderBill_UpdatePaymentStatus";
    public const string OrderBillUpdateRefundStatus = "dbo.OrderBill_UpdateRefundStatus";

    public const string ReportOrderSummary = "dbo.Report_OrderSummary";
    public const string ReportOrders = "dbo.Report_Orders";
    public const string ReportOrderDetail = "dbo.Report_OrderDetail";
    public const string ReportItems = "dbo.Report_Items";
    public const string ReportCustomers = "dbo.Report_Customers";

    public const string WhatsAppCampaignPreviewRecipients = "dbo.WhatsAppCampaign_PreviewRecipients";
    public const string WhatsAppCampaignCreate = "dbo.WhatsAppCampaign_Create";
    public const string WhatsAppCampaignGetList = "dbo.WhatsAppCampaign_GetList";

    public const string StaffUserCreate = "dbo.StaffUser_Create";
    public const string StaffUserGetList = "dbo.StaffUser_GetList";
    public const string StaffUserUpdate = "dbo.StaffUser_Update";

    public const string WaiterCallCreateFromQrToken = "dbo.WaiterCall_CreateFromQrToken";
    public const string WaiterCallGetListByBranch = "dbo.WaiterCall_GetListByBranch";
    public const string WaiterCallUpdateStatus = "dbo.WaiterCall_UpdateStatus";

    public const string AdminNotificationCreate = "dbo.AdminNotification_Create";
    public const string AdminNotificationGetList = "dbo.AdminNotification_GetList";
    public const string AdminNotificationMarkRead = "dbo.AdminNotification_MarkRead";
    public const string AdminNotificationMarkAllRead = "dbo.AdminNotification_MarkAllRead";
    public const string AdminSearch = "dbo.AdminSearch";
}
