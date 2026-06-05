namespace QRApp.Application.Customers;

public interface ICustomerRepository
{
    Task<PublicCustomerLookupResponse?> LookupPublicCustomerAsync(
        string qrToken,
        string customerWhatsApp,
        CancellationToken cancellationToken);
}
