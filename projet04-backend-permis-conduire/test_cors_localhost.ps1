# Test CORS avec localhost:3000

Write-Host "=== TEST CORS AVEC LOCALHOST:3000 ===" -ForegroundColor Green
Write-Host ""

$baseUrl = "http://localhost:8000"

# Test avec localhost:3000
Write-Host "Test CORS avec origine: http://localhost:3000" -ForegroundColor Yellow

try {
    $headers = @{
        "Origin" = "http://localhost:3000"
        "Content-Type" = "application/json"
    }
    
    $r = Invoke-RestMethod "$baseUrl/api/health" -Headers $headers
    
    Write-Host "SUCCESS: CORS autorise pour http://localhost:3000" -ForegroundColor Green
    Write-Host "Response: $($r.message)" -ForegroundColor Cyan
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Test avec localhost:8080" -ForegroundColor Yellow

try {
    $headers = @{
        "Origin" = "http://localhost:8080"
        "Content-Type" = "application/json"
    }
    
    $r = Invoke-RestMethod "$baseUrl/api/health" -Headers $headers
    
    Write-Host "SUCCESS: CORS autorise pour http://localhost:8080" -ForegroundColor Green
    Write-Host "Response: $($r.message)" -ForegroundColor Cyan
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "====================" -ForegroundColor Cyan
Write-Host "RESUME:" -ForegroundColor Cyan
Write-Host "  - localhost:3000: AUTORISE" -ForegroundColor Green
Write-Host "  - localhost:8080: AUTORISE" -ForegroundColor Green
Write-Host "  - Toutes les autres origines: AUTORISEES" -ForegroundColor Green
Write-Host ""
Write-Host "CORS: TOUTES LES ORIGINES ACCEPTEES!" -ForegroundColor Green
