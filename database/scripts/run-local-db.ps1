param(
    [string] $Server = "localhost",
    [string] $Database = "Qrave",
    [switch] $UseSqlAuth,
    [string] $User = "",
    [string] $Password = "",
    [switch] $Seed
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")

function Test-SqlCmd {
    $command = Get-Command sqlcmd -ErrorAction SilentlyContinue
    if (-not $command) {
        throw "sqlcmd was not found. Install SQL Server command-line tools, then rerun this script."
    }
}

function Get-BaseArgs {
    $args = @("-S", $Server, "-C", "-b")

    if ($UseSqlAuth) {
        if ([string]::IsNullOrWhiteSpace($User) -or [string]::IsNullOrWhiteSpace($Password)) {
            throw "When -UseSqlAuth is set, both -User and -Password are required."
        }

        $args += @("-U", $User, "-P", $Password)
    }
    else {
        $args += "-E"
    }

    return $args
}

function Invoke-SqlCommand {
    param(
        [string] $Description,
        [string[]] $Arguments
    )

    Write-Host $Description
    & sqlcmd @Arguments

    if ($LASTEXITCODE -ne 0) {
        throw "sqlcmd failed while running: $Description"
    }
}

function Invoke-SqlFile {
    param(
        [string] $Path
    )

    $relative = Resolve-Path $Path -Relative
    $args = @(Get-BaseArgs) + @("-d", $Database, "-i", $Path)
    Invoke-SqlCommand "Applying $relative..." $args
}

Test-SqlCmd

$escapedDatabaseLiteral = $Database.Replace("'", "''")
$escapedDatabaseIdentifier = $Database.Replace("]", "]]")
$createDatabaseSql = "IF DB_ID(N'$escapedDatabaseLiteral') IS NULL CREATE DATABASE [$escapedDatabaseIdentifier];"
Invoke-SqlCommand "Ensuring database '$Database' exists on '$Server'..." (@(Get-BaseArgs) + @("-Q", $createDatabaseSql))

$foundationScripts = @(
    "database\tables\001_Foundation_Tables.sql",
    "database\procedures\001_Foundation_Procedures.sql",
    "database\indexes\001_Foundation_Indexes.sql"
)

foreach ($script in $foundationScripts) {
    Invoke-SqlFile (Join-Path $root $script)
}

$migrationFolder = Join-Path $root "database\migrations"
$migrationScripts = Get-ChildItem -LiteralPath $migrationFolder -Filter "*.sql" |
    Sort-Object Name

foreach ($script in $migrationScripts) {
    Invoke-SqlFile $script.FullName
}

if ($Seed) {
    Invoke-SqlFile (Join-Path $root "database\seeds\001_Demo_Smoke_Data.sql")
}

Write-Host "Database setup completed for '$Database' on '$Server'."
