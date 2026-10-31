# Test complet de connexion et refresh token
Write-Host "=== TEST DE CONNEXION ET REFRESH TOKEN ===" -ForegroundColor Green

# 1. Connexion
Write-Host "1. Connexion..." -ForegroundColor Yellow
$loginBody = @{
    email = "candidat1@email.com"
    password = "Candidat123!"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-WebRequest -Uri "http://localhost:8001/api/auth/login-direct" -Method POST -Headers @{"Content-Type"="application/json"} -Body $loginBody
    $loginData = $loginResponse.Content | ConvertFrom-Json
    
    if ($loginData.success) {
        Write-Host "✅ Connexion réussie !" -ForegroundColor Green
        Write-Host "Access Token: $($loginData.access_token.Substring(0,50))..." -ForegroundColor Cyan
        Write-Host "Refresh Token: $($loginData.refresh_token.Substring(0,50))..." -ForegroundColor Cyan
        
        # 2. Test du refresh token
        Write-Host "`n2. Test du refresh token..." -ForegroundColor Yellow
        $refreshBody = @{
            refresh_token = $loginData.refresh_token
        } | ConvertTo-Json
        
        $refreshResponse = Invoke-WebRequest -Uri "http://localhost:8001/api/auth/refresh" -Method POST -Headers @{"Content-Type"="application/json"} -Body $refreshBody
        $refreshData = $refreshResponse.Content | ConvertFrom-Json
        
        if ($refreshData.success) {
            Write-Host "✅ Refresh token fonctionne !" -ForegroundColor Green
            Write-Host "Nouveau Access Token: $($refreshData.access_token.Substring(0,50))..." -ForegroundColor Cyan
        } else {
            Write-Host "❌ Refresh token échoue: $($refreshData.message)" -ForegroundColor Red
        }
        
    } else {
        Write-Host "❌ Connexion échouée: $($loginData.message)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}
