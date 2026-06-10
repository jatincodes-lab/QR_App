namespace QRApp.Api.Media;

public sealed record MediaUploadResponse(string Url, string PublicId);

public sealed record MediaUploadResult(bool IsSuccess, string? Url, string? PublicId, string? Error);
