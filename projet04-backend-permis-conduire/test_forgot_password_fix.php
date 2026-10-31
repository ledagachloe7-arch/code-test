<?php

require_once 'vendor/autoload.php';

// Configuration minimale pour les tests
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🔐 Test de la fonctionnalité mot de passe oublié\n";
echo "===============================================\n\n";

// Test avec un utilisateur existant
$testEmail = 'candidat1@email.com';

echo "📧 Email de test : {$testEmail}\n\n";

// Test 1 : Vérifier que l'utilisateur existe
echo "🧪 Test 1 : Vérification de l'existence de l'utilisateur\n";
echo "------------------------------------------------------\n";

$utilisateur = \App\Models\Utilisateur::where('email', $testEmail)->first();

if ($utilisateur) {
    echo "✅ Utilisateur trouvé :\n";
    echo "   - ID : {$utilisateur->id}\n";
    echo "   - Email : {$utilisateur->email}\n";
    echo "   - Rôle : {$utilisateur->role}\n";
    echo "   - Créé le : {$utilisateur->created_at}\n";
} else {
    echo "❌ Utilisateur non trouvé\n";
    exit;
}

echo "\n";

// Test 2 : Test de la validation ForgotPasswordRequest
echo "🧪 Test 2 : Test de la validation ForgotPasswordRequest\n";
echo "------------------------------------------------------\n";

try {
    $request = new \App\Http\Requests\ForgotPasswordRequest();
    $request->merge(['email' => $testEmail]);
    
    $validator = \Illuminate\Support\Facades\Validator::make(
        $request->all(),
        $request->rules(),
        $request->messages(),
        $request->attributes()
    );
    
    if ($validator->fails()) {
        echo "❌ Validation échouée :\n";
        foreach ($validator->errors()->all() as $error) {
            echo "   - {$error}\n";
        }
    } else {
        echo "✅ Validation réussie\n";
    }
    
} catch (Exception $e) {
    echo "❌ Erreur lors de la validation : " . $e->getMessage() . "\n";
}

echo "\n";

// Test 3 : Test de la validation ResetPasswordRequest
echo "🧪 Test 3 : Test de la validation ResetPasswordRequest\n";
echo "-----------------------------------------------------\n";

try {
    $request = new \App\Http\Requests\ResetPasswordRequest();
    $request->merge([
        'email' => $testEmail,
        'code' => '123456',
        'password' => 'NewPassword123!',
        'password_confirmation' => 'NewPassword123!'
    ]);
    
    $validator = \Illuminate\Support\Facades\Validator::make(
        $request->all(),
        $request->rules(),
        $request->messages(),
        $request->attributes()
    );
    
    if ($validator->fails()) {
        echo "❌ Validation échouée :\n";
        foreach ($validator->errors()->all() as $error) {
            echo "   - {$error}\n";
        }
    } else {
        echo "✅ Validation réussie\n";
    }
    
} catch (Exception $e) {
    echo "❌ Erreur lors de la validation : " . $e->getMessage() . "\n";
}

echo "\n";

// Test 4 : Test de l'endpoint HTTP
echo "🧪 Test 4 : Test de l'endpoint HTTP forgot-password\n";
echo "--------------------------------------------------\n";

try {
    $client = new GuzzleHttp\Client([
        'base_uri' => 'http://localhost:8000',
        'timeout' => 30,
        'verify' => false
    ]);

    $response = $client->post('/api/auth/forgot-password', [
        'headers' => [
            'Accept' => 'application/json',
            'Content-Type' => 'application/json'
        ],
        'json' => [
            'email' => $testEmail
        ]
    ]);

    $data = json_decode($response->getBody()->getContents(), true);
    
    echo "✅ Requête réussie (Status: {$response->getStatusCode()})\n";
    echo "📊 Réponse :\n";
    echo "   - Message : {$data['message']}\n";
    echo "   - Success : " . ($data['success'] ? 'true' : 'false') . "\n";
    
    if (isset($data['code'])) {
        echo "   - Code de réinitialisation : {$data['code']}\n";
    }

} catch (Exception $e) {
    echo "❌ Erreur lors de l'appel API : " . $e->getMessage() . "\n";
    
    if (method_exists($e, 'getResponse') && $e->getResponse()) {
        $responseBody = $e->getResponse()->getBody()->getContents();
        echo "📝 Réponse d'erreur : " . $responseBody . "\n";
    }
}

echo "\n🎯 Tests terminés !\n";
