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
using QRApp.Infrastructure.Auth;
using QRApp.Infrastructure.Billing;
using QRApp.Infrastructure.Branches;
using QRApp.Infrastructure.BranchOrderSettings;
using QRApp.Infrastructure.Campaigns;
using QRApp.Infrastructure.Customers;
using QRApp.Infrastructure.Data;
using QRApp.Infrastructure.Feedback;
using QRApp.Infrastructure.Menus;
using QRApp.Infrastructure.Notifications;
using QRApp.Infrastructure.Orders;
using QRApp.Infrastructure.Reports;
using QRApp.Infrastructure.Staff;
using QRApp.Infrastructure.Tables;
using QRApp.Infrastructure.Tenants;
using QRApp.Infrastructure.WaiterCalls;

namespace QRApp.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services)
    {
        services.AddSingleton<ISqlConnectionFactory, SqlConnectionFactory>();
        services.AddScoped<IAuthRepository, SqlAuthRepository>();
        services.AddScoped<IBillingRepository, SqlBillingRepository>();
        services.AddScoped<ITenantRepository, SqlTenantRepository>();
        services.AddScoped<IBranchRepository, SqlBranchRepository>();
        services.AddScoped<IBranchOrderSettingsRepository, SqlBranchOrderSettingsRepository>();
        services.AddScoped<ICampaignRepository, SqlCampaignRepository>();
        services.AddScoped<IMenuCategoryRepository, SqlMenuCategoryRepository>();
        services.AddScoped<IMenuItemRepository, SqlMenuItemRepository>();
        services.AddScoped<IBranchOfferRepository, SqlBranchOfferRepository>();
        services.AddScoped<IBranchTableRepository, SqlBranchTableRepository>();
        services.AddScoped<ICustomerRepository, SqlCustomerRepository>();
        services.AddScoped<IFeedbackRepository, SqlFeedbackRepository>();
        services.AddScoped<IAdminNotificationRepository, SqlAdminNotificationRepository>();
        services.AddScoped<IOrderRepository, SqlOrderRepository>();
        services.AddScoped<IAdminOrderRepository, SqlAdminOrderRepository>();
        services.AddScoped<IReportRepository, SqlReportRepository>();
        services.AddScoped<IStaffUserRepository, SqlStaffUserRepository>();
        services.AddScoped<IWaiterCallRepository, SqlWaiterCallRepository>();

        return services;
    }
}
