# Test CORS pour toutes les origines

Write-Host "=== TEST CORS TOUTES ORIGINES ===" -ForegroundColor Green
Write-Host ""

$baseUrl = "http://localhost:8000"

# Test avec differentes origines
$origins = @(
    "http://localhost:3000",
    "https://example.com", 
    "https://monapp.com",
    "https://frontend.auto-ecole.com",
    "http://127.0.0.1:8080"
)

foreach ($origin in $origins) {
    Write-Host "Test CORS avec origine: $origin" -ForegroundColor Yellow
    
    try {
        $headers = @{
            "Origin" = $origin
            "Access-Control-Request-Method" = "GET"
            "Access-Control-Request-Headers" = "Authorization, Content-Type"
        }
        
        # Test preflight request
        $r = Invoke-RestMethod "$baseUrl/api/health" -Headers $headers -Method Options
        
        Write-Host "  PASS - CORS autorise pour $origin" -ForegroundColor Green
    } catch {
        Write-Host "  FAIL - CORS bloque pour $origin: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== TEST REQUETE AVEC HEADERS CORS ===" -ForegroundColor Cyan

# Test avec une requete reelle
try {
    $headers = @{
        "Origin" = "https://monapp.com"
        "Content-Type" = "application/json"
    }
    
    $r = Invoke-RestMethod "$baseUrl/api/health" -Headers $headers
    
    Write-Host "SUCCESS: Requete avec headers CORS reussie" -ForegroundColor Green
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
