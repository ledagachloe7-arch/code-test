<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make('Illuminate\\Contracts\\Console\\Kernel');
$kernel->bootstrap();

echo "\n";
echo "╔═══════════════════════════════════════╗\n";
echo "║   TEST DIRECT DU SERVICE AIRTEL SMS   ║\n";
echo "╚═══════════════════════════════════════╝\n";
echo "\n";

// ⚠️ VOTRE NUMÉRO
$phoneNumber = '24177724499';
$message = 'Test SMS Direct depuis PHP - ' . date('H:i:s');

echo "📱 Numéro cible : $phoneNumber\n";
echo "💬 Message : $message\n";
echo "\n";

try {
    echo "🔧 Chargement du service AirtelSmsService...\n";
    $smsService = new \App\Services\AirtelSmsService();
    echo "✅ Service chargé avec succès\n\n";
    
    echo "📤 Envoi du SMS...\n";
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    
    // Activer le mode debug pour voir les détails
    $result = $smsService->send($phoneNumber, $message);
    
    echo "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    
    if ($result) {
        echo "\n✅ SUCCÈS : SMS envoyé !\n";
        echo "\n📱 Vérifiez votre téléphone ($phoneNumber)\n";
    } else {
        echo "\n❌ ÉCHEC : Le SMS n'a pas pu être envoyé\n";
        echo "\n🔍 Détails :\n";
        echo "   - Vérifiez la connexion Internet\n";
        echo "   - Vérifiez que l'API Airtel est accessible\n";
        echo "   - Les identifiants sont corrects dans .env\n";
    }
    
} catch (\Exception $e) {
    echo "\n❌ ERREUR FATALE :\n";
    echo "   Message : " . $e->getMessage() . "\n";
    echo "   Fichier : " . $e->getFile() . "\n";
    echo "   Ligne : " . $e->getLine() . "\n";
    echo "\n";
    echo "📋 Trace complète :\n";
    echo $e->getTraceAsString();
}

echo "\n\n";
echo "═══════════════════════════════════════\n";
echo " Fin du test\n";
echo "═══════════════════════════════════════\n";
echo "\n";

// Vérifier les logs
$logFile = __DIR__ . '/storage/logs/laravel.log';
if (file_exists($logFile)) {
    echo "📋 Logs Laravel disponibles dans :\n";
    echo "   $logFile\n\n";
    
    // Afficher les 20 dernières lignes
    $lines = file($logFile);
    $lastLines = array_slice($lines, -20);
    
    echo "📄 20 dernières lignes des logs :\n";
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    foreach ($lastLines as $line) {
        echo $line;
    }
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
} else {
    echo "⚠️  Fichier de logs Laravel non trouvé\n";
    echo "   Emplacement attendu : $logFile\n";
    echo "   Créez le dossier storage/logs si nécessaire\n";
}

echo "\n";
