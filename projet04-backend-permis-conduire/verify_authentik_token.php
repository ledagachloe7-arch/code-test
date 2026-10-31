<?php

/**
 * Script de vérification du Token API Authentik
 * 
 * Usage: php verify_authentik_token.php
 */

require __DIR__ . '/vendor/autoload.php';

use GuzzleHttp\Client;

// Charger les variables d'environnement
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

$baseUrl = rtrim($_ENV['AUTHENTIK_BASE_URL'] ?? '', '/');
$apiToken = $_ENV['AUTHENTIK_API_TOKEN'] ?? '';

echo "🔍 Vérification du Token API Authentik\n";
echo "=====================================\n\n";

// Vérifier les variables
echo "📋 Configuration :\n";
echo "   Base URL: {$baseUrl}\n";
echo "   Token: " . (strlen($apiToken) > 10 ? substr($apiToken, 0, 10) . '...' : 'NON CONFIGURÉ') . "\n\n";

if (empty($baseUrl) || empty($apiToken)) {
    echo "❌ Erreur : AUTHENTIK_BASE_URL ou AUTHENTIK_API_TOKEN non configurés dans .env\n";
    exit(1);
}

$client = new Client([
    'base_uri' => $baseUrl,
    'headers' => [
        'Authorization' => 'Bearer ' . $apiToken,
        'Content-Type' => 'application/json',
    ],
    'verify' => false,
]);

// Test 1 : Vérifier le token
echo "📍 Test 1 : Vérifier le token API\n";
try {
    $response = $client->get('/api/v3/core/users/', [
        'query' => ['page_size' => 1]
    ]);
    
    if ($response->getStatusCode() === 200) {
        echo "   ✅ Token valide ! Connexion à l'API réussie.\n\n";
    }
} catch (Exception $e) {
    if (strpos($e->getMessage(), '403') !== false) {
        echo "   ❌ Token INVALIDE ! Erreur 403 Forbidden\n";
        echo "   → Créez un nouveau token dans Authentik\n";
        echo "   → Voir: CREER_TOKEN_API_AUTHENTIK.md\n\n";
        exit(1);
    } else {
        echo "   ❌ Erreur : " . $e->getMessage() . "\n\n";
        exit(1);
    }
}

// Test 2 : Lister les utilisateurs
echo "📍 Test 2 : Lister les utilisateurs Authentik\n";
try {
    $response = $client->get('/api/v3/core/users/', [
        'query' => ['page_size' => 5]
    ]);
    
    $data = json_decode($response->getBody()->getContents(), true);
    $count = $data['pagination']['count'] ?? 0;
    
    echo "   ✅ Nombre d'utilisateurs : {$count}\n";
    
    if (isset($data['results']) && count($data['results']) > 0) {
        echo "   📋 Utilisateurs trouvés :\n";
        foreach ($data['results'] as $user) {
            $groups = $user['groups_obj'] ?? [];
            $groupNames = array_map(fn($g) => $g['name'], $groups);
            echo "      - {$user['email']} → Groupes: [" . implode(', ', $groupNames) . "]\n";
        }
    }
    echo "\n";
} catch (Exception $e) {
    echo "   ❌ Erreur : " . $e->getMessage() . "\n\n";
}

// Test 3 : Lister les groupes
echo "📍 Test 3 : Lister les groupes Authentik\n";
try {
    $response = $client->get('/api/v3/core/groups/');
    $data = json_decode($response->getBody()->getContents(), true);
    $count = $data['pagination']['count'] ?? 0;
    
    echo "   ✅ Nombre de groupes : {$count}\n";
    
    if (isset($data['results']) && count($data['results']) > 0) {
        echo "   📋 Groupes trouvés :\n";
        foreach ($data['results'] as $group) {
            $userCount = $group['users_obj'] ? count($group['users_obj']) : 0;
            echo "      - {$group['name']} ({$userCount} membres)\n";
        }
    } else {
        echo "   ⚠️  Aucun groupe trouvé. Les groupes seront créés automatiquement lors de l'inscription.\n";
    }
    echo "\n";
} catch (Exception $e) {
    echo "   ❌ Erreur : " . $e->getMessage() . "\n\n";
}

// Test 4 : Permissions
echo "📍 Test 4 : Vérifier les permissions\n";
$permissions = [
    'Lire utilisateurs' => ['GET', '/api/v3/core/users/'],
    'Créer utilisateur' => ['POST', '/api/v3/core/users/', ['json' => ['username' => 'test_permission', 'email' => 'test@test.com']]],
    'Lire groupes' => ['GET', '/api/v3/core/groups/'],
];

foreach ($permissions as $name => $config) {
    try {
        $method = $config[0];
        $endpoint = $config[1];
        $options = $config[2] ?? [];
        
        if ($method === 'POST') {
            // Juste tester sans créer vraiment
            echo "   ⚠️  {$name} : Test skip (éviter création)\n";
        } else {
            $response = $client->request($method, $endpoint, $options);
            echo "   ✅ {$name} : OK\n";
        }
    } catch (Exception $e) {
        if (strpos($e->getMessage(), '403') !== false) {
            echo "   ❌ {$name} : PERMISSION REFUSÉE\n";
        } else {
            echo "   ⚠️  {$name} : " . substr($e->getMessage(), 0, 50) . "...\n";
        }
    }
}
echo "\n";

echo "=====================================\n";
echo "✅ Vérification terminée !\n\n";

echo "📝 Prochaines étapes :\n";
echo "   1. Si le token est valide : Testez l'inscription\n";
echo "   2. Si erreur 403 : Créez un nouveau token (voir CREER_TOKEN_API_AUTHENTIK.md)\n";
echo "   3. Après inscription : Vérifiez les groupes dans Authentik\n\n";

