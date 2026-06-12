using QRApp.Application.Auth;
using QRApp.Application.Tenants;

namespace QRApp.Application.Tests.Auth;

public sealed class AuthServiceTests
{
    [Fact]
    public async Task RegisterTenantOwnerAsync_WhenRequestIsValid_NormalizesAndCreatesOwner()
    {
        var repository = new FakeAuthRepository();
        var service = new AuthService(repository, new FakePasswordHasher());

        var result = await service.RegisterTenantOwnerAsync(
            new RegisterTenantOwnerRequest(" Cafe Demo ", " Cafe-Demo ", " OWNER@EXAMPLE.COM ", " Owner Name ", "password123"),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("Cafe Demo", repository.RegisteredRequest!.TenantName);
        Assert.Equal("cafe-demo", repository.RegisteredRequest.TenantSlug);
        Assert.Equal("owner@example.com", repository.RegisteredRequest.OwnerEmail);
        Assert.Equal("Owner Name", repository.RegisteredRequest.OwnerDisplayName);
        Assert.Equal("hashed:password123", repository.PasswordHash);
    }

    [Fact]
    public async Task RegisterTenantOwnerAsync_WhenPasswordIsTooShort_ReturnsValidationError()
    {
        var service = new AuthService(new FakeAuthRepository(), new FakePasswordHasher());

        var result = await service.RegisterTenantOwnerAsync(
            new RegisterTenantOwnerRequest("Cafe Demo", "cafe-demo", "owner@example.com", "Owner Name", "short"),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains(result.Errors, error => error.Field == nameof(RegisterTenantOwnerRequest.Password));
    }

    [Fact]
    public async Task LoginAsync_WhenPasswordDoesNotMatch_ReturnsInvalidLogin()
    {
        var repository = new FakeAuthRepository
        {
            LoginUser = new LoginUserRecord(
                Guid.NewGuid(),
                "owner@example.com",
                "Owner Name",
                "hashed:password123",
                Guid.NewGuid(),
                "Cafe Demo",
                "cafe-demo",
                "owner",
                null,
                "trial",
                DateTime.UtcNow.AddDays(-1),
                DateTime.UtcNow.AddDays(6),
                "Trialing",
                "Active",
                true)
        };
        var service = new AuthService(repository, new FakePasswordHasher());

        var result = await service.LoginAsync(new LoginRequest("owner@example.com", "wrong-password"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains(result.Errors, error => error.Field == nameof(LoginRequest.Email));
    }

    private sealed class FakeAuthRepository : IAuthRepository
    {
        public RegisterTenantOwnerRequest? RegisteredRequest { get; private set; }

        public string? PasswordHash { get; private set; }

        public LoginUserRecord? LoginUser { get; init; }

        public Task<AuthenticatedSessionResponse> RegisterTenantOwnerAsync(
            Guid tenantId,
            Guid userId,
            Guid tenantUserId,
            RegisterTenantOwnerRequest request,
            string passwordHash,
            CancellationToken cancellationToken)
        {
            RegisteredRequest = request;
            PasswordHash = passwordHash;

            return Task.FromResult(new AuthenticatedSessionResponse(
                new AuthenticatedUserResponse(userId, request.OwnerEmail, request.OwnerDisplayName, tenantId, "owner", null),
                new AuthenticatedTenantResponse(
                    tenantId,
                    request.TenantName,
                    request.TenantSlug,
                    TenantAccessRules.CreateStatus(
                        tenantId,
                        "trial",
                        DateTime.UtcNow,
                        DateTime.UtcNow.AddDays(7),
                        "Trialing",
                        "Active",
                        true,
                        DateTime.UtcNow))));
        }

        public Task<LoginUserRecord?> GetUserByEmailAsync(string email, CancellationToken cancellationToken)
        {
            return Task.FromResult(LoginUser);
        }
    }

    private sealed class FakePasswordHasher : IPasswordHasher
    {
        public string Hash(string password) => $"hashed:{password}";

        public bool Verify(string password, string passwordHash) => passwordHash == Hash(password);
    }
}
