<?php

// Script de test : créer un dossier DUPLICATA avec data_categorie
// puis l'envoyer au CNEDDT via DossierService::sendManyToCneddt
// en réutilisant la méthode buildPayloadForTransfert du DossierController.

use App\Models\Candidat;
use App\Models\AutoEcole;
use App\Models\FormationAutoEcole;
use App\Models\TypeDemande;
use App\Models\Dossier;
use App\Http\Controllers\Api\DossierController;
use App\Http\Services\DossierService;
use Illuminate\Contracts\Console\Kernel;

require __DIR__ . '/vendor/autoload.php';

/** @var \Illuminate\Foundation\Application $app */
$app = require __DIR__ . '/bootstrap/app.php';

/** @var Kernel $kernel */
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

echo "=== Test transfert DUPLICATA avec data_categorie ===\n\n";

// 1. Récupérer un candidat, une auto-école et une formation existants
$candidat = Candidat::with('personne')->first();
$autoEcole = AutoEcole::first();
$formation = FormationAutoEcole::with('typePermis')->first();

if (!$candidat || !$autoEcole || !$formation) {
    echo "Candidat / AutoEcole / Formation manquant(s). Vérifiez vos seeders.\n";
    exit(1);
}

// 2. S'assurer qu'un TypeDemande DUPLICATA existe
$typeDemande = TypeDemande::firstOrCreate(['name' => 'DUPLICATA'], []);

echo "Candidat ID: {$candidat->id}\n";
echo "AutoEcole ID: {$autoEcole->id}\n";
echo "Formation ID: {$formation->id} (type_permis={$formation->typePermis?->code})\n";
echo "TypeDemande DUPLICATA ID: {$typeDemande->id}\n\n";

// 3. Créer un dossier de test avec data_categorie
$dossier = Dossier::create([
    'candidat_id' => $candidat->id,
    'auto_ecole_id' => $autoEcole->id,
    'formation_id' => $formation->id,
    'type_demande_id' => $typeDemande->id,
    'statut' => 'en_attente',
    'commentaires' => 'Test transfert DUPLICATA avec data_categorie',
    'numero_permis' => 'GA1234567890',
    'lieu_de_dobtention_du_permis' => 'Libreville',
    'date_de_dobtention_du_permis' => '2020-01-01',
    'date_expiration' => '2030-01-01',
    'data_categorie' => [
        [
            'classe' => 'D',
            'ville' => '45874',
            'codification_code' => '452211',
            'valable_du' => '2025-02-03',
            'jusqu_au' => '2025-02-03',
        ],
        [
            'classe' => 'C',
            'ville' => 'Libreville',
            'codification_code' => '12340',
            'valable_du' => '2025-02-03',
            'jusqu_au' => '2030-02-03',
        ],
    ],
]);

echo "Dossier créé. ID: {$dossier->id}\n\n";

// 4. Construire le payload via la méthode privée buildPayloadForTransfert du controller
/** @var DossierController $controller */
$controller = $app->make(DossierController::class);

$ref = new ReflectionClass($controller);
$method = $ref->getMethod('buildPayloadForTransfert');
$method->setAccessible(true);

$typeDemandeNames = [$typeDemande->id => $typeDemande->name];
$payload = $method->invoke($controller, $dossier->fresh(['candidat.personne', 'autoEcole.province', 'formation.typePermis']), $typeDemande->id, $typeDemandeNames);

if ($payload === null) {
    echo "Payload nul (données manquantes).\n";
    exit(1);
}

echo "Payload construit (aperçu):\n";
echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n\n";

// 5. Envoi au CNEDDT via DossierService
/** @var DossierService $dossierService */
$dossierService = $app->make(DossierService::class);

echo "Envoi au CNEDDT...\n";
$results = $dossierService->sendManyToCneddt([
    [
        'dossier_id' => $dossier->id,
        'payload' => $payload,
    ],
]);

echo "Résultat CNEDDT:\n";
echo json_encode($results, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
