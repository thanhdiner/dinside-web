param(
  [string]$Message = "chore: update DinSide website"
)

$ErrorActionPreference = 'Stop'
$source = $PSScriptRoot
$publish = Join-Path (Split-Path -Parent $source) 'dinside-web-publish'

if (-not (Test-Path -LiteralPath (Join-Path $publish '.git'))) {
  throw "Publish mirror not found: $publish"
}

# Sync only public website files. Local extension builds, tests, and ZIPs are excluded.
foreach ($name in @('index.html', 'README.md', '.gitignore', 'publish.ps1')) {
  Copy-Item -LiteralPath (Join-Path $source $name) -Destination (Join-Path $publish $name) -Force
}
foreach ($dir in @('assets', 'css', 'js')) {
  & robocopy (Join-Path $source $dir) (Join-Path $publish $dir) /MIR /R:1 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "Failed syncing $dir (robocopy exit $LASTEXITCODE)" }
}

& git -C $publish add --all
if ($LASTEXITCODE -ne 0) { throw 'Git stage failed' }

& git -C $publish diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
  Write-Output 'No website changes to publish.'
  exit 0
}
if ($LASTEXITCODE -ne 1) { throw 'Git diff failed' }

& git -C $publish commit -m $Message
if ($LASTEXITCODE -ne 0) { throw 'Git commit failed' }
& git -C $publish push origin main
if ($LASTEXITCODE -ne 0) { throw 'Git push failed (check GitHub authentication)' }
Write-Output 'Published: https://thanhdiner.github.io/dinside-web/'
