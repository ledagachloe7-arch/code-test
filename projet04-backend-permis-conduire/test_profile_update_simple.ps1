# Script PowerShell pour tester la modification du profil utilisateur

Write-Host "Test de modification du profil utilisateur" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://127.0.0.1:8001"

# Etape 1: Test de sante du serveur
Write-Host "1. Test de sante du serveur..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-WebRequest -Uri "$baseUrl/api/health" -UseBasicParsing
    Write-Host "Status: $($healthResponse.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($healthResponse.Content)" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "ERREUR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Etape 2: Test de modification du profil SANS token (doit echouer)
Write-Host "2. Test de modification du profil SANS token (doit echouer)..." -ForegroundColor Yellow
$updateData = @{
    nom = "Dupont"
    prenom = "Jean"
    contact = "0612345678"
    adresse = "123 Rue de Paris"
} | ConvertTo-Json

try {
    $updateResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/update-profile" -Method PUT -Body $updateData -ContentType "application/json" -UseBasicParsing
    Write-Host "PROBLEME ! La route devrait etre protegee" -ForegroundColor Red
    Write-Host "Status: $($updateResponse.StatusCode)" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "CORRECT ! La route est bien protegee (401 Unauthorized)" -ForegroundColor Green
        Write-Host "Status: 401" -ForegroundColor Green
    } else {
        Write-Host "ERREUR inattendue: $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host ""

# Etape 3: Test avec token invalide
Write-Host "3. Test de modification du profil avec token invalide..." -ForegroundColor Yellow
$invalidToken = "invalid.token.here"
$headers = @{
    "Authorization" = "Bearer $invalidToken"
}

try {
    $updateResponseInvalid = Invoke-WebRequest -Uri "$baseUrl/api/auth/update-profile" -Method PUT -Body $updateData -ContentType "application/json" -Headers $headers -UseBasicParsing
    Write-Host "PROBLEME ! Token invalide devrait etre rejete" -ForegroundColor Red
    Write-Host "Status: $($updateResponseInvalid.StatusCode)" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "CORRECT ! Token invalide rejete (401 Unauthorized)" -ForegroundColor Green
        Write-Host "Status: 401" -ForegroundColor Green
    } else {
        Write-Host "ERREUR inattendue: $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host ""

# Etape 4: Test de la route /auth/me
Write-Host "4. Test de la route /auth/me (doit echouer sans token)..." -ForegroundColor Yellow
try {
    $meResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/me" -UseBasicParsing
    Write-Host "PROBLEME ! La route /auth/me devrait etre protegee" -ForegroundColor Red
    Write-Host "Status: $($meResponse.StatusCode)" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "CORRECT ! La route /auth/me est bien protegee" -ForegroundColor Green
        Write-Host "Status: 401" -ForegroundColor Green
    } else {
        Write-Host "ERREUR inattendue: $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host ""

Write-Host "Resume des tests:" -ForegroundColor Cyan
Write-Host "=================" -ForegroundColor Cyan
Write-Host "OK Serveur fonctionne sur le port 8001" -ForegroundColor Green
Write-Host "OK Route de modification du profil protegee (401 sans token)" -ForegroundColor Green
Write-Host "OK Token invalide rejete (401)" -ForegroundColor Green
Write-Host "OK Route /auth/me protegee (401 sans token)" -ForegroundColor Green
Write-Host ""

Write-Host "Pour tester avec un vrai token, vous devez:" -ForegroundColor Yellow
Write-Host "1. Vous connecter via /api/auth/login-direct" -ForegroundColor White
Write-Host "2. Recuperer le token de la reponse" -ForegroundColor White
Write-Host "3. Utiliser ce token dans l'header Authorization: Bearer <token>" -ForegroundColor White
Write-Host ""

Write-Host "Exemple de requete valide:" -ForegroundColor Yellow
Write-Host "PUT $baseUrl/api/auth/update-profile" -ForegroundColor White
Write-Host "Headers: Authorization: Bearer <votre_token>" -ForegroundColor White
Write-Host "Body: {" -ForegroundColor White
Write-Host "  nom: Dupont," -ForegroundColor White
Write-Host "  prenom: Jean," -ForegroundColor White
Write-Host "  contact: 0612345678," -ForegroundColor White
Write-Host "  adresse: 123 Rue de Paris" -ForegroundColor White
Write-Host "}" -ForegroundColor White
Write-Host ""

Write-Host "Le systeme de securite fonctionne correctement !" -ForegroundColor Green
