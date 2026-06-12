using QRApp.Application.Common;
using QRApp.Application.Tenants;
using QRApp.Shared.Results;

namespace QRApp.Application.Auth;

public sealed class AuthService(IAuthRepository authRepository, IPasswordHasher passwordHasher) : IAuthService
{
    public async Task<OperationResult<AuthenticatedSessionResponse>> RegisterTenantOwnerAsync(
        RegisterTenantOwnerRequest request,
        CancellationToken cancellationToken)
    {
        var cleaned = new RegisterTenantOwnerRequest(
            TextRules.CleanRequired(request.TenantName),
            TextRules.CleanRequired(request.TenantSlug).ToLowerInvariant(),
            TextRules.CleanRequired(request.OwnerEmail).ToLowerInvariant(),
            TextRules.CleanRequired(request.OwnerDisplayName),
            request.Password ?? string.Empty);

        var errors = ValidateRegistration(cleaned);
        if (errors.Count > 0)
        {
            return OperationResult<AuthenticatedSessionResponse>.Failed(errors.ToArray());
        }

        var session = await authRepository.RegisterTenantOwnerAsync(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            cleaned,
            passwordHasher.Hash(cleaned.Password),
            cancellationToken);

        return OperationResult<AuthenticatedSessionResponse>.Success(session);
    }

    public async Task<OperationResult<AuthenticatedSessionResponse>> LoginAsync(
        LoginRequest request,
        CancellationToken cancellationToken)
    {
        var email = TextRules.CleanRequired(request.Email).ToLowerInvariant();
        var password = request.Password ?? string.Empty;

        if (email.Length > 256 || !email.Contains('@', StringComparison.Ordinal) || password.Length == 0)
        {
            return InvalidLogin();
        }

        var user = await authRepository.GetUserByEmailAsync(email, cancellationToken);
        if (user is null || !passwordHasher.Verify(password, user.PasswordHash))
        {
            return InvalidLogin();
        }

        return OperationResult<AuthenticatedSessionResponse>.Success(ToSession(user));
    }

    private static List<ValidationFailure> ValidateRegistration(RegisterTenantOwnerRequest request)
    {
        var errors = new List<ValidationFailure>();

        if (request.TenantName.Length is < 2 or > 160)
        {
            errors.Add(new ValidationFailure(nameof(request.TenantName), "Tenant name must be between 2 and 160 characters."));
        }

        if (request.TenantSlug.Length is < 3 or > 120 || !request.TenantSlug.All(c => char.IsLetterOrDigit(c) || c == '-'))
        {
            errors.Add(new ValidationFailure(nameof(request.TenantSlug), "Tenant slug must be 3-120 characters and contain only letters, numbers, or hyphens."));
        }

        if (request.OwnerEmail.Length > 256 || !request.OwnerEmail.Contains('@', StringComparison.Ordinal))
        {
            errors.Add(new ValidationFailure(nameof(request.OwnerEmail), "Owner email is invalid."));
        }

        if (request.OwnerDisplayName.Length is < 2 or > 160)
        {
            errors.Add(new ValidationFailure(nameof(request.OwnerDisplayName), "Owner display name must be between 2 and 160 characters."));
        }

        if (request.Password.Length is < 8 or > 128)
        {
            errors.Add(new ValidationFailure(nameof(request.Password), "Password must be between 8 and 128 characters."));
        }

        return errors;
    }

    private static OperationResult<AuthenticatedSessionResponse> InvalidLogin()
    {
        return OperationResult<AuthenticatedSessionResponse>.Failed(
            new ValidationFailure(nameof(LoginRequest.Email), "Email or password is invalid."));
    }

    private static AuthenticatedSessionResponse ToSession(LoginUserRecord user)
    {
        var accessStatus = TenantAccessRules.CreateStatus(
            user.TenantId,
            user.PlanCode,
            user.TrialStartAtUtc,
            user.TrialEndAtUtc,
            user.SubscriptionStatusCode,
            user.AccountStatusCode,
            user.IsTenantActive,
            DateTime.UtcNow);

        return new AuthenticatedSessionResponse(
            new AuthenticatedUserResponse(user.UserId, user.Email, user.DisplayName, user.TenantId, user.RoleCode, user.BranchId),
            new AuthenticatedTenantResponse(user.TenantId, user.TenantName, user.TenantSlug, accessStatus));
    }
}
