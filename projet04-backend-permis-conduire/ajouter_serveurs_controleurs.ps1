# Script pour ajouter les serveurs dans tous les controleurs

Write-Host "=== AJOUT DES SERVEURS DANS TOUS LES CONTROLEURS ===" -ForegroundColor Green
Write-Host ""

# Configuration des serveurs
$serverConfig = @"
/**
 * @OA\Server(
 *     url="http://localhost:8000",
 *     description="Serveur de developpement local"
 * )
 * 
 * @OA\Server(
 *     url="https://9c8r7bbvybn.preview.infomaniak.website",
 *     description="Serveur de production Infomaniak"
 * )
 * 
"@

# Liste des controleurs a traiter
$controllers = @(
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
        
        # Verifier si les serveurs sont deja presents
        if ($content -match "@OA\\Server") {
            Write-Host "  SKIP - Serveurs deja presents" -ForegroundColor Yellow
            continue
        }
        
        # Trouver la premiere annotation @OA\Tag et inserer les serveurs avant
        if ($content -match "(\*\s*@OA\\Tag\()") {
            $content = $content -replace "(\*\s*@OA\\Tag\()", "$serverConfig`$1"
            
            # Sauvegarder le fichier modifie
            Set-Content $controller -Value $content -NoNewline
            
            Write-Host "  ✅ Serveurs ajoutes" -ForegroundColor Green
        } else {
            Write-Host "  ❌ Aucune annotation @OA\Tag trouvee" -ForegroundColor Red
        }
    } else {
        Write-Host "  ❌ Fichier non trouve: $controller" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== REGENERATION DE LA DOCUMENTATION SWAGGER ===" -ForegroundColor Cyan

# Regenerer la documentation
php artisan l5-swagger:generate

# Copier dans public
Copy-Item -Path storage/api-docs/api-docs.json -Destination public/api-docs.json -Force

Write-Host "✅ Documentation Swagger mise a jour avec les serveurs dans tous les controleurs!" -ForegroundColor Green
Write-Host "📖 Disponible a: http://localhost:8000/api/documentation" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 Tous les controleurs ont maintenant:" -ForegroundColor Yellow
Write-Host "  - Serveur de developpement: http://localhost:8000" -ForegroundColor White
Write-Host "  - Serveur de production: https://9c8r7bbvybn.preview.infomaniak.website" -ForegroundColor White
