# NouMatch Release Workflow

Always ship with this order:

1. Work on `staging` first.
2. Validate on `staging.noumatch.com`.
3. Merge `staging` into `main`.
4. Push both `staging` and `main`.
5. Deploy `main` to production (`noumatch.com`).

## Recommended Git Commands

```powershell
# From repo root
git checkout staging
git pull origin staging

# make changes...
git add -A
git commit -m "your change"
git push origin staging

# merge staging -> main
git checkout main
git pull origin main
git merge --no-ff staging -m "Merge staging into main"
git push origin main

# sync staging with main merge commit
git checkout staging
git merge --no-ff main -m "Merge main back into staging"
git push origin staging
```

## Release Safety Checks

Run before merging to `main`:

```powershell
# backend
cd api
..\venv\Scripts\python.exe manage.py check

# frontend
cd ..\frontend
npm run build -- --mode production
```
