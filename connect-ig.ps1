param (
    [Parameter(Mandatory=$true)]
    [string]$AccessToken
)

$body = @{
    ig_user_id = "17841480487139811"
    username = "omnisync.life"
    page_id = "1094388863750852"
    page_access_token = $AccessToken
    is_active = $true
} | ConvertTo-Json -Compress

Write-Host "Token sunucuya gonderiliyor..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Method POST `
        -Uri "http://localhost:8000/api/v1/instagram/manual-connect" `
        -ContentType "application/json" `
        -Body $body

    Write-Host "Basarili!" -ForegroundColor Green
    Write-Host "Hesap: $($response.account.username) (Durum: $($response.account.is_active))"
} catch {
    Write-Host "Bir hata olustu: $_" -ForegroundColor Red
}
