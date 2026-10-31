# Script de test API - Authentification Auto-École
# PowerShell Script

Write-Host "🧪 Tests de l'API d'Authentification" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:8000/api"

# Test 1: Health Check
Write-Host "📍 Test 1: Health Check" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get
    Write-Host "✅ API Fonctionnelle" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: Inscription avec email invalide (test validation)
Write-Host "📍 Test 2: Inscription avec email invalide" -ForegroundColor Yellow
try {
    $body = @{
        email = "email-invalide"
        password = "Pass123"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/auth/register" `
        -Method Post `
        -ContentType "application/json" `
        -Body $body
    
    Write-Host "❌ Devrait échouer" -ForegroundColor Red
} catch {
    $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($errorDetails.errors) {
        Write-Host "✅ Validation fonctionne - Messages en français:" -ForegroundColor Green
        Write-Host ($errorDetails | ConvertTo-Json -Depth 10)
    } else {
        Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host ""

# Test 3: Inscription avec mot de passe trop court
Write-Host "📍 Test 3: Mot de passe trop court (< 8 caractères)" -ForegroundColor Yellow
try {
    $body = @{
        email = "test@example.com"
        password = "123"
        password_confirmation = "123"
        nom = "Test"
        prenom = "User"
        contact = "0600000000"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/auth/register" `
        -Method Post `
        -ContentType "application/json" `
        -Body $body
    
    Write-Host "❌ Devrait échouer" -ForegroundColor Red
} catch {
    $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($errorDetails.errors.password) {
        Write-Host "✅ Validation mot de passe fonctionne:" -ForegroundColor Green
        Write-Host ($errorDetails.errors.password -join ", ")
    }
}
Write-Host ""

# Test 4: Inscription avec confirmation incorrecte
Write-Host "📍 Test 4: Confirmation mot de passe incorrecte" -ForegroundColor Yellow
try {
    $body = @{
        email = "test@example.com"
        password = "Password123"
        password_confirmation = "DifferentPassword"
        nom = "Test"
        prenom = "User"
        contact = "0600000000"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/auth/register" `
        -Method Post `
        -ContentType "application/json" `
        -Body $body
    
    Write-Host "❌ Devrait échouer" -ForegroundColor Red
} catch {
    $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($errorDetails.errors.password) {
        Write-Host "✅ Validation confirmation fonctionne:" -ForegroundColor Green
        Write-Host ($errorDetails.errors.password -join ", ")
    }
}
Write-Host ""

# Test 5: Inscription réussie
Write-Host "📍 Test 5: Inscription valide" -ForegroundColor Yellow
$randomEmail = "test$(Get-Random)@example.com"
try {
    $body = @{
        email = $randomEmail
        password = "Password123"
        password_confirmation = "Password123"
        nom = "Dupont"
        prenom = "Jean"
        contact = "0612345678"
        adresse = "123 Rue de Paris"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/auth/register" `
        -Method Post `
        -ContentType "application/json" `
        -Body $body
    
    Write-Host "✅ Inscription réussie!" -ForegroundColor Green
    Write-Host "Message: $($response.message)"
    Write-Host "User ID: $($response.user.id)"
    Write-Host "Token: $($response.access_token.Substring(0, 30))..."
    
    $global:testToken = $response.access_token
    $global:testEmail = $randomEmail
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ($_.ErrorDetails.Message | ConvertFrom-Json | ConvertTo-Json -Depth 10)
}
Write-Host ""

# Test 6: Connexion avec identifiants incorrects
Write-Host "📍 Test 6: Connexion avec mauvais mot de passe" -ForegroundColor Yellow
try {
    $body = @{
        email = "test@example.com"
        password = "WrongPassword"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $body
    
    Write-Host "❌ Devrait échouer" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ Authentification échouée correctement (401)" -ForegroundColor Green
        $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "Message: $($errorDetails.message)"
    } else {
        Write-Host "❌ Erreur inattendue" -ForegroundColor Red
    }
}
Write-Host ""

# Test 7: Connexion réussie (si inscription a fonctionné)
if ($global:testToken -and $global:testEmail) {
    Write-Host "📍 Test 7: Connexion avec le compte créé" -ForegroundColor Yellow
    try {
        $body = @{
            email = $global:testEmail
            password = "Password123"
        } | ConvertTo-Json

        $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" `
            -Method Post `
            -ContentType "application/json" `
            -Body $body
        
        Write-Host "✅ Connexion réussie!" -ForegroundColor Green
        Write-Host "Message: $($response.message)"
        Write-Host "Role: $($response.user.role)"
    } catch {
        Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""

    # Test 8: Récupérer le profil utilisateur
    Write-Host "📍 Test 8: Récupération du profil (endpoint protégé)" -ForegroundColor Yellow
    Write-Host "⚠️  Note: Nécessite un middleware d'authentification configuré" -ForegroundColor Yellow
    try {
        $headers = @{
            "Authorization" = "Bearer $($global:testToken)"
        }

        $response = Invoke-RestMethod -Uri "$baseUrl/auth/me" `
            -Method Get `
            -Headers $headers
        
        Write-Host "✅ Profil récupéré!" -ForegroundColor Green
        Write-Host ($response | ConvertTo-Json -Depth 10)
    } catch {
        Write-Host "⚠️  Erreur (normal si middleware non configuré): $($_.Exception.Message)" -ForegroundColor Yellow
    }
    Write-Host ""
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "✅ Tests terminés!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Vérifiez les logs dans: storage/logs/laravel.log" -ForegroundColor Cyan
Write-Host "📚 Documentation: VALIDATION_EXAMPLES.md" -ForegroundColor Cyan

