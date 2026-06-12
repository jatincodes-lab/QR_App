using Microsoft.Extensions.DependencyInjection;
using QRApp.Application.Auth;
using QRApp.Application.Billing;
using QRApp.Application.Branches;
using QRApp.Application.BranchOrderSettings;
using QRApp.Application.Campaigns;
using QRApp.Application.Customers;
using QRApp.Application.Feedback;
using QRApp.Application.Menus;
using QRApp.Application.Notifications;
using QRApp.Application.Orders;
using QRApp.Application.Reports;
using QRApp.Application.Staff;
using QRApp.Application.Tables;
using QRApp.Application.Tenants;
using QRApp.Application.WaiterCalls;

namespace QRApp.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IBillingService, BillingService>();
        services.AddSingleton<IPasswordHasher, Pbkdf2PasswordHasher>();
        services.AddScoped<ITenantService, TenantService>();
        services.AddScoped<ITenantAccessService, TenantAccessService>();
        services.AddScoped<ITenantSubscriptionService, TenantSubscriptionService>();
        services.AddScoped<IBranchService, BranchService>();
        services.AddScoped<IBranchOrderSettingsService, BranchOrderSettingsService>();
        services.AddScoped<ICampaignService, CampaignService>();
        services.AddScoped<IMenuCategoryService, MenuCategoryService>();
        services.AddScoped<IMenuItemService, MenuItemService>();
        services.AddScoped<IBranchOfferService, BranchOfferService>();
        services.AddScoped<IBranchTableService, BranchTableService>();
        services.AddScoped<ICustomerService, CustomerService>();
        services.AddScoped<IFeedbackService, FeedbackService>();
        services.AddScoped<IAdminNotificationService, AdminNotificationService>();
        services.AddScoped<IOrderService, OrderService>();
        services.AddScoped<IAdminOrderService, AdminOrderService>();
        services.AddScoped<IReportService, ReportService>();
        services.AddScoped<IStaffUserService, StaffUserService>();
        services.AddScoped<IWaiterCallService, WaiterCallService>();

        return services;
    }
}
