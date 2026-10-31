# Script PowerShell pour tester la modification du profil avec un token valide

Write-Host "Test de modification du profil avec token valide" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://127.0.0.1:8001"

# Etape 1: Se connecter pour obtenir un token
Write-Host "1. Connexion pour obtenir un token..." -ForegroundColor Yellow
$loginData = @{
    email = "candidat1@email.com"
    password = "Candidat123!"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/login-direct" -Method POST -Body $loginData -ContentType "application/json" -UseBasicParsing
    $loginResult = $loginResponse.Content | ConvertFrom-Json
    
    if ($loginResult.success -and $loginResult.access_token) {
        $token = $loginResult.access_token
        Write-Host "SUCCES ! Token obtenu: $($token.Substring(0, 20))..." -ForegroundColor Green
        Write-Host "Utilisateur: $($loginResult.user.email)" -ForegroundColor Green
        Write-Host "Role: $($loginResult.user.role)" -ForegroundColor Green
        Write-Host ""
    } else {
        Write-Host "ERREUR lors de la connexion" -ForegroundColor Red
        Write-Host "Response: $($loginResponse.Content)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "ERREUR lors de la connexion: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $errorContent = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorContent)
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error Body: $errorBody" -ForegroundColor Red
    }
    exit 1
}

# Etape 2: Tester la route /auth/me avec le token
Write-Host "2. Test de la route /auth/me avec token..." -ForegroundColor Yellow
$headers = @{
    "Authorization" = "Bearer $token"
}

try {
    $meResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/me" -Headers $headers -UseBasicParsing
    $meResult = $meResponse.Content | ConvertFrom-Json
    
    if ($meResult.success) {
        Write-Host "SUCCES ! Informations utilisateur recuperees" -ForegroundColor Green
        Write-Host "Email: $($meResult.user.email)" -ForegroundColor Green
        Write-Host "Role: $($meResult.user.role)" -ForegroundColor Green
        if ($meResult.user.personne) {
            Write-Host "Nom: $($meResult.user.personne.nom)" -ForegroundColor Green
            Write-Host "Prenom: $($meResult.user.personne.prenom)" -ForegroundColor Green
        }
        Write-Host ""
    } else {
        Write-Host "ERREUR lors de la recuperation des infos utilisateur" -ForegroundColor Red
    }
} catch {
    Write-Host "ERREUR lors de la recuperation des infos utilisateur: $($_.Exception.Message)" -ForegroundColor Red
}

# Etape 3: Tester la modification du profil
Write-Host "3. Test de modification du profil..." -ForegroundColor Yellow
$updateData = @{
    nom = "Dupont"
    prenom = "Jean"
    contact = "0612345678"
    adresse = "123 Rue de Paris"
} | ConvertTo-Json

try {
    $updateResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/update-profile" -Method PUT -Body $updateData -ContentType "application/json" -Headers $headers -UseBasicParsing
    $updateResult = $updateResponse.Content | ConvertFrom-Json
    
    if ($updateResult.success) {
        Write-Host "SUCCES ! Profil modifie avec succes" -ForegroundColor Green
        Write-Host "Message: $($updateResult.message)" -ForegroundColor Green
        Write-Host "Nouveau nom: $($updateResult.user.personne.nom)" -ForegroundColor Green
        Write-Host "Nouveau prenom: $($updateResult.user.personne.prenom)" -ForegroundColor Green
        Write-Host "Nouveau contact: $($updateResult.user.personne.contact)" -ForegroundColor Green
        Write-Host "Nouvelle adresse: $($updateResult.user.personne.adresse)" -ForegroundColor Green
    } else {
        Write-Host "ERREUR lors de la modification du profil" -ForegroundColor Red
        Write-Host "Message: $($updateResult.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "ERREUR lors de la modification du profil: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $errorContent = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorContent)
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error Body: $errorBody" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Test termine !" -ForegroundColor Cyan
