FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY QRApp.sln ./
COPY src/backend/QRApp.Api/QRApp.Api.csproj src/backend/QRApp.Api/
COPY src/backend/QRApp.Application/QRApp.Application.csproj src/backend/QRApp.Application/
COPY src/backend/QRApp.Domain/QRApp.Domain.csproj src/backend/QRApp.Domain/
COPY src/backend/QRApp.Infrastructure/QRApp.Infrastructure.csproj src/backend/QRApp.Infrastructure/
COPY src/backend/QRApp.Shared/QRApp.Shared.csproj src/backend/QRApp.Shared/
RUN dotnet restore QRApp.sln

COPY . .
RUN dotnet publish src/backend/QRApp.Api/QRApp.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "QRApp.Api.dll"]

