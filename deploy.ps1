# deploy.ps1

# --- SETTINGS ---
$AppName = "GameDB"
$EnvName = "GameDB-env"
$Bucket = "elasticbeanstalk-eu-west-2-xxxxx"  # replace with your EB bucket
$ZipName = "gamedb-deploy.zip"
$VersionLabel = "v$(Get-Date -Format yyyyMMddHHmmss)"

Write-Host "==== Building frontend ===="
cd frontend
npm install
npm run build

Write-Host "==== Copying dist to backend ===="
Remove-Item ../backend/dist -Recurse -Force -ErrorAction Ignore
Copy-Item -Recurse dist ../backend/dist

Write-Host "==== Zipping backend (excluding .env) ===="
cd ../backend
Remove-Item ../$ZipName -ErrorAction Ignore

# IMPORTANT:
# - "." includes hidden files (.ebignore)
# - quoted -xr! patterns prevent PowerShell escaping
# - .env and .env.* are excluded
# - node_modules, uploads, dist excluded from backend
& "C:\Program Files\7-Zip\7z.exe" a ../$ZipName "." `
  "-xr!.env" `
  "-xr!.env.*" `
  "-xr!node_modules" `
  "-xr!uploads" `
  "-xr!dist"