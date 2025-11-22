# deploy.ps1

# --- SETTINGS ---
$AppName = "GameDB"
$EnvName = "GameDB-env"
$Bucket = "elasticbeanstalk-eu-west-2-xxxxx"   # replace with your EB bucket
$ZipName = "gamedb-deploy.zip"
$VersionLabel = "v$(Get-Date -Format yyyyMMddHHmmss)"

Write-Host "==== Building frontend ===="
cd frontend
npm install
npm run build

Write-Host "==== Copying dist to backend ===="
Remove-Item ../backend/dist -Recurse -Force -ErrorAction Ignore
Copy-Item -Recurse dist ../backend/dist

Write-Host "==== Creating deployment zip ===="
cd ../backend
Remove-Item ../$ZipName -ErrorAction Ignore

# NOTES:
# - Do NOT exclude backend/dist (we need it for serving the SPA)
# - Exclude backend node_modules
# - Exclude uploads
# - Exclude .env files
# - Exclude frontend node_modules accidentally included by structure

& "C:\Program Files\7-Zip\7z.exe" a ../$ZipName "." `
  "-xr!.env" `
  "-xr!.env.*" `
  "-xr!node_modules" `
  "-xr!uploads" `
  "-xr!..\frontend\node_modules" `
  "-xr!..\frontend\dist" 
