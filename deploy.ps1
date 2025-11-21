# deploy.ps1

# --- SETTINGS ---
$AppName = "GameDB"
$EnvName = "GameDB-env"
$Bucket = "elasticbeanstalk-eu-west-2-xxxxx"  # Replace with your actual EB S3 bucket
$ZipName = "gamedb-deploy.zip"
$VersionLabel = "v$(Get-Date -Format yyyyMMddHHmmss)"

Write-Host "==== Building frontend ===="
cd frontend
npm install
npm run build

Write-Host "==== Copying dist to backend ===="
Remove-Item ../backend/dist -Recurse -Force -ErrorAction Ignore
Copy-Item -Recurse dist ../backend/dist

Write-Host "==== Zipping backend ===="
cd ../backend
Remove-Item ../$ZipName -ErrorAction Ignore
& "C:\Program Files\7-Zip\7z.exe" a ../$ZipName *

Write-Host "==== Uploading to S3 and deploying ===="
cd ..
aws s3 cp $ZipName s3://$Bucket/$ZipName

aws elasticbeanstalk create-application-version `
  --application-name $AppName `
  --version-label $VersionLabel `
  --source-bundle S3Bucket=$Bucket,S3Key=$ZipName

aws elasticbeanstalk update-environment `
  --environment-name $EnvName `
  --version-label $VersionLabel
