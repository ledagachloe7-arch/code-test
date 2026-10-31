<?php
/**
 * Script de test : 1) Connexion pour obtenir le token, 2) Recherche change-permis avec le token.
 * Usage : php test_change_permis.php <identifier> <password> [nom] [prenom] [date_naissance] [numero_permis]
 * Ou ajoutez TEST_IDENTIFIER et TEST_PASSWORD dans .env pour éviter de les passer en ligne de commande.
 */

// Charger .env si présent (pour TEST_IDENTIFIER, TEST_PASSWORD)
$envFile = __DIR__ . '/.env';
if (file_exists($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') !== false) {
            [$key, $val] = explode('=', $line, 2);
            $key = trim($key);
            $val = trim($val, " \t\n\r\0\x0B\"'");
            if (!array_key_exists($key, $_ENV)) {
                putenv("$key=$val");
                $_ENV[$key] = $val;
            }
        }
    }
}

$baseUrl = getenv('API_BASE_URL') ?: 'http://127.0.0.1:8000/api';
$identifier = $argv[1] ?? getenv('TEST_IDENTIFIER') ?: null;
$password = $argv[2] ?? getenv('TEST_PASSWORD') ?: null;

if (!$identifier || !$password) {
    echo "Usage: php test_change_permis.php <identifier> <password> [nom] [prenom] [date_naissance] [numero_permis]\n";
    echo "  1. Connexion d'abord pour obtenir le token (obligatoire)\n";
    echo "  2. Recherche avec les paramètres (tous facultatifs : nom, prenom, date_naissance, numero_permis)\n";
    echo "Exemple: php test_change_permis.php agent@test.com MotDePasse123 Dupont Jean 1990-05-15 2010001234\n";
    echo "         (utiliser - pour ignorer un paramètre, ex: - - - 2010001234 pour chercher par numéro seul)\n";
    exit(1);
}

// Paramètres de recherche (tous facultatifs — utiliser - pour ignorer un paramètre)
$raw = fn($i) => trim($argv[$i] ?? '');
$searchParams = array_filter([
    'nom' => in_array($raw(3), ['', '-', '.']) ? '' : $raw(3),
    'prenom' => in_array($raw(4), ['', '-', '.']) ? '' : $raw(4),
    'date_naissance' => in_array($raw(5), ['', '-', '.']) ? '' : $raw(5),
    'numero_permis' => in_array($raw(6), ['', '-', '.']) ? '' : $raw(6),
], fn($v) => $v !== '');

function httpPost($url, $data, $headers = []) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($data),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => array_merge(
            ['Content-Type: application/json', 'Accept: application/json'],
            $headers
        ),
        CURLOPT_TIMEOUT => 15,
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['code' => $httpCode, 'body' => json_decode($response, true) ?? $response];
}

function httpGet($url, $headers = []) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => array_merge(
            ['Accept: application/json'],
            $headers
        ),
        CURLOPT_TIMEOUT => 15,
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['code' => $httpCode, 'body' => json_decode($response, true) ?? $response];
}

echo "=== 1. Connexion ===\n";
$login = httpPost("$baseUrl/auth/login-direct", [
    'identifier' => $identifier,
    'password' => $password,
]);

if ($login['code'] !== 200 || empty($login['body']['access_token'])) {
    echo "Erreur connexion (HTTP {$login['code']}): " . json_encode($login['body'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
    exit(1);
}

$token = $login['body']['access_token'];
echo "Connexion OK. Token obtenu.\n\n";

echo "=== 2. Recherche change-permis (POST, avec token) ===\n";
echo "Critères envoyés: " . (empty($searchParams) ? "(aucun — au moins 1 requis)" : json_encode($searchParams, JSON_UNESCAPED_UNICODE)) . "\n\n";
if (empty($searchParams)) {
    echo "Aucun critère fourni. Fournissez au moins: nom, prenom, date_naissance ou numero_permis.\n";
    exit(1);
}
$search = httpPost("$baseUrl/change-permis", $searchParams, [
    "Authorization: Bearer $token",
]);

echo "HTTP {$search['code']}\n";
echo json_encode($search['body'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";

if ($search['code'] === 200) {
    $count = is_array($search['body']) ? count($search['body']) : 0;
    echo "\n=> {$count} enregistrement(s) trouvé(s).\n";
}
