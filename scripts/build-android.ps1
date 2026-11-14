param(
    [switch]$SkipWebBuild
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repoRoot

function Get-JavaMajorVersion {
    param([string]$JavaExe)

    if (-not (Test-Path -LiteralPath $JavaExe)) {
        return $null
    }

    $previousErrorAction = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $output = & $JavaExe -version 2>&1 | Out-String
    }
    finally {
        $ErrorActionPreference = $previousErrorAction
    }

    if ($output -match 'version "(\d+)') {
        return [int]$matches[1]
    }

    return $null
}

function Find-Jdk21 {
    $candidates = @()

    if ($env:JAVA_HOME) {
        $candidates += $env:JAVA_HOME
    }

    $vendorRoots = @(
        'C:\Program Files\Microsoft',
        'C:\Program Files\Eclipse Adoptium',
        'C:\Program Files\Java',
        'C:\Program Files\Amazon Corretto',
        'C:\Program Files\Zulu'
    )

    foreach ($root in $vendorRoots) {
        if (Test-Path -LiteralPath $root) {
            $candidates += Get-ChildItem -LiteralPath $root -Directory -ErrorAction SilentlyContinue |
                Where-Object { $_.Name -match '21' } |
                ForEach-Object { $_.FullName }
        }
    }

    foreach ($candidate in ($candidates | Select-Object -Unique)) {
        $javaExe = Join-Path $candidate 'bin\java.exe'
        if ((Get-JavaMajorVersion -JavaExe $javaExe) -eq 21) {
            return $candidate
        }
    }

    return $null
}

function Invoke-Checked {
    param(
        [string]$Command,
        [string[]]$Arguments
    )

    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "'$Command $($Arguments -join ' ')' failed with exit code $LASTEXITCODE."
    }
}

$jdkHome = Find-Jdk21
if (-not $jdkHome) {
    throw 'JDK 21 was not found. Capacitor 8 requires JDK 21. Install it, then run this script again.'
}

$env:JAVA_HOME = $jdkHome
$env:Path = "$jdkHome\bin;$env:Path"
Write-Host "Using JDK 21: $jdkHome" -ForegroundColor Cyan

if (-not $SkipWebBuild) {
    Write-Host 'Building web assets for Capacitor...' -ForegroundColor Cyan
    Invoke-Checked -Command 'npm.cmd' -Arguments @('run', 'build:mobile')
}

Write-Host 'Syncing Capacitor Android project...' -ForegroundColor Cyan
Invoke-Checked -Command 'npx.cmd' -Arguments @('cap', 'sync', 'android')

Write-Host 'Assembling debug APK...' -ForegroundColor Cyan
Push-Location -LiteralPath (Join-Path $repoRoot 'android')
try {
    Invoke-Checked -Command '.\gradlew.bat' -Arguments @('assembleDebug')
}
finally {
    Pop-Location
}

$sourceApk = Join-Path $repoRoot 'android\app\build\outputs\apk\debug\app-debug.apk'
if (-not (Test-Path -LiteralPath $sourceApk)) {
    throw "Gradle finished but the APK was not found at $sourceApk."
}

$packageJson = Get-Content -LiteralPath (Join-Path $repoRoot 'package.json') -Raw | ConvertFrom-Json
$outputDir = Join-Path $repoRoot 'artifacts'
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

$destinationApk = Join-Path $outputDir "pocket-eye-$($packageJson.version)-debug.apk"
Copy-Item -LiteralPath $sourceApk -Destination $destinationApk -Force

$apk = Get-Item -LiteralPath $destinationApk
Write-Host ''
Write-Host 'APK ready:' -ForegroundColor Green
Write-Host "  $($apk.FullName)"
Write-Host "  $([math]::Round($apk.Length / 1MB, 2)) MB"
