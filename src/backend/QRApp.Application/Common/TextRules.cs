namespace QRApp.Application.Common;

internal static class TextRules
{
    public static string? CleanOptional(string? value)
    {
        var cleaned = value?.Trim();
        return string.IsNullOrWhiteSpace(cleaned) ? null : cleaned;
    }

    public static string CleanRequired(string? value) => value?.Trim() ?? string.Empty;
}
