<?php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== TEST DE CONNEXION ET REFRESH TOKEN ===\n";

// Simuler une connexion pour obtenir un refresh token
$authentikService = new \App\Services\AuthentikService();

try {
    echo "1. Tentative de connexion...\n";
    $result = $authentikService->authenticateUserDirect('candidat1@email.com', 'Candidat123!');
    
    if ($result['success']) {
        echo "✅ Connexion réussie !\n";
        echo "Access Token: " . substr($result['tokens']['access_token'], 0, 50) . "...\n";
        echo "Refresh Token: " . substr($result['tokens']['refresh_token'], 0, 50) . "...\n";
        
        // Décoder le refresh token pour vérifier sa structure
        $refreshTokenDecoded = json_decode(base64_decode($result['tokens']['refresh_token']), true);
        echo "\n2. Structure du refresh token:\n";
        echo "Type: " . ($refreshTokenDecoded['type'] ?? 'NOT_SET') . "\n";
        echo "Email: " . ($refreshTokenDecoded['email'] ?? 'NOT_SET') . "\n";
        echo "Exp: " . ($refreshTokenDecoded['exp'] ?? 'NOT_SET') . "\n";
        
        // Tester le refresh token
        echo "\n3. Test du refresh token...\n";
        $refreshResult = $authentikService->refreshAccessToken($result['tokens']['refresh_token']);
        
        if ($refreshResult) {
            echo "✅ Refresh token fonctionne !\n";
            echo "Nouveau Access Token: " . substr($refreshResult['access_token'], 0, 50) . "...\n";
        } else {
            echo "❌ Refresh token échoue\n";
        }
        
    } else {
        echo "❌ Connexion échouée: " . $result['message'] . "\n";
    }
    
} catch (Exception $e) {
    echo "❌ Erreur: " . $e->getMessage() . "\n";
}
