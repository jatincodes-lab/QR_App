namespace QRApp.Api.Media;

public interface IImageUploadService
{
    Task<MediaUploadResult> UploadAsync(IFormFile file, string purpose, CancellationToken cancellationToken);
}
