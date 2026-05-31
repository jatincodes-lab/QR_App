using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;
using QRApp.Api.Auth;
using QRApp.Api.Endpoints;
using QRApp.Api.Errors;
using QRApp.Api.Hubs;
using QRApp.Application;
using QRApp.Application.Auth;
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
builder.Services.AddSingleton<IJwtTokenService, JwtTokenService>();
builder.Services.AddSingleton<IAdminOrderRealtimeNotifier, AdminOrderRealtimeNotifier>();

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
app.MapAdminMenuEndpoints();
app.MapAdminTableEndpoints();
app.MapAdminOrderEndpoints();
app.MapPublicMenuEndpoints();
app.MapPublicQrEndpoints();
app.MapPublicOrderEndpoints();
app.MapTenantBranchEndpoints();
app.MapWaiterCallEndpoints();
app.MapHub<AdminOrderHub>(AdminOrderHub.Route);

app.Run();

public partial class Program;
