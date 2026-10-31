# Connexion + upload document pour un dossier (utilisateur ROLE_CANDIDAT)
$ErrorActionPreference = "Stop"
$baseUrl = "http://127.0.0.1:8000/api"

# 1. Login avec le nouveau candidat (créé via php artisan app:create-test-candidat)
$loginBody = '{"identifier":"nouveau.candidat@test.com","password":"Candidat123!"}'
$loginResp = Invoke-RestMethod -Uri "$baseUrl/auth/login-direct" -Method Post -ContentType "application/json" -Body $loginBody
$token = $loginResp.access_token
Write-Host "Login OK (candidat: $($loginResp.user.email), role: $($loginResp.user.role))"

# 2. Mes dossiers du candidat (seulement les siens)
$headers = @{ "Authorization" = "Bearer $token"; "Accept" = "application/json" }
$mesDossiers = Invoke-RestMethod -Uri "$baseUrl/candidats/mes-dossiers" -Method Get -Headers $headers
if (-not $mesDossiers.dossiers -or $mesDossiers.dossiers.Count -eq 0) {
    Write-Host "Aucun dossier pour ce candidat - impossible d'uploader (403 si on utilise un autre dossier)."
    exit 1
}
$dossierId = $mesDossiers.dossiers[0].id
Write-Host "Dossier ID: $dossierId"

# 3. Type document (referentiel) - ID depuis la BDD
$typeDocumentId = "019c22b1-a567-71d5-a31c-e00062ffda14"

# 4. Fichier minimal : petit PNG 1x1 (bytes valides)
$pngBytes = [byte[]](0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A,0x00,0x00,0x00,0x0D,0x49,0x48,0x44,0x52,0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x01,0x08,0x02,0x00,0x00,0x00,0x90,0x77,0x53,0xDE,0x00,0x00,0x00,0x0C,0x49,0x44,0x41,0x54,0x08,0xD7,0x63,0xF8,0xFF,0xFF,0x3F,0x00,0x05,0xFE,0x02,0xFE,0xDC,0xCC,0x59,0xE7,0x00,0x00,0x00,0x00,0x49,0x45,0x4E,0x44,0xAE,0x42,0x60,0x82)
$tempFile = [System.IO.Path]::GetTempFileName() + ".png"
[System.IO.File]::WriteAllBytes($tempFile, $pngBytes)
Write-Host "Fichier temporaire: $tempFile"

# 5. Upload multipart avec curl
$uri = "$baseUrl/dossiers/$dossierId/upload-document"
try {
    $curlArgs = @(
        "-s", "-w", "`n%{http_code}",
        "-X", "POST",
        "-H", "Authorization: Bearer $token",
        "-H", "Accept: application/json",
        "-F", "type_document_id=$typeDocumentId",
        "-F", "fichier=@$tempFile",
        $uri
    )
    $curlOut = & curl.exe $curlArgs 2>&1
    $lines = $curlOut -split "`n"
    $body = $lines[0..($lines.Length-2)] -join "`n"
    $code = $lines[-1]
    Write-Host "HTTP $code"
    Write-Host $body
    if ($code -match "^(201|200)$") { Write-Host "SUCCESS: upload OK" } else { Write-Host "ERREUR: upload echoue" }
} catch {
    Write-Host "ERREUR: $($_.Exception.Message)"
}
Remove-Item -Path $tempFile -ErrorAction SilentlyContinue
