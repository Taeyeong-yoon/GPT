# TSC 바오야 릴리즈 빌드 스크립트
$FlutterExe  = "C:\src\flutter\bin\bin\flutter.bat"
$ApiKeysFile = "C:\Users\User7\Desktop\JLPT\api_keys.json"

Write-Host "=== TSC 바오야 릴리즈 빌드 ===" -ForegroundColor Cyan

if (-not (Test-Path $ApiKeysFile)) { Write-Error "api_keys.json 없음"; exit 1 }
$keys         = Get-Content $ApiKeysFile | ConvertFrom-Json
$openaiKey    = $keys.OPENAI_API_KEY
$googleTtsKey = $keys.GOOGLE_TTS_API_KEY
$sheetsKey    = $keys.GOOGLE_SHEETS_API_KEY
$sheetsId     = "1jtfUtckNAAJJGLCQpUhR-J539Tk0i_OPz-jCV-HT4yY"

if ([string]::IsNullOrEmpty($openaiKey))    { Write-Error "OPENAI_API_KEY 없음"; exit 1 }
if ([string]::IsNullOrEmpty($googleTtsKey)) { Write-Error "GOOGLE_TTS_API_KEY 없음"; exit 1 }
Write-Host "[OK] API 키 로드 완료" -ForegroundColor Green

$googleServices = "android\app\google-services.json"
if (-not (Test-Path $googleServices)) {
    Write-Warning "google-services.json 없음 — Firebase 설정 필요"
    Write-Host "  1. Firebase Console에서 com.baoya.tsc 앱 생성" -ForegroundColor Yellow
    Write-Host "  2. google-services.json → android\app\ 복사" -ForegroundColor Yellow
    exit 1
}

$keyProps = "android\key.properties"
if (-not (Test-Path $keyProps)) {
    @"
storePassword=Necojjang2026!
keyPassword=Necojjang2026!
keyAlias=upload
storeFile=C:/Users/User7/necojjang-upload-key.jks
"@ | Out-File $keyProps -Encoding utf8
    Write-Host "[OK] key.properties 생성됨" -ForegroundColor Yellow
}

$webClientId = "498949682642-2v92ih46029s86dfv8asru57mldglbsa.apps.googleusercontent.com"

Set-Location $PSScriptRoot
Write-Host "빌드 시작..." -ForegroundColor Cyan
& $FlutterExe build appbundle --release `
    "--dart-define=OPENAI_API_KEY=$openaiKey" `
    "--dart-define=GOOGLE_TTS_API_KEY=$googleTtsKey" `
    "--dart-define=GOOGLE_WEB_CLIENT_ID=$webClientId" `
    "--dart-define=GOOGLE_SHEETS_API_KEY=$sheetsKey" `
    "--dart-define=GOOGLE_SHEETS_ID=$sheetsId"

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n=== 빌드 성공! ===" -ForegroundColor Green
    Write-Host "AAB: build\app\outputs\bundle\release\app-release.aab" -ForegroundColor Green
} else {
    Write-Error "빌드 실패 (exit $LASTEXITCODE)"
}
