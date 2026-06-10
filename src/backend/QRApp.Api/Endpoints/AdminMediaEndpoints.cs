using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using QRApp.Api.Errors;
using QRApp.Api.Media;

namespace QRApp.Api.Endpoints;

public static class AdminMediaEndpoints
{
    public static IEndpointRouteBuilder MapAdminMediaEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/admin/media").RequireAuthorization();

        group.MapGet("/cloudinary-status", GetCloudinaryStatus);
        group.MapPost("/uploads", UploadImageAsync)
            .DisableAntiforgery();

        return app;
    }

    private static IResult GetCloudinaryStatus(IOptions<CloudinaryOptions> options)
    {
        var value = options.Value;
        return Results.Ok(new
        {
            cloudName = value.CloudName,
            hasApiKey = !string.IsNullOrWhiteSpace(value.ApiKey),
            apiKeySuffix = value.ApiKey.Length >= 4 ? value.ApiKey[^4..] : value.ApiKey,
            hasApiSecret = !string.IsNullOrWhiteSpace(value.ApiSecret),
            uploadFolder = value.UploadFolder,
            uploadPreset = value.UploadPreset
        });
    }

    private static async Task<IResult> UploadImageAsync(
        [FromForm] IFormFile file,
        [FromForm] string purpose,
        IImageUploadService imageUploadService,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await imageUploadService.UploadAsync(file, purpose, cancellationToken);
            if (!result.IsSuccess)
            {
                return result.Error == "Cloudinary is not configured."
                    ? ApiProblemResponses.ServiceUnavailable(result.Error)
                    : ApiProblemResponses.BadRequest(result.Error ?? "Image upload failed.");
            }

            return Results.Ok(new MediaUploadResponse(result.Url!, result.PublicId!));
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(AdminMediaEndpoints)).LogError(ex, "Failed to upload admin media.");
            return ApiProblemResponses.ServerError("Image could not be uploaded.");
        }
    }
}
