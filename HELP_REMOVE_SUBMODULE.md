# Removing submodule `src/backend` and converting it to a normal directory

This repo previously had `src/backend` configured as a Git submodule. To finish converting
it into a normal directory in your local clone, run the following commands in your shell
(PowerShell or Bash) from the repository root.

IMPORTANT: make a backup first (these steps may remove the submodule working copy).

PowerShell (Windows):

```powershell
# Backup current working copy (just in case)
Copy-Item -Recurse -Force .\src\backend ..\backend-backup

# Deinitialize the submodule
git submodule deinit -f -- src/backend

# Remove the submodule entry from the index (this removes the submodule working tree)
git rm -f src/backend

# Remove leftover metadata
Remove-Item -Recurse -Force .git\modules\src\backend

# Restore files from backup (if git rm removed them)
Move-Item ..\backend-backup src\backend

# Stage and commit
git add src/backend
git add .gitmodules
git commit -m "Convert src/backend submodule into normal directory"
git push origin $(git rev-parse --abbrev-ref HEAD)
```

Bash (Linux / Git Bash / macOS):

```bash
# Backup
cp -r src/backend ../backend-backup

# Deinitialize
git submodule deinit -f -- src/backend

# Remove from index
git rm -f src/backend

# Remove metadata
rm -rf .git/modules/src/backend

# Restore files if needed
mv ../backend-backup src/backend

# Stage and commit
git add src/backend
git add .gitmodules
git commit -m "Convert src/backend submodule into normal directory"
git push origin "$(git rev-parse --abbrev-ref HEAD)"
```

Notes:
- If `.gitmodules` is already empty (or removed), `git add .gitmodules` will simply reflect that change in the commit.
- These steps preserve the files currently in `src/backend` but do not import the submodule's history into the main repo.
- If you need the submodule history merged into the main repo, consider using `git subtree` or `git filter-repo` separately.

If you want, I can prepare the commit changes (I already cleared `.gitmodules` in the repository). After you run the commands above locally, push and your repo will have `src/backend` as a normal directory.
