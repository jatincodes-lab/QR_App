using System.Text;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;
using QRApp.Api.Auth;
using QRApp.Api.Endpoints;
using QRApp.Api.Errors;
using QRApp.Api.Hubs;
using QRApp.Api.Media;
using QRApp.Application;
using QRApp.Application.Auth;
using QRApp.Application.Tenants;
using QRApp.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<RouteHandlerOptions>(options =>
{
    options.ThrowOnBadRequest = true;
});
builder.Services.AddHealthChecks();
builder.Services.AddHttpContextAccessor();
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy
            .WithOrigins(
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:3001",
                "http://127.0.0.1:3001",
                "http://localhost:3010",
                "http://127.0.0.1:3010")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});
builder.Services.AddSignalR();
builder.Services.AddApplication();
builder.Services.AddInfrastructure();
builder.Services.AddScoped<ITenantContext, HttpTenantContext>();
builder.Services.AddHttpClient<IImageUploadService, CloudinaryImageUploadService>();
builder.Services.AddSingleton<IJwtTokenService, JwtTokenService>();
builder.Services.AddSingleton<IAdminOrderRealtimeNotifier, AdminOrderRealtimeNotifier>();
builder.Services.Configure<CloudinaryOptions>(builder.Configuration.GetSection(CloudinaryOptions.SectionName));

builder.Services
    .AddOptions<JwtOptions>()
    .Bind(builder.Configuration.GetSection(JwtOptions.SectionName))
    .Validate(options => options.SigningKey.Length >= 32, "JWT signing key must be at least 32 characters.")
    .ValidateOnStart();

var jwtOptions = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>() ?? new JwtOptions();
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidAudience = jwtOptions.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.SigningKey)),
            ClockSkew = TimeSpan.FromMinutes(1)
        };

        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;

                if (!string.IsNullOrWhiteSpace(accessToken) && path.StartsWithSegments(AdminOrderHub.Route))
                {
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            },
            OnChallenge = AuthProblemResponses.WriteUnauthorizedAsync,
            OnForbidden = AuthProblemResponses.WriteForbiddenAsync
        };
    });
builder.Services.AddAuthorization(options =>
{
    options.DefaultPolicy = new AuthorizationPolicyBuilder(JwtBearerDefaults.AuthenticationScheme)
        .RequireAuthenticatedUser()
        .RequireClaim(TokenClaims.UserId)
        .RequireClaim(TokenClaims.TenantId)
        .RequireClaim(TokenClaims.RoleCode)
        .Build();
});

var app = builder.Build();

app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (BadHttpRequestException)
    {
        await ApiProblemResponses.BadRequest("The request body, route value, or query value is invalid.").ExecuteAsync(context);
    }
    catch (Exception)
    {
        await ApiProblemResponses.ServerError("An unexpected server error occurred.").ExecuteAsync(context);
    }
});

app.UseStatusCodePages(async statusCodeContext =>
{
    var response = statusCodeContext.HttpContext.Response;
    if (response.HasStarted)
    {
        return;
    }

    var result = response.StatusCode switch
    {
        StatusCodes.Status404NotFound => ApiProblemResponses.NotFound("The requested API endpoint was not found."),
        StatusCodes.Status405MethodNotAllowed => ApiProblemResponses.MethodNotAllowed("The HTTP method is not allowed for this API endpoint."),
        _ => null
    };

    if (result is not null)
    {
        await result.ExecuteAsync(statusCodeContext.HttpContext);
    }
});

app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();
app.Use(async (context, next) =>
{
    if (await ShouldBlockForTenantAccessAsync(context))
    {
        return;
    }

    await next();
});
app.Use(async (context, next) =>
{
    if (context.Request.Path.StartsWithSegments("/api/v1/admin") &&
        context.User.Identity?.IsAuthenticated == true &&
        !CanAccessAdminRequest(context))
    {
        await ApiProblemResponses.Forbidden("Your staff role cannot access this admin action.").ExecuteAsync(context);
        return;
    }

    await next();
});

app.MapGet("/health", () =>
{
    return Results.Ok(new
    {
        status = "Healthy",
        service = "QRApp.Api",
        utc = DateTimeOffset.UtcNow
    });
});

app.MapHealthChecks("/health/live");
app.MapAuthEndpoints();
app.MapAdminBranchEndpoints();
app.MapAdminMediaEndpoints();
app.MapAdminMenuEndpoints();
app.MapAdminNotificationEndpoints();
app.MapAdminTableEndpoints();
app.MapAdminOrderEndpoints();
app.MapAdminReportEndpoints();
app.MapAdminCampaignEndpoints();
app.MapAdminStaffEndpoints();
app.MapFeedbackEndpoints();
app.MapPublicMenuEndpoints();
app.MapPublicQrEndpoints();
app.MapPublicCustomerEndpoints();
app.MapPublicOrderEndpoints();
app.MapTenantBranchEndpoints();
app.MapWaiterCallEndpoints();
app.MapHub<AdminOrderHub>(AdminOrderHub.Route);

app.Run();

static bool CanAccessAdminRequest(HttpContext context)
{
    var roleCode = context.User.FindFirstValue(TokenClaims.RoleCode);
    if (string.Equals(roleCode, "owner", StringComparison.OrdinalIgnoreCase))
    {
        return true;
    }

    var path = context.Request.Path.Value ?? string.Empty;
    if (IsBranchReadPath(context, path))
    {
        return CanAccessAssignedBranch(context, path);
    }

    if (path.StartsWith("/api/v1/admin/staff", StringComparison.OrdinalIgnoreCase) ||
        path.StartsWith("/api/v1/admin/branches", StringComparison.OrdinalIgnoreCase) && !IsBranchOperationalPath(path))
    {
        return false;
    }

    if (!CanRoleAccessPath(roleCode, path))
    {
        return false;
    }

    var assignedBranchId = ReadOptionalGuidClaim(context.User, TokenClaims.BranchId);
    var requestedBranchId = ReadBranchIdFromPath(path) ?? ReadBranchIdFromQuery(context);
    return !assignedBranchId.HasValue || !requestedBranchId.HasValue || requestedBranchId.Value == assignedBranchId.Value;
}

static async Task<bool> ShouldBlockForTenantAccessAsync(HttpContext context)
{
    if (IsAnonymousAuthPath(context.Request.Path))
    {
        return false;
    }

    var service = context.RequestServices.GetRequiredService<ITenantAccessService>();
    TenantAccessStatusResponse? accessStatus = null;

    if (context.Request.Path.StartsWithSegments("/api/v1/admin") && context.User.Identity?.IsAuthenticated == true)
    {
        var tenantId = ReadOptionalGuidClaim(context.User, TokenClaims.TenantId);
        if (tenantId.HasValue)
        {
            accessStatus = await service.GetByTenantIdAsync(tenantId.Value, context.RequestAborted);
        }
    }
    else if (context.Request.Path.StartsWithSegments("/api/v1/public/qr"))
    {
        var qrToken = ReadQrTokenFromPublicPath(context.Request.Path.Value ?? string.Empty);
        if (!string.IsNullOrWhiteSpace(qrToken))
        {
            accessStatus = await service.GetByQrTokenAsync(Uri.UnescapeDataString(qrToken), context.RequestAborted);
        }
    }

    if (accessStatus is null || accessStatus.IsAccessAllowed)
    {
        return false;
    }

    await ApiProblemResponses.PaymentRequired(accessStatus.Message).ExecuteAsync(context);
    return true;
}

static bool IsAnonymousAuthPath(PathString path)
{
    return path.StartsWithSegments("/api/v1/auth");
}

static string? ReadQrTokenFromPublicPath(string path)
{
    var segments = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
    for (var index = 0; index < segments.Length - 1; index++)
    {
        if (string.Equals(segments[index], "qr", StringComparison.OrdinalIgnoreCase))
        {
            return segments[index + 1];
        }
    }

    return null;
}

static bool IsBranchReadPath(HttpContext context, string path)
{
    if (!HttpMethods.IsGet(context.Request.Method))
    {
        return false;
    }

    if (string.Equals(path, "/api/v1/admin/branches", StringComparison.OrdinalIgnoreCase))
    {
        return true;
    }

    var requestedBranchId = ReadBranchIdFromPath(path);
    return requestedBranchId.HasValue &&
           string.Equals(path, $"/api/v1/admin/branches/{requestedBranchId.Value}", StringComparison.OrdinalIgnoreCase);
}

static bool CanAccessAssignedBranch(HttpContext context, string path)
{
    var assignedBranchId = ReadOptionalGuidClaim(context.User, TokenClaims.BranchId);
    var requestedBranchId = ReadBranchIdFromPath(path);
    return !assignedBranchId.HasValue || !requestedBranchId.HasValue || requestedBranchId.Value == assignedBranchId.Value;
}

static bool CanRoleAccessPath(string? roleCode, string path)
{
    if (string.Equals(roleCode, "admin", StringComparison.OrdinalIgnoreCase))
    {
        return !path.StartsWith("/api/v1/admin/staff", StringComparison.OrdinalIgnoreCase);
    }

    if (string.Equals(roleCode, "manager", StringComparison.OrdinalIgnoreCase))
    {
        return path.StartsWith("/api/v1/admin/branches", StringComparison.OrdinalIgnoreCase) && IsBranchOperationalPath(path) ||
               path.StartsWith("/api/v1/admin/media", StringComparison.OrdinalIgnoreCase) ||
               path.StartsWith("/api/v1/admin/reports", StringComparison.OrdinalIgnoreCase) ||
               path.StartsWith("/api/v1/admin/feedback", StringComparison.OrdinalIgnoreCase) ||
               path.StartsWith("/api/v1/admin/campaigns", StringComparison.OrdinalIgnoreCase);
    }

    if (string.Equals(roleCode, "kitchen", StringComparison.OrdinalIgnoreCase))
    {
        return path.Contains("/orders", StringComparison.OrdinalIgnoreCase) ||
               path.Contains("/waiter-calls", StringComparison.OrdinalIgnoreCase);
    }

    if (string.Equals(roleCode, "waiter", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(roleCode, "staff", StringComparison.OrdinalIgnoreCase))
    {
        return path.Contains("/orders", StringComparison.OrdinalIgnoreCase) ||
               path.Contains("/waiter-calls", StringComparison.OrdinalIgnoreCase) ||
               path.Contains("/order-settings", StringComparison.OrdinalIgnoreCase);
    }

    return false;
}

static bool IsBranchOperationalPath(string path)
{
    return path.Contains("/menu-", StringComparison.OrdinalIgnoreCase) ||
           path.Contains("/offers", StringComparison.OrdinalIgnoreCase) ||
           path.Contains("/tables", StringComparison.OrdinalIgnoreCase) ||
           path.Contains("/orders", StringComparison.OrdinalIgnoreCase) ||
           path.Contains("/order-settings", StringComparison.OrdinalIgnoreCase) ||
           path.Contains("/billing-settings", StringComparison.OrdinalIgnoreCase) ||
           path.Contains("/waiter-calls", StringComparison.OrdinalIgnoreCase);
}

static Guid? ReadBranchIdFromPath(string path)
{
    var segments = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
    for (var index = 0; index < segments.Length - 1; index++)
    {
        if (string.Equals(segments[index], "branches", StringComparison.OrdinalIgnoreCase) &&
            Guid.TryParse(segments[index + 1], out var branchId))
        {
            return branchId;
        }
    }

    return null;
}

static Guid? ReadBranchIdFromQuery(HttpContext context)
{
    return Guid.TryParse(context.Request.Query["branchId"], out var branchId) ? branchId : null;
}

static Guid? ReadOptionalGuidClaim(ClaimsPrincipal user, string claimType)
{
    return Guid.TryParse(user.FindFirstValue(claimType), out var value) ? value : null;
}

public partial class Program;
