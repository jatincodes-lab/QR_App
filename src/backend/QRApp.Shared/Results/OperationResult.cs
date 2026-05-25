namespace QRApp.Shared.Results;

public sealed record ValidationFailure(string Field, string Message);

public sealed class OperationResult<T>
{
    private OperationResult(T? value, IReadOnlyCollection<ValidationFailure> errors)
    {
        Value = value;
        Errors = errors;
    }

    public T? Value { get; }

    public IReadOnlyCollection<ValidationFailure> Errors { get; }

    public bool IsSuccess => Errors.Count == 0;

    public static OperationResult<T> Success(T value) => new(value, Array.Empty<ValidationFailure>());

    public static OperationResult<T> Failed(params ValidationFailure[] errors) => new(default, errors);
}

