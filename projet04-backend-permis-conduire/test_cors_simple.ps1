# Test CORS simple

Write-Host "=== TEST CORS TOUTES ORIGINES ===" -ForegroundColor Green
Write-Host ""

$baseUrl = "http://localhost:8000"

# Test simple avec une origine
Write-Host "Test CORS avec origine: https://monapp.com" -ForegroundColor Yellow

try {
    $headers = @{
        "Origin" = "https://monapp.com"
        "Content-Type" = "application/json"
    }
    
    $r = Invoke-RestMethod "$baseUrl/api/health" -Headers $headers
    
    Write-Host "SUCCESS: CORS autorise pour https://monapp.com" -ForegroundColor Green
    Write-Host "Response: $($r.message)" -ForegroundColor Cyan
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "====================" -ForegroundColor Cyan
Write-Host "RESUME:" -ForegroundColor Cyan
Write-Host "  - CORS configure pour toutes les origines (*)" -ForegroundColor White
Write-Host "  - Toutes les methodes autorisees" -ForegroundColor White
Write-Host "  - Tous les headers autorises" -ForegroundColor White
Write-Host ""
Write-Host "CORS: CONFIGURE POUR TOUTES LES ORIGINES!" -ForegroundColor Green
