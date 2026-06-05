using QRApp.Shared.Results;

namespace QRApp.Application.Customers;

public interface ICustomerService
{
    Task<OperationResult<PublicCustomerLookupResponse?>> LookupPublicCustomerAsync(
        string qrToken,
        string customerWhatsApp,
        CancellationToken cancellationToken);
}
