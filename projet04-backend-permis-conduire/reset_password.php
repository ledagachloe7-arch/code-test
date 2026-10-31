<?php

echo "🔑 Réinitialisation du mot de passe Authentik\n";
echo "==========================================\n\n";

$baseUrl = "http://5.189.156.115:31015";
$email = "candidat@test.com";
$newPassword = "Password123!";

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

// 1. Trouver l'utilisateur
echo "🔍 Recherche de l'utilisateur: $email\n";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "$baseUrl/api/v3/core/users/?email=$email");
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $apiToken
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$users = json_decode($response, true);
curl_close($ch);

if (empty($users['results'])) {
    echo "❌ Utilisateur non trouvé\n";
    exit(1);
}

$user = $users['results'][0];
$userId = $user['pk'];
echo "✅ Utilisateur trouvé: {$user['name']} (ID: $userId)\n";
echo "Username: {$user['username']}\n";
echo "Email: {$user['email']}\n";
echo "Is Active: " . ($user['is_active'] ? 'Oui' : 'Non') . "\n\n";

// 2. Réinitialiser le mot de passe
echo "🔄 Réinitialisation du mot de passe...\n";

$passwordData = [
    'password' => $newPassword
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "$baseUrl/api/v3/core/users/$userId/set_password/");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($passwordData));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $apiToken,
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Réponse HTTP: $httpCode\n";

if ($httpCode == 204) {
    echo "✅ Mot de passe réinitialisé avec succès !\n";
    echo "\n🎉 SUCCÈS !\n";
    echo "===========\n";
    echo "Email: $email\n";
    echo "Nouveau mot de passe: $newPassword\n";
    echo "\nVous pouvez maintenant tester la connexion !\n";
} else {
    echo "❌ Erreur réinitialisation: $httpCode\n";
    echo "Réponse: $response\n";
}

?>
