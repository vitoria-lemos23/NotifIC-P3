<#
Convert `src/backend` submodule into a normal tracked directory.

Usage (PowerShell):
  Open PowerShell at repository root and run:
    .\scripts\convert_submodule.ps1

The script will:
 - create a timestamped backup of `src/backend` at ../backend-backup-<ts>
 - deinitialize the submodule
 - stage `.gitmodules` changes
 - remove the submodule from the index
 - remove submodule metadata from .git/modules
 - restore files from backup if necessary
 - add `src/backend` as a normal directory, commit and push

Notes:
 - Run this from the git repository root.
 - It attempts to be safe but keep a copy of the backup until you verify the result.
#>

param(
    [switch]$Yes,
    [string]$SubmodulePath = 'src/backend'
)

function Abort($msg){ Write-Host "ERROR: $msg" -ForegroundColor Red; exit 1 }

if (-not (Test-Path .git)) { Abort "This does not look like a repository root (no .git folder found)." }

$ts = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = Join-Path .. "backend-backup-$ts"

Write-Host "Backup will be created at: $backup"
if (-not $Yes) {
    $ok = Read-Host "Proceed with conversion and create backup? (type 'yes' to continue)"
    if ($ok -ne 'yes') { Write-Host 'Aborting.'; exit 0 }
}

try {
    Write-Host 'Creating backup of' $SubmodulePath '...'
    if (Test-Path $SubmodulePath) {
        Copy-Item -Recurse -Force -Path $SubmodulePath -Destination $backup
    } else {
        Write-Host "Warning: $SubmodulePath not found — continuing (nothing to backup)." -ForegroundColor Yellow
    }

    Write-Host 'Deinitializing submodule (git submodule deinit -f --' $SubmodulePath ')'
    git submodule deinit -f -- $SubmodulePath

    Write-Host 'Staging .gitmodules (if changed)'
    git add .gitmodules || Write-Host '.gitmodules not present or unchanged.'

    Write-Host 'Removing submodule from index (git rm -f)'
    git rm -f $SubmodulePath

    $meta = Join-Path '.git\modules' ($SubmodulePath -replace '/','\\')
    if (Test-Path $meta) {
        Write-Host 'Removing submodule metadata at' $meta
        Remove-Item -Recurse -Force $meta
    } else {
        Write-Host 'No submodule metadata folder found at' $meta -ForegroundColor Yellow
    }

    if (-not (Test-Path $SubmodulePath) -and (Test-Path $backup)) {
        Write-Host 'Restoring files from backup to' $SubmodulePath
        Move-Item -Force -Path $backup -Destination $SubmodulePath
    }

    Write-Host 'Adding backend files and .gitmodules to index'
    git add $SubmodulePath
    git add .gitmodules || Write-Host '.gitmodules not present.'

    $branch = git rev-parse --abbrev-ref HEAD
    $msg = "Convert $SubmodulePath submodule into normal directory"
    Write-Host 'Committing changes...'
    git commit -m "$msg"

    Write-Host 'Pushing to origin/' $branch
    git push origin $branch

    Write-Host 'Conversion complete. Keep the backup at:' $backup 'until you verify everything.' -ForegroundColor Green
} catch {
    Write-Host 'An error occurred:' $_.Exception.Message -ForegroundColor Red
    Write-Host 'You may restore from backup:' $backup
    exit 1
}
