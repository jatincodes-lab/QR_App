using Microsoft.Extensions.DependencyInjection;
using QRApp.Application.Auth;
using QRApp.Application.Branches;
using QRApp.Application.BranchOrderSettings;
using QRApp.Application.Menus;
using QRApp.Application.Orders;
using QRApp.Application.Tables;
using QRApp.Application.Tenants;
using QRApp.Infrastructure.Auth;
using QRApp.Infrastructure.Branches;
using QRApp.Infrastructure.BranchOrderSettings;
using QRApp.Infrastructure.Data;
using QRApp.Infrastructure.Menus;
using QRApp.Infrastructure.Orders;
using QRApp.Infrastructure.Tables;
using QRApp.Infrastructure.Tenants;

namespace QRApp.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services)
    {
        services.AddSingleton<ISqlConnectionFactory, SqlConnectionFactory>();
        services.AddScoped<IAuthRepository, SqlAuthRepository>();
        services.AddScoped<ITenantRepository, SqlTenantRepository>();
        services.AddScoped<IBranchRepository, SqlBranchRepository>();
        services.AddScoped<IBranchOrderSettingsRepository, SqlBranchOrderSettingsRepository>();
        services.AddScoped<IMenuCategoryRepository, SqlMenuCategoryRepository>();
        services.AddScoped<IMenuItemRepository, SqlMenuItemRepository>();
        services.AddScoped<IBranchTableRepository, SqlBranchTableRepository>();
        services.AddScoped<IOrderRepository, SqlOrderRepository>();
        services.AddScoped<IAdminOrderRepository, SqlAdminOrderRepository>();

        return services;
    }
}
