<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "\n================= DIAGNOSTIC DGTT =================\n";
echo "📂 Dossier actuel : " . getcwd() . "\n";
echo "📂 App Path : " . app_path() . "\n";
echo "---------------------------------------------------\n";
echo "🔑 Config 'services.authentik.base_url' : " . var_export(config('services.authentik.base_url'), true) . "\n";
echo "🔑 Env 'AUTHENTIK_BASE_URL' (via helper) : " . var_export(env('AUTHENTIK_BASE_URL'), true) . "\n";
echo "🔑 Env 'AUTHENTIK_BASE_URL' (via getenv) : " . var_export(getenv('AUTHENTIK_BASE_URL'), true) . "\n";
echo "---------------------------------------------------\n";

$servicePath = app_path('Services/AuthentikService.php');
echo "📄 Vérification du fichier : $servicePath\n";

if (file_exists($servicePath)) {
    $content = file_get_contents($servicePath);
    if (strpos($content, 'return null') !== false) {
        echo "✅ SUCCESS: La modification 'return null' EST PRÉSENTE dans le fichier.\n";
    } else {
        echo "❌ FAILURE: La modification 'return null' EST ABSENTE (Ancien code détecté !).\n";
        
        // Chercher l'ancienne chaîne
        if (strpos($content, 'throw new Exception') !== false) {
             echo "⚠️  L'ancien code 'throw new Exception' est toujours là !\n";
        }
    }
} else {
    echo "❌ CRITIQUE : Le fichier Service n'existe pas !\n";
}
echo "===================================================\n";
