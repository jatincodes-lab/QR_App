using QRApp.Application.Common;
using QRApp.Shared.Results;
using System.Text.RegularExpressions;

namespace QRApp.Application.Customers;

public sealed class CustomerService(ICustomerRepository repository) : ICustomerService
{
    private const int MinQrTokenLength = 8;
    private const int MaxQrTokenLength = 80;
    private static readonly Regex AllowedPhoneCharacters = new(@"^[0-9+\-().\s]+$", RegexOptions.Compiled);

    public async Task<OperationResult<PublicCustomerLookupResponse?>> LookupPublicCustomerAsync(
        string qrToken,
        string customerWhatsApp,
        CancellationToken cancellationToken)
    {
        var cleanToken = TextRules.CleanRequired(qrToken);
        var cleanWhatsApp = TextRules.CleanRequired(customerWhatsApp);
        var errors = new List<ValidationFailure>();

        if (cleanToken.Length is < MinQrTokenLength or > MaxQrTokenLength)
        {
            errors.Add(new ValidationFailure("QrToken", "QR token is invalid."));
        }

        if (cleanWhatsApp.Length > 32)
        {
            errors.Add(new ValidationFailure(nameof(customerWhatsApp), "WhatsApp cannot exceed 32 characters."));
        }

        var digits = new string(cleanWhatsApp.Where(char.IsDigit).ToArray());
        if (!AllowedPhoneCharacters.IsMatch(cleanWhatsApp) || digits.Length is < 10 or > 15)
        {
            errors.Add(new ValidationFailure(nameof(customerWhatsApp), "WhatsApp must be a valid phone number."));
        }

        if (errors.Count > 0)
        {
            return OperationResult<PublicCustomerLookupResponse?>.Failed(errors.ToArray());
        }

        var customer = await repository.LookupPublicCustomerAsync(cleanToken, cleanWhatsApp, cancellationToken);
        return OperationResult<PublicCustomerLookupResponse?>.Success(customer);
    }
}
