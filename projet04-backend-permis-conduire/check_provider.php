<?php

echo "🔍 Vérification du Provider Authentik\n";
echo "==================================\n\n";

$baseUrl = "http://5.189.156.115:31015";
$clientId = "JpMm7W7oeisa2EWDsfxyX0xNoF9SEYlOnKDfGxu2";

// Lire le token API depuis .env
$envFile = __DIR__ . '/.env';
$apiToken = '';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, 'AUTHENTIK_API_TOKEN=') === 0) {
            $apiToken = substr($line, strlen('AUTHENTIK_API_TOKEN='));
            break;
        }
    }
}

if (empty($apiToken)) {
    echo "❌ Token API non trouvé\n";
    exit(1);
}

// 1. Vérifier la configuration OpenID
echo "📋 Configuration OpenID :\n";
echo "------------------------\n";

$wellKnownUrl = "$baseUrl/application/o/permis/.well-known/openid_configuration";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $wellKnownUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "URL: $wellKnownUrl\n";
echo "HTTP Code: $httpCode\n";

if ($httpCode == 200) {
    $config = json_decode($response, true);
    echo "✅ Configuration OpenID récupérée\n";
    echo "Grant types supportés: " . implode(', ', $config['grant_types_supported'] ?? []) . "\n";
    echo "Scopes supportés: " . implode(', ', $config['scopes_supported'] ?? []) . "\n";
    
    if (in_array('password', $config['grant_types_supported'] ?? [])) {
        echo "✅ Password Grant est activé\n";
    } else {
        echo "❌ Password Grant N'EST PAS activé !\n";
        echo "→ Allez dans Authentik → Providers → Éditer votre Provider\n";
        echo "→ Cochez 'Resource Owner Password Credentials'\n";
    }
} else {
    echo "❌ Impossible de récupérer la configuration OpenID\n";
    echo "Réponse: $response\n";
}

echo "\n";

// 2. Vérifier le Provider via l'API
echo "📋 Détails du Provider :\n";
echo "------------------------\n";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "$baseUrl/api/v3/providers/oauth2/?client_id=$clientId");
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $apiToken
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$providers = json_decode($response, true);
curl_close($ch);

echo "HTTP Code: $httpCode\n";

if ($httpCode == 200 && !empty($providers['results'])) {
    $provider = $providers['results'][0];
    echo "✅ Provider trouvé\n";
    echo "Name: {$provider['name']}\n";
    echo "Client Type: {$provider['client_type']}\n";
    echo "Authorization Flow: " . (is_array($provider['authorization_flow'] ?? null) ? implode(', ', $provider['authorization_flow']) : $provider['authorization_flow'] ?? 'N/A') . "\n";
    
    // Vérifier si password est dans authorization_flow
    $hasPassword = false;
    if (isset($provider['authorization_flow'])) {
        foreach ($provider['authorization_flow'] as $flow) {
            if (strpos($flow, 'password') !== false) {
                $hasPassword = true;
                break;
            }
        }
    }
    
    if ($hasPassword) {
        echo "✅ Password Grant est configuré dans le Provider\n";
    } else {
        echo "❌ Password Grant N'EST PAS configuré dans le Provider !\n";
        echo "→ Éditez le Provider et cochez 'Resource Owner Password Credentials'\n";
    }
} else {
    echo "❌ Provider non trouvé ou erreur API\n";
    echo "Réponse: $response\n";
}

echo "\n";

// 3. Test avec différents scopes
echo "🧪 Test avec différents scopes :\n";
echo "--------------------------------\n";

$scopes = [
    'openid',
    'openid email',
    'openid email profile',
    'openid email profile offline_access',
    'openid email profile offline_access goauthentik.io/api'
];

$email = "candidat@test.com";
$password = "Password123!";

// Lire le client secret
$clientSecret = '';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, 'AUTHENTIK_CLIENT_SECRET=') === 0) {
            $clientSecret = substr($line, strlen('AUTHENTIK_CLIENT_SECRET='));
            break;
        }
    }
}

foreach ($scopes as $scope) {
    echo "Test avec scope: '$scope'\n";
    
    $postData = http_build_query([
        'grant_type' => 'password',
        'username' => $email,
        'password' => $password,
        'scope' => $scope
    ]);
    
    $auth = base64_encode($clientId . ':' . $clientSecret);
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "$baseUrl/application/o/token/");
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Basic ' . $auth,
        'Content-Type: application/x-www-form-urlencoded'
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    echo "  HTTP Code: $httpCode\n";
    
    if ($httpCode == 200) {
        echo "  ✅ SUCCÈS avec ce scope !\n";
        $data = json_decode($response, true);
        if (isset($data['access_token'])) {
            echo "  Access Token: " . substr($data['access_token'], 0, 20) . "...\n";
        }
        break;
    } else {
        $data = json_decode($response, true);
        if (isset($data['error'])) {
            echo "  ❌ Erreur: {$data['error']}\n";
        }
    }
    echo "\n";
}

echo "🎯 RÉSUMÉ :\n";
echo "===========\n";
echo "Si tous les tests échouent avec 'invalid_grant':\n";
echo "1. Vérifiez que 'Resource Owner Password Credentials' est coché dans le Provider\n";
echo "2. Vérifiez que l'utilisateur est actif dans Authentik\n";
echo "3. Vérifiez que le mot de passe est correct\n";
echo "4. Essayez de créer un nouvel utilisateur via l'interface Authentik\n";

?>
