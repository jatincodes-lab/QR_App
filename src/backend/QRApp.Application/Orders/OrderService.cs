using QRApp.Application.Common;
using QRApp.Shared.Results;

namespace QRApp.Application.Orders;

public sealed class OrderService(IOrderRepository repository) : IOrderService
{
    public async Task<OperationResult<PublicOrderResponse>> CreateFromQrTokenAsync(
        string qrToken,
        CreatePublicQrOrderRequest request,
        CancellationToken cancellationToken)
    {
        var cleanToken = TextRules.CleanRequired(qrToken);
        var errors = Validate(cleanToken, request);
        if (errors.Count > 0)
        {
            return OperationResult<PublicOrderResponse>.Failed(errors.ToArray());
        }

        var cleaned = new CreatePublicQrOrderRequest(
            CleanOptional(request.CustomerName),
            CleanOptional(request.CustomerWhatsApp),
            CleanOptional(request.Notes),
            request.Items
                .GroupBy(item => item.MenuItemId)
                .Select(group => new CreatePublicQrOrderItemRequest(group.Key, group.Sum(item => item.Quantity)))
                .ToArray());

        var order = await repository.CreateFromQrTokenAsync(cleanToken, Guid.NewGuid(), cleaned, cancellationToken);
        return OperationResult<PublicOrderResponse>.Success(order);
    }

    private static List<ValidationFailure> Validate(string qrToken, CreatePublicQrOrderRequest request)
    {
        var errors = new List<ValidationFailure>();

        if (qrToken.Length is < 16 or > 80)
        {
            errors.Add(new ValidationFailure("QrToken", "QR token is invalid."));
        }

        if (CleanOptional(request.CustomerName)?.Length > 120)
        {
            errors.Add(new ValidationFailure(nameof(CreatePublicQrOrderRequest.CustomerName), "Customer name cannot exceed 120 characters."));
        }

        if (CleanOptional(request.CustomerWhatsApp)?.Length > 32)
        {
            errors.Add(new ValidationFailure(nameof(CreatePublicQrOrderRequest.CustomerWhatsApp), "Customer WhatsApp cannot exceed 32 characters."));
        }

        if (CleanOptional(request.Notes)?.Length > 500)
        {
            errors.Add(new ValidationFailure(nameof(CreatePublicQrOrderRequest.Notes), "Notes cannot exceed 500 characters."));
        }

        if (request.Items.Count is < 1 or > 100)
        {
            errors.Add(new ValidationFailure(nameof(CreatePublicQrOrderRequest.Items), "Order must contain between 1 and 100 items."));
        }

        foreach (var item in request.Items)
        {
            if (item.MenuItemId == Guid.Empty)
            {
                errors.Add(new ValidationFailure(nameof(CreatePublicQrOrderItemRequest.MenuItemId), "Menu item is required."));
            }

            if (item.Quantity is < 1 or > 99)
            {
                errors.Add(new ValidationFailure(nameof(CreatePublicQrOrderItemRequest.Quantity), "Quantity must be between 1 and 99."));
            }
        }

        return errors;
    }

    private static string? CleanOptional(string? value)
    {
        var clean = TextRules.CleanOptional(value);
        return string.IsNullOrWhiteSpace(clean) ? null : clean;
    }
}
