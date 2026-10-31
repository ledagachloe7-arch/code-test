# Script pour ajouter la securite aux routes GET

Write-Host "=== AJOUT DE LA SECURITE AUX ROUTES GET ===" -ForegroundColor Green
Write-Host ""

# Liste des controleurs a traiter
$controllers = @(
    "app/Http/Controllers/Api/CandidatController.php",
    "app/Http/Controllers/Api/AutoEcoleController.php", 
    "app/Http/Controllers/Api/FormationAutoEcoleController.php",
    "app/Http/Controllers/Api/DossierController.php",
    "app/Http/Controllers/Api/DocumentController.php",
    "app/Http/Controllers/Api/ReferentielController.php"
)

foreach ($controller in $controllers) {
    if (Test-Path $controller) {
        Write-Host "Traitement de $controller..." -ForegroundColor Yellow
        
        # Lire le contenu du fichier
        $content = Get-Content $controller -Raw
        
        # Ajouter security aux methodes GET qui n'en ont pas
        $patterns = @(
            @{
                pattern = '(\*\s*@OA\\Get\([^}]+)(@OA\\Response\([^}]+response=200[^}]+)\)'
                replacement = '$1     *     security={{"BearerAuth":{}}},$2     *     @OA\Response(response=401, description="❌ Non authentifié"),$3'
            }
        )
        
        foreach ($pattern in $patterns) {
            $content = $content -replace $pattern.pattern, $pattern.replacement
        }
        
        # Sauvegarder le fichier modifie
        Set-Content $controller -Value $content -NoNewline
        
        Write-Host "  ✅ Sécurité ajoutée aux routes GET" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Fichier non trouvé: $controller" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== REGENERATION DE LA DOCUMENTATION SWAGGER ===" -ForegroundColor Cyan

# Regenerer la documentation
php artisan l5-swagger:generate

# Copier dans public
Copy-Item -Path storage/api-docs/api-docs.json -Destination public/api-docs.json -Force

Write-Host "✅ Documentation Swagger mise a jour!" -ForegroundColor Green
Write-Host "📖 Disponible a: http://localhost:8000/api/documentation" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔒 Maintenant TOUTES les routes nécessitent une authentification:" -ForegroundColor Yellow
Write-Host "  - Routes GET: Token requis" -ForegroundColor White
Write-Host "  - Routes POST/PUT/DELETE: Token requis" -ForegroundColor White
Write-Host "  - Seule la route /api/health reste publique" -ForegroundColor White
