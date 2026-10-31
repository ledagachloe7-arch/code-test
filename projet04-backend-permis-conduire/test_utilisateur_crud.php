<?php

/**
 * Script de test : CRUD utilisateur via API.
 * 1) login-direct -> token
 * 2) GET /utilisateurs/candidats -> récupérer 2 ids
 * 3) PUT /utilisateurs/{id} -> modifier telephone
 * 4) DELETE /utilisateurs/{id2} -> supprimer un autre utilisateur (pas soi-même)
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
$identifier = getenv('TEST_IDENTIFIER') ?: 'candidat1@email.com';
$password = getenv('TEST_PASSWORD') ?: 'Candidat123!';

function httpRequest(string $method, string $url, array $data = null, array $headers = []): array
{
    $ch = curl_init($url);
    $baseHeaders = ['Accept: application/json'];
    if ($data !== null) {
        $baseHeaders[] = 'Content-Type: application/json';
    }
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => array_merge($baseHeaders, $headers),
        CURLOPT_TIMEOUT => 25,
    ]);
    if ($data !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    }
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['code' => $httpCode, 'body' => json_decode($response, true) ?? $response];
}

echo "=== 1) Login ===\n";
$login = httpRequest('POST', "$baseUrl/auth/login-direct", [
    'identifier' => $identifier,
    'password' => $password,
]);
echo "HTTP {$login['code']}\n";
if ($login['code'] !== 200 || empty($login['body']['access_token'])) {
    echo json_encode($login['body'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
    exit(1);
}
$token = $login['body']['access_token'];
echo "Token OK\n\n";

echo "=== 2) Get two candidats ===\n";
$cands = httpRequest('GET', "$baseUrl/utilisateurs/candidats?per_page=5", null, [
    "Authorization: Bearer $token",
]);
echo "HTTP {$cands['code']}\n";
if ($cands['code'] !== 200 || empty($cands['body']['data']) || !is_array($cands['body']['data'])) {
    echo json_encode($cands['body'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
    exit(1);
}
$items = $cands['body']['data'];
$id1 = $items[0]['id'] ?? null;
$id2 = $items[1]['id'] ?? null;
echo "id1=$id1\nid2=$id2\n\n";
if (!$id1 || !$id2) {
    echo "Impossible de récupérer 2 utilisateurs.\n";
    exit(1);
}

echo "=== 3) Update user id1 (telephone) ===\n";
$newTel = 'TEST_' . substr(str_replace('-', '', $id1), 0, 10) . '_' . time();
$update = httpRequest('PUT', "$baseUrl/utilisateurs/$id1", [
    'telephone' => $newTel,
], [
    "Authorization: Bearer $token",
]);
echo "HTTP {$update['code']}\n";
echo json_encode($update['body'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n\n";

echo "=== 4) Delete user id2 (must not be self) ===\n";
$del = httpRequest('DELETE', "$baseUrl/utilisateurs/$id2", null, [
    "Authorization: Bearer $token",
]);
echo "HTTP {$del['code']}\n";
echo json_encode($del['body'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";

