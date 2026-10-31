<?php

$baseUrl = getenv('API_BASE_URL') ?: 'http://127.0.0.1:8000/api';
$url = $baseUrl . '/public/sms';

$payload = [
    'numero' => '24177724499',
    'message' => 'Test SMS public endpoint - ' . date('Y-m-d H:i:s'),
];

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: application/json'],
    CURLOPT_TIMEOUT => 25,
]);
$res = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "POST {$url}\n";
echo "HTTP {$code}\n";
echo $res . "\n";

