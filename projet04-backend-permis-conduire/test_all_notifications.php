<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make('Illuminate\\Contracts\\Console\\Kernel');
$kernel->bootstrap();

// ⚠️⚠️⚠️ REMPLACEZ PAR VOTRE NUMÉRO ⚠️⚠️⚠️
$YOUR_PHONE_NUMBER = '24174721084';

echo "\n";
echo "╔════════════════════════════════════════╗\n";
echo "║  TEST COMPLET DES 8 NOTIFICATIONS SMS  ║\n";
echo "╚════════════════════════════════════════╝\n";
echo "\n";
echo "📱 Numéro de test : $YOUR_PHONE_NUMBER\n";
echo "⏱️  Délai entre chaque test : 3 secondes\n";
echo "\n";
echo "⚠️  IMPORTANT : Modifiez \$YOUR_PHONE_NUMBER dans ce fichier\n";
echo "    avec votre vrai numéro gabonais (format: 24177XXXXXX)\n";
echo "\n";
echo "Appuyez sur ENTRÉE pour commencer...\n";
$handle = fopen ("php://stdin","r");
$line = fgets($handle);

$tests = [
    1 => 'AccountCreated',
    2 => 'DocumentUploaded',
    3 => 'DocumentValidated',
    4 => 'DocumentRejected',
    5 => 'DossierCreated',
    6 => 'DossierValidated',
    7 => 'DossierRejected',
    8 => 'ExamenReussi',
];

$results = [];

foreach ($tests as $num => $name) {
    echo "\n┌─────────────────────────────────────┐\n";
    echo "│ TEST #{$num}: {$name}\n";
    echo "└─────────────────────────────────────┘\n";
    
    try {
        switch ($num) {
            case 1: // AccountCreated
                echo "  → Création d'un utilisateur de test...\n";
                $user = createTestUser($YOUR_PHONE_NUMBER);
                echo "  → Envoi de la notification...\n";
                $user->notify(new \App\Notifications\AccountCreatedNotification($user, 'Test123'));
                break;
                
            case 2: // DocumentUploaded
                echo "  → Création d'un utilisateur de test...\n";
                $user = createTestUser($YOUR_PHONE_NUMBER);
                echo "  → Création d'un document de test...\n";
                $doc = createTestDocument();
                echo "  → Envoi de la notification...\n";
                $user->notify(new \App\Notifications\DocumentUploadedNotification($doc, 'Jean Dupont'));
                break;
                
            case 3: // DocumentValidated
                echo "  → Création d'un utilisateur de test...\n";
                $user = createTestUser($YOUR_PHONE_NUMBER);
                echo "  → Création d'un document de test...\n";
                $doc = createTestDocument();
                echo "  → Envoi de la notification...\n";
                $user->notify(new \App\Notifications\DocumentValidatedNotification($doc, 'Jean Dupont'));
                break;
                
            case 4: // DocumentRejected
                echo "  → Création d'un utilisateur de test...\n";
                $user = createTestUser($YOUR_PHONE_NUMBER);
                echo "  → Création d'un document de test...\n";
                $doc = createTestDocument();
                echo "  → Envoi de la notification...\n";
                $user->notify(new \App\Notifications\DocumentRejectedNotification($doc, 'Jean Dupont', 'Photo floue'));
                break;
                
            case 5: // DossierCreated
                echo "  → Création d'un utilisateur de test...\n";
                $user = createTestUser($YOUR_PHONE_NUMBER);
                echo "  → Création d'un dossier de test...\n";
                $dossier = createTestDossier();
                echo "  → Envoi de la notification...\n";
                $user->notify(new \App\Notifications\DossierCreatedNotification($dossier, 'Jean Dupont'));
                break;
                
            case 6: // DossierValidated
                echo "  → Création d'un utilisateur de test...\n";
                $user = createTestUser($YOUR_PHONE_NUMBER);
                echo "  → Création d'un dossier de test...\n";
                $dossier = createTestDossier();
                echo "  → Envoi de la notification...\n";
                $user->notify(new \App\Notifications\DossierValidatedNotification($dossier, 'Jean Dupont'));
                break;
                
            case 7: // DossierRejected
                echo "  → Création d'un utilisateur de test...\n";
                $user = createTestUser($YOUR_PHONE_NUMBER);
                echo "  → Création d'un dossier de test...\n";
                $dossier = createTestDossier();
                echo "  → Envoi de la notification...\n";
                $user->notify(new \App\Notifications\DossierRejectedNotification($dossier, 'Jean Dupont', 'Dossier incomplet'));
                break;
                
            case 8: // ExamenReussi
                echo "  → Création d'un utilisateur de test...\n";
                $user = createTestUser($YOUR_PHONE_NUMBER);
                echo "  → Création d'un résultat de test...\n";
                $resultat = createTestResultat();
                echo "  → Envoi de la notification...\n";
                $user->notify(new \App\Notifications\ExamenReussiNotification($resultat, 'Jean Dupont'));
                break;
        }
        
        echo "  ✅ Notification envoyée avec succès\n";
        $results[$num] = 'SUCCESS';
        
    } catch (\Exception $e) {
        echo "  ❌ ERREUR : " . $e->getMessage() . "\n";
        echo "  📋 Détails : " . $e->getFile() . ' (ligne ' . $e->getLine() . ")\n";
        $results[$num] = 'FAILED';
    }
    
    if ($num < count($tests)) {
        echo "\n⏳ Attente de 3 secondes avant le prochain test...\n";
        sleep(3);
    }
}

// Résumé
echo "\n\n";
echo "╔════════════════════════════════════════╗\n";
echo "║         RÉSUMÉ DES TESTS               ║\n";
echo "╚════════════════════════════════════════╝\n\n";

$successCount = 0;
foreach ($results as $num => $result) {
    $icon = $result === 'SUCCESS' ? '✅' : '❌';
    echo "$icon Test #{$num}: {$tests[$num]} - $result\n";
    if ($result === 'SUCCESS') $successCount++;
}

echo "\n";
echo "Réussis : $successCount / " . count($tests) . "\n";
echo "\n";
echo "📱 Vérifiez votre téléphone : vous devriez avoir reçu {$successCount} SMS\n";
echo "📋 Vérifiez les logs : storage/logs/laravel.log\n";
echo "\n";

// Fonctions helper
function createTestUser($phone) {
    // Chercher d'abord si un utilisateur avec ce téléphone existe déjà
    $existingUser = \App\Models\Utilisateur::where('telephone', $phone)->first();
    
    if ($existingUser) {
        echo "  ℹ️  Utilisateur existant trouvé (ID: {$existingUser->id})\n";
        return $existingUser;
    }
    
    // Sinon, créer un nouvel utilisateur
    $user = \App\Models\Utilisateur::create([
        'email' => 'test.' . time() . rand(1000, 9999) . '@dgtt.ga',
        'telephone' => $phone,
        'password' => bcrypt('TestPassword123!'),
        'role' => 'candidat',
        'est_verifie' => true,
    ]);

    // Créer la personne associée avec l'utilisateur_id
    $personne = \App\Models\Personne::create([
        'nom' => 'Dupont',
        'prenom' => 'Jean',
        'contact' => $phone,
        'utilisateur_id' => $user->id,
    ]);
    
    echo "  ✅ Nouvel utilisateur créé (ID: {$user->id})\n";
    
    return $user;
}

function createTestDocument() {
    // Créer un objet Document minimal pour le test (ne sera pas sauvegardé en base)
    $doc = new \App\Models\Document();
    $doc->nom_fichier = 'test_document_' . time() . '.pdf';
    $doc->id = \Illuminate\Support\Str::uuid();
    
    // Mock des relations pour éviter les erreurs
    $doc->setRelation('typeDocument', (object)['libelle' => 'Carte d\'identité']);
    $doc->setRelation('created_at', now());
    
    return $doc;
}

function createTestDossier() {
    // Créer un objet Dossier minimal pour le test
    $dossier = new \App\Models\Dossier();
    $dossier->id = \Illuminate\Support\Str::uuid();
    $dossier->statut = 'en_attente';
    $dossier->created_at = now();
    
    // Mock des relations
    $typePermis = (object)['libelle' => 'Permis B'];
    $formation = (object)['typePermis' => $typePermis];
    $autoEcole = (object)['nom_auto_ecole' => 'Auto-École Test'];
    
    $dossier->setRelation('formation', $formation);
    $dossier->setRelation('autoEcole', $autoEcole);
    
    return $dossier;
}

function createTestResultat() {
    // Créer un objet Resultat minimal pour le test
    $resultat = new \App\Models\Resultat();
    $resultat->id = \Illuminate\Support\Str::uuid();
    $resultat->typeExamen = 'Code de la route';
    $resultat->statut = 'reussi';
    $resultat->date = now();
    $resultat->dossier_id = \Illuminate\Support\Str::uuid();
    $resultat->commentaire = 'Très bien';
    
    return $resultat;
}
