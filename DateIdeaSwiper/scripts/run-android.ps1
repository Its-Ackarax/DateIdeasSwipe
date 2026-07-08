param(
    [switch]$UseShortPath
)

$ErrorActionPreference = "Stop"

function Test-IsReparsePoint {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        return $false
    }

    $item = Get-Item $Path -Force
    return [bool]($item.Attributes -band [IO.FileAttributes]::ReparsePoint)
}

function Remove-ReparsePointIfPresent {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        return
    }

    $item = Get-Item $Path -Force
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
        Write-Host "Removing reparse point at $Path"
        cmd /c "rmdir `"$Path`""
    }
}

function Find-Jdk17Home {
    $candidates = @(
        (Get-ChildItem "C:\Program Files\Eclipse Adoptium\jdk-17*" -Directory -ErrorAction SilentlyContinue |
            Sort-Object Name -Descending |
            Select-Object -First 1 -ExpandProperty FullName),
        "C:\Program Files\Android\Android Studio\jbr",
        (Get-ChildItem "C:\Program Files\Microsoft\jdk-17*" -Directory -ErrorAction SilentlyContinue |
            Sort-Object Name -Descending |
            Select-Object -First 1 -ExpandProperty FullName)
    ) | Where-Object { $_ -and (Test-Path (Join-Path $_ "bin\java.exe")) }

    foreach ($candidate in $candidates) {
        $previousErrorAction = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        $versionOutput = & (Join-Path $candidate "bin\java.exe") -version 2>&1 | Out-String
        $ErrorActionPreference = $previousErrorAction
        if ($versionOutput -match 'version "17') {
            return $candidate
        }
    }

    return $null
}

$jdk17Home = Find-Jdk17Home
if (-not $jdk17Home) {
    Write-Error @"
JDK 17 is required for Android builds (JDK 25 is not supported by Gradle 8.x).

Install Temurin 17:
  winget install EclipseAdoptium.Temurin.17.JDK
"@
}

$env:JAVA_HOME = $jdk17Home
$env:Path = "$jdk17Home\bin;$env:Path"

$gradleHome = "C:\gradle"
if (-not (Test-Path $gradleHome)) {
    New-Item -ItemType Directory -Path $gradleHome | Out-Null
}
$env:GRADLE_USER_HOME = $gradleHome

$tempHome = "C:\tmp"
if (-not (Test-Path $tempHome)) {
    New-Item -ItemType Directory -Path $tempHome | Out-Null
}
$env:TEMP = $tempHome
$env:TMP = $tempHome

Write-Host "Using JAVA_HOME=$env:JAVA_HOME"
Write-Host "Using GRADLE_USER_HOME=$env:GRADLE_USER_HOME"
$previousErrorAction = $ErrorActionPreference
$ErrorActionPreference = "Continue"
& java -version 2>&1 | ForEach-Object { Write-Host $_ }
$ErrorActionPreference = $previousErrorAction

$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$buildRoot = $projectRoot
$shortRoot = "C:\dis"

if ($UseShortPath -or $projectRoot.Length -gt 50) {
    $shortResolved = if (Test-Path $shortRoot) { [IO.Path]::GetFullPath($shortRoot) } else { $null }

    if ((Test-IsReparsePoint $shortRoot) -or ($shortResolved -and ($shortResolved -eq $projectRoot))) {
        Write-Host "Removing $shortRoot because it points at the project directory..."
        cmd /c "rmdir `"$shortRoot`""
        if (Test-Path $shortRoot) {
            $shortRoot = "C:\fw"
            Write-Host "Falling back to alternate short path: $shortRoot"
        }
    }

    if (-not (Test-Path $shortRoot)) {
        New-Item -ItemType Directory -Path $shortRoot | Out-Null
    }

    Write-Host "Syncing project to short path: $shortRoot"
    robocopy $projectRoot $shortRoot /E /XD node_modules android ios .expo .git android\.gradle android\build android\.cxx android\app\build android\app\.cxx /XF *.apk /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
    $buildRoot = $shortRoot

    Remove-ReparsePointIfPresent -Path (Join-Path $shortRoot "node_modules")
    Remove-ReparsePointIfPresent -Path (Join-Path $shortRoot "android")
    Remove-ReparsePointIfPresent -Path (Join-Path $shortRoot "ios")
}

Set-Location $buildRoot

if (-not (Test-Path "node_modules") -or $buildRoot -eq $shortRoot) {
    Write-Host "Installing dependencies in $buildRoot..."
    npm install
}

npx expo run:android @args
