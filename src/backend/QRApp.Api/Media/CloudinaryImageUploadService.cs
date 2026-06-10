using System.Text;
using System.Text.Json;
using System.Net.Http.Headers;
using Microsoft.Extensions.Options;

namespace QRApp.Api.Media;

public sealed class CloudinaryImageUploadService(HttpClient httpClient, IOptions<CloudinaryOptions> options) : IImageUploadService
{
    private static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg",
        "image/png",
        "image/webp"
    };

    private readonly CloudinaryOptions options = options.Value;

    public async Task<MediaUploadResult> UploadAsync(IFormFile file, string purpose, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(options.CloudName) ||
            string.IsNullOrWhiteSpace(options.ApiKey) ||
            string.IsNullOrWhiteSpace(options.ApiSecret))
        {
            return new MediaUploadResult(false, null, null, "Cloudinary is not configured.");
        }

        if (file.Length <= 0)
        {
            return new MediaUploadResult(false, null, null, "Please choose an image to upload.");
        }

        if (file.Length > 5 * 1024 * 1024)
        {
            return new MediaUploadResult(false, null, null, "Image size must be 5 MB or less.");
        }

        if (!AllowedContentTypes.Contains(file.ContentType))
        {
            return new MediaUploadResult(false, null, null, "Only JPG, PNG, or WebP images are supported.");
        }

        var folder = $"{options.UploadFolder.Trim().Trim('/')}/{CleanPurpose(purpose)}";
        var uploadPreset = options.UploadPreset.Trim();

        await using var stream = file.OpenReadStream();
        using var fileContent = new StreamContent(stream);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue(file.ContentType);

        using var content = new MultipartFormDataContent
        {
            { new StringContent(folder), "folder" }
        };

        if (!string.IsNullOrWhiteSpace(uploadPreset))
        {
            content.Add(new StringContent(uploadPreset), "upload_preset");
        }

        content.Add(fileContent, "file", file.FileName);

        using var request = new HttpRequestMessage(HttpMethod.Post, $"https://api.cloudinary.com/v1_1/{options.CloudName}/image/upload")
        {
            Content = content
        };
        request.Headers.Authorization = new AuthenticationHeaderValue(
            "Basic",
            Convert.ToBase64String(Encoding.ASCII.GetBytes($"{options.ApiKey}:{options.ApiSecret}")));

        using var response = await httpClient.SendAsync(request, cancellationToken);
        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            return new MediaUploadResult(false, null, null, ReadCloudinaryError(responseBody) ?? "Image upload failed.");
        }

        using var document = JsonDocument.Parse(responseBody);
        var root = document.RootElement;
        var url = root.TryGetProperty("secure_url", out var secureUrl) ? secureUrl.GetString() : null;
        var publicId = root.TryGetProperty("public_id", out var publicIdValue) ? publicIdValue.GetString() : null;

        return string.IsNullOrWhiteSpace(url) || string.IsNullOrWhiteSpace(publicId)
            ? new MediaUploadResult(false, null, null, "Image upload response was invalid.")
            : new MediaUploadResult(true, url, publicId, null);
    }

    private static string? ReadCloudinaryError(string responseBody)
    {
        if (string.IsNullOrWhiteSpace(responseBody))
        {
            return null;
        }

        try
        {
            using var document = JsonDocument.Parse(responseBody);
            if (document.RootElement.TryGetProperty("error", out var error) &&
                error.TryGetProperty("message", out var message))
            {
                return message.GetString();
            }
        }
        catch (JsonException)
        {
            return null;
        }

        return null;
    }

    private static string CleanPurpose(string purpose)
    {
        var value = string.IsNullOrWhiteSpace(purpose) ? "general" : purpose.Trim().ToLowerInvariant();
        return value switch
        {
            "menu-item" => "menu-items",
            "branch-logo" => "branch-logos",
            "offer" => "offers",
            _ => "general"
        };
    }
}
