using Microsoft.Extensions.DependencyInjection;
using QRApp.Application.Auth;
using QRApp.Application.Branches;
using QRApp.Application.BranchOrderSettings;
using QRApp.Application.Menus;
using QRApp.Application.Orders;
using QRApp.Application.Tables;
using QRApp.Application.Tenants;

namespace QRApp.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddSingleton<IPasswordHasher, Pbkdf2PasswordHasher>();
        services.AddScoped<ITenantService, TenantService>();
        services.AddScoped<IBranchService, BranchService>();
        services.AddScoped<IBranchOrderSettingsService, BranchOrderSettingsService>();
        services.AddScoped<IMenuCategoryService, MenuCategoryService>();
        services.AddScoped<IMenuItemService, MenuItemService>();
        services.AddScoped<IBranchTableService, BranchTableService>();
        services.AddScoped<IOrderService, OrderService>();

        return services;
    }
}
