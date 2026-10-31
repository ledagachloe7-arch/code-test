<?php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== UTILISATEURS DANS LA BASE ===\n";
$users = \App\Models\Utilisateur::with('personne')->get();

foreach ($users as $user) {
    echo "Email: " . $user->email . "\n";
    echo "Role: " . $user->role . "\n";
    if ($user->personne) {
        echo "Nom: " . $user->personne->nom . " " . $user->personne->prenom . "\n";
        echo "Contact: " . $user->personne->contact . "\n";
    }
    echo "---\n";
}

echo "\n=== TEST DE CONNEXION ===\n";
$testUser = \App\Models\Utilisateur::where('email', 'candidat1@email.com')->first();
if ($testUser) {
    echo "Utilisateur trouvé: " . $testUser->email . "\n";
    echo "Mot de passe hashé: " . $testUser->password . "\n";
    
    // Test avec différents mots de passe
    $passwords = ['password123', 'password', '123456', 'candidat1', 'Candidat123!'];
    foreach ($passwords as $pwd) {
        $check = \Illuminate\Support\Facades\Hash::check($pwd, $testUser->password);
        echo "Mot de passe '$pwd': " . ($check ? 'CORRECT' : 'INCORRECT') . "\n";
    }
    
    // Test de création d'un nouveau hash
    echo "\n=== TEST DE HASHAGE ===\n";
    $newHash = \Illuminate\Support\Facades\Hash::make('Candidat123!');
    echo "Nouveau hash pour 'Candidat123!': " . $newHash . "\n";
    $checkNew = \Illuminate\Support\Facades\Hash::check('Candidat123!', $newHash);
    echo "Vérification nouveau hash: " . ($checkNew ? 'CORRECT' : 'INCORRECT') . "\n";
    
    // Mettre à jour le mot de passe
    echo "\n=== MISE À JOUR DU MOT DE PASSE ===\n";
    $testUser->password = \Illuminate\Support\Facades\Hash::make('Candidat123!');
    $testUser->save();
    echo "Mot de passe mis à jour pour candidat1@email.com\n";
    
    // Vérifier que ça fonctionne maintenant
    $testUser->refresh();
    $finalCheck = \Illuminate\Support\Facades\Hash::check('Candidat123!', $testUser->password);
    echo "Vérification finale: " . ($finalCheck ? 'CORRECT' : 'INCORRECT') . "\n";
} else {
    echo "Utilisateur candidat1@email.com non trouvé\n";
}
