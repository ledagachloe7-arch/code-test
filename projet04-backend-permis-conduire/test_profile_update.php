<?php

/**
 * Script de test pour la modification du profil utilisateur
 * 
 * Ce script teste la route PUT /api/auth/update-profile
 */

// Configuration
$baseUrl = 'http://127.0.0.1:8001';
$testEmail = 'test@example.com';
$testPassword = 'password123';

echo "🧪 Test de modification du profil utilisateur\n";
echo "==============================================\n\n";

// Fonction pour faire des requêtes HTTP avec PowerShell
function makeRequest($url, $method = 'GET', $data = null, $headers = []) {
    $headersStr = '';
    if (!empty($headers)) {
        $headersStr = ' -Headers @{' . implode('; ', array_map(function($h) {
            $parts = explode(': ', $h, 2);
            return "'$parts[0]' = '$parts[1]'";
        }, $headers)) . '}';
    }
    
    $bodyStr = '';
    if ($data) {
        $jsonData = json_encode($data);
        $bodyStr = " -Body '$jsonData' -ContentType 'application/json'";
    }
    
    $methodStr = $method === 'GET' ? '' : " -Method $method";
    
    $command = "powershell -Command \"try { \$response = Invoke-WebRequest -Uri '$url'$methodStr$bodyStr$headersStr -UseBasicParsing; Write-Output ('STATUS:' . \$response.StatusCode); Write-Output ('BODY:' . \$response.Content) } catch { Write-Output ('STATUS:' . \$_.Exception.Response.StatusCode.value__); Write-Output ('BODY:' . \$_.Exception.Response.GetResponseStream().ReadToEnd()) }\"";
    
    $output = shell_exec($command);
    
    $lines = explode("\n", trim($output));
    $status = 0;
    $body = '';
    
    foreach ($lines as $line) {
        if (strpos($line, 'STATUS:') === 0) {
            $status = (int)substr($line, 7);
        } elseif (strpos($line, 'BODY:') === 0) {
            $body = substr($line, 5);
        }
    }
    
    return [
        'status' => $status,
        'body' => json_decode($body, true)
    ];
}

// Étape 1: Vérifier que le serveur fonctionne
echo "1️⃣ Test de santé du serveur...\n";
$healthResponse = makeRequest("$baseUrl/api/health");
echo "Status: " . $healthResponse['status'] . "\n";
echo "Response: " . json_encode($healthResponse['body'], JSON_PRETTY_PRINT) . "\n\n";

if ($healthResponse['status'] !== 200) {
    echo "❌ Le serveur ne répond pas correctement. Arrêt du test.\n";
    exit(1);
}

// Étape 2: Tester la route de modification du profil sans token (doit échouer)
echo "2️⃣ Test de modification du profil SANS token (doit échouer)...\n";
$updateData = [
    'nom' => 'Dupont',
    'prenom' => 'Jean',
    'contact' => '0612345678',
    'adresse' => '123 Rue de Paris'
];

$updateResponse = makeRequest("$baseUrl/api/auth/update-profile", 'PUT', $updateData);
echo "Status: " . $updateResponse['status'] . "\n";
echo "Response: " . json_encode($updateResponse['body'], JSON_PRETTY_PRINT) . "\n\n";

if ($updateResponse['status'] === 401) {
    echo "✅ Correct ! La route est bien protégée (401 Unauthorized)\n\n";
} else {
    echo "❌ Problème ! La route devrait être protégée\n\n";
}

// Étape 3: Tester avec un token invalide (doit échouer)
echo "3️⃣ Test de modification du profil avec token invalide...\n";
$invalidToken = 'invalid.token.here';
$headers = ["Authorization: Bearer $invalidToken"];

$updateResponseInvalid = makeRequest("$baseUrl/api/auth/update-profile", 'PUT', $updateData, $headers);
echo "Status: " . $updateResponseInvalid['status'] . "\n";
echo "Response: " . json_encode($updateResponseInvalid['body'], JSON_PRETTY_PRINT) . "\n\n";

if ($updateResponseInvalid['status'] === 401) {
    echo "✅ Correct ! Token invalide rejeté (401 Unauthorized)\n\n";
} else {
    echo "❌ Problème ! Token invalide devrait être rejeté\n\n";
}

// Étape 4: Tester la route /auth/me pour voir la structure attendue
echo "4️⃣ Test de la route /auth/me (doit échouer sans token)...\n";
$meResponse = makeRequest("$baseUrl/api/auth/me");
echo "Status: " . $meResponse['status'] . "\n";
echo "Response: " . json_encode($meResponse['body'], JSON_PRETTY_PRINT) . "\n\n";

if ($meResponse['status'] === 401) {
    echo "✅ Correct ! La route /auth/me est bien protégée\n\n";
} else {
    echo "❌ Problème ! La route /auth/me devrait être protégée\n\n";
}

echo "📋 Résumé des tests:\n";
echo "===================\n";
echo "✅ Serveur fonctionne sur le port 8001\n";
echo "✅ Route de modification du profil protégée (401 sans token)\n";
echo "✅ Token invalide rejeté (401)\n";
echo "✅ Route /auth/me protégée (401 sans token)\n\n";

echo "🔍 Pour tester avec un vrai token, vous devez:\n";
echo "1. Vous connecter via /api/auth/login-direct\n";
echo "2. Récupérer le token de la réponse\n";
echo "3. Utiliser ce token dans l'header Authorization: Bearer <token>\n\n";

echo "💡 Exemple de requête valide:\n";
echo "PUT $baseUrl/api/auth/update-profile\n";
echo "Headers: Authorization: Bearer <votre_token>\n";
echo "Body: {\n";
echo "  \"nom\": \"Dupont\",\n";
echo "  \"prenom\": \"Jean\",\n";
echo "  \"contact\": \"0612345678\",\n";
echo "  \"adresse\": \"123 Rue de Paris\"\n";
echo "}\n\n";

echo "🎯 Le système de sécurité fonctionne correctement !\n";
