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

# Use a content hash for stylesheet and scripts so mobile browsers do not
# keep using cached assets after a successful GitHub Pages deployment.
$indexPath = Join-Path $publish 'index.html'
$page = [System.IO.File]::ReadAllText($indexPath)
foreach ($relativePath in @('css/style.css', 'js/translations.js', 'js/main.js')) {
  $diskPath = Join-Path $publish ($relativePath.Replace('/', [System.IO.Path]::DirectorySeparatorChar))
  $hash = (Get-FileHash -LiteralPath $diskPath -Algorithm SHA256).Hash.Substring(0, 12).ToLowerInvariant()
  $pattern = '((?:src|href)="' + [regex]::Escape($relativePath) + ')(?:\?v=[^"]*)?(")'
  $replacement = '${1}?v=' + $hash + '${2}'
  $page = [regex]::Replace($page, $pattern, $replacement)
}
[System.IO.File]::WriteAllText($indexPath, $page, [System.Text.UTF8Encoding]::new($false))

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
